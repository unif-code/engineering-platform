import { beforeEach, describe, expect, it } from 'vitest';
import type {
  PolicyCatalogResponse,
  PolicyDraft,
  PolicyValidationResult,
  PolicyVersionsResponse,
  PublishedPolicyVersion,
} from '../src/services/adminPolicies';
import { mutationHeaders } from '../src/services/transport';
import {
  createMockRequester,
  type MockRoutes,
} from '../tests/mockRequestHarness';
import { createAdminPoliciesMock } from './adminPolicies';

let routes: MockRoutes;
const request = createMockRequester(() => routes);

const draftsPath = '/api/v1/admin/policies/identity/drafts';

async function createDraft(): Promise<PolicyDraft> {
  return (await request(draftsPath, {
    data: { scope: 'PLATFORM' },
    headers: mutationHeaders(),
    method: 'POST',
  })) as PolicyDraft;
}

async function updateDraft(
  draft: PolicyDraft,
  content: Record<string, number | string>,
  etag = draft.etag,
): Promise<PolicyDraft> {
  return (await request(`${draftsPath}/${draft.id}`, {
    data: { content },
    headers: mutationHeaders({ etag }),
    method: 'PATCH',
  })) as PolicyDraft;
}

async function publishDraft(
  draft: PolicyDraft,
  totpCode = '123456',
): Promise<PublishedPolicyVersion> {
  return (await request(`${draftsPath}/${draft.id}/publish`, {
    data: { reason: '更新身份安全策略', totpCode },
    headers: mutationHeaders(),
    method: 'POST',
  })) as PublishedPolicyVersion;
}

beforeEach(() => {
  routes = createAdminPoliciesMock();
});

describe('adminPolicies mock contract', () => {
  it('返回 identity catalog 当前值、版本与版本历史', async () => {
    const catalog = (await request(
      '/api/v1/admin/policies',
    )) as PolicyCatalogResponse;
    const versions = (await request(
      '/api/v1/admin/policies/identity/versions',
    )) as PolicyVersionsResponse;

    expect(catalog).toMatchObject({
      activeVersion: 1,
      namespace: 'identity',
      scope: 'PLATFORM',
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
        activeValue: 60,
        key: 'identity.session_idle_minutes',
        max: 240,
        min: 15,
        valueType: 'INTEGER',
      }),
    );
    expect(versions.items).toEqual([
      expect.objectContaining({ current: true, version: 1 }),
    ]);
  });

  it('PATCH 要求匹配 Draft ETag，成功后 revision 与 etag 前进', async () => {
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
    expect(updated.etag).not.toBe(draft.etag);
  });

  it('Validate 将越界数字返回为结构化 issue', async () => {
    const draft = await createDraft();
    const updated = await updateDraft(draft, {
      ...draft.content,
      'identity.session_idle_minutes': 10,
    });

    const result = (await request(`${draftsPath}/${updated.id}/validate`, {
      headers: mutationHeaders(),
      method: 'POST',
    })) as PolicyValidationResult;

    expect(result).toEqual({
      issues: [
        expect.objectContaining({
          key: 'identity.session_idle_minutes',
          message: expect.stringMatching(/15.*240/),
        }),
      ],
      valid: false,
    });
  });

  it('Publish 错误 TOTP 返回 401，Base 落后返回 SOURCE_STALE 409', async () => {
    const first = await createDraft();
    const second = await createDraft();

    await expect(publishDraft(first, '000000')).rejects.toMatchObject({
      response: {
        data: expect.objectContaining({
          detail: 'TOTP 验证码错误',
          requestId: expect.any(String),
        }),
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

  it('Rollback 从历史 Snapshot 创建新 Draft，不立即切换 Active 版本', async () => {
    const draft = await createDraft();
    const updated = await updateDraft(draft, {
      ...draft.content,
      'identity.session_idle_minutes': 30,
    });
    await publishDraft(updated);

    const rollbackDraft = (await request(
      '/api/v1/admin/policies/identity/rollback',
      {
        data: { toVersion: 1 },
        headers: mutationHeaders(),
        method: 'POST',
      },
    )) as PolicyDraft;
    const catalog = (await request(
      '/api/v1/admin/policies',
    )) as PolicyCatalogResponse;

    expect(rollbackDraft).toMatchObject({
      baseVersion: 2,
      content: { 'identity.session_idle_minutes': 60 },
      status: 'DRAFT',
    });
    expect(catalog).toMatchObject({ activeVersion: 2 });
    expect(
      catalog.items.find(({ key }) => key === 'identity.session_idle_minutes')
        ?.activeValue,
    ).toBe(30);
  });
});
