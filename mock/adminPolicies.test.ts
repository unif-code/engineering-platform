import { beforeEach, describe, expect, it } from 'vitest';
import type { components } from '../src/services/generated/schema';
import { mutationHeaders } from '../src/services/transport';
import {
  createMockRequester,
  type MockRoutes,
} from '../tests/mockRequestHarness';
import { createAdminPoliciesMock } from './adminPolicies';

type Draft = components['schemas']['DraftResponseDto'];
type Catalog = components['schemas']['PolicyCatalogResponseDto'];
type Validation = components['schemas']['DraftValidationResponseDto'];
type PublishedVersion = components['schemas']['PublishedVersionDto'];
type Versions = components['schemas']['PolicyVersionsResponseDto'];

let routes: MockRoutes;
const request = createMockRequester(() => routes);
const draftsPath = '/api/v1/admin/policies/identity/drafts';

async function createDraft(values: Record<string, unknown> = {}) {
  return (await request(draftsPath, {
    data: { values },
    headers: mutationHeaders(),
    method: 'POST',
  })) as Draft;
}

async function updateDraft(
  draft: Draft,
  values: Record<string, unknown>,
  etag = `"v${draft.revision}"`,
) {
  return (await request(`${draftsPath}/${draft.id}`, {
    data: { values },
    headers: mutationHeaders({ etag }),
    method: 'PATCH',
  })) as Draft;
}

async function publishDraft(
  draft: Draft,
  totpCode = '123456',
): Promise<PublishedVersion> {
  return (await request(`${draftsPath}/${draft.id}/publish`, {
    data: { reason: '更新身份安全策略', totpCode },
    headers: mutationHeaders({ etag: `"v${draft.revision}"` }),
    method: 'POST',
  })) as PublishedVersion;
}

beforeEach(() => {
  routes = createAdminPoliciesMock();
});

describe('adminPolicies mock contract', () => {
  it('返回 V0.2 catalog active snapshot、key metadata 与版本历史', async () => {
    const catalog = (await request('/api/v1/admin/policies')) as Catalog;
    const versions = (await request(
      '/api/v1/admin/policies/identity/versions',
    )) as Versions;

    expect(catalog.active).toMatchObject({
      namespace: 'identity',
      scope: 'PLATFORM',
      version: 1,
    });
    expect(catalog.items.map(({ key }) => key)).toEqual([
      'identity.temp_password_ttl_hours',
      'identity.password_expiry',
      'identity.session_limit',
      'identity.session_idle_minutes',
      'identity.login_backoff_profile',
      'identity.totp_attempt_limit',
      'identity.draft_auto_archive_days',
    ]);
    expect(catalog.items).toContainEqual(
      expect.objectContaining({
        defaultValue: 60,
        key: 'identity.session_idle_minutes',
        maxValue: 240,
        minValue: 15,
        valueType: 'INTEGER',
      }),
    );
    expect(versions).toEqual({
      items: [expect.objectContaining({ version: 1 })],
      nextCursor: null,
    });
  });

  it('PATCH 要求匹配 Draft ETag，成功后 revision 前进', async () => {
    const draft = await createDraft();

    await expect(
      updateDraft(draft, draft.content, '"stale-etag"'),
    ).rejects.toMatchObject({
      response: {
        data: expect.objectContaining({
          detail: '已被并发修改，刷新后重试',
          requestId: expect.any(String),
        }),
        status: 409,
      },
    });

    const updated = await updateDraft(draft, {
      ...draft.content,
      'identity.session_idle_minutes': 30,
    });
    expect(updated).toMatchObject({
      content: { 'identity.session_idle_minutes': 30 },
      revision: 2,
    });
  });

  it('Validate 使用 If-Match 并返回 revision 与结构化 issue', async () => {
    const draft = await createDraft();
    const updated = await updateDraft(draft, {
      ...draft.content,
      'identity.session_idle_minutes': 10,
    });

    const result = (await request(`${draftsPath}/${updated.id}/validate`, {
      data: {},
      headers: mutationHeaders({ etag: '"v2"' }),
      method: 'POST',
    })) as Validation;

    expect(result).toMatchObject({
      issues: [
        expect.objectContaining({
          key: 'identity.session_idle_minutes',
          message: expect.stringMatching(/15.*240/),
        }),
      ],
      revision: 3,
      valid: false,
    });
  });

  it('Publish 错误 TOTP 返回 401，Base 落后返回 SOURCE_STALE 409', async () => {
    const first = await createDraft();
    const second = await createDraft();

    await expect(publishDraft(first, '000000')).rejects.toMatchObject({
      response: {
        data: expect.objectContaining({ detail: 'TOTP 验证码错误' }),
        status: 401,
      },
    });

    await expect(publishDraft(first)).resolves.toMatchObject({ version: 2 });
    await expect(publishDraft(second)).rejects.toMatchObject({
      response: {
        data: expect.objectContaining({ title: 'SOURCE_STALE' }),
        status: 409,
      },
    });
  });

  it('Rollback 使用 active version If-Match 创建 Draft，不切换 Active', async () => {
    const draft = await createDraft();
    const updated = await updateDraft(draft, {
      ...draft.content,
      'identity.session_idle_minutes': 30,
    });
    await publishDraft(updated);

    const rollbackDraft = (await request(
      '/api/v1/admin/policies/identity/rollback',
      {
        data: {
          reason: '恢复默认策略',
          toVersion: 1,
          totpCode: '123456',
        },
        headers: mutationHeaders({ etag: '"v2"' }),
        method: 'POST',
      },
    )) as Draft;
    const catalog = (await request('/api/v1/admin/policies')) as Catalog;

    expect(rollbackDraft).toMatchObject({
      baseVersion: 2,
      content: { 'identity.session_idle_minutes': 60 },
      status: 'DRAFT',
    });
    expect(catalog.active).toMatchObject({
      values: { 'identity.session_idle_minutes': 30 },
      version: 2,
    });
  });
});
