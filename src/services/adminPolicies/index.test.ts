import { createTotpCode } from '@root/tests/auth-fixtures';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMock = vi.hoisted(() => ({
  GET: vi.fn(),
  PATCH: vi.fn(),
  POST: vi.fn(),
}));
vi.mock('@/services/generated', () => ({ api: apiMock }));

import {
  createPolicyDraft,
  listPolicyCatalog,
  listPolicyVersions,
  previewPolicyDraft,
  publishPolicyDraft,
  rollbackPolicyVersion,
  updatePolicyDraft,
  validatePolicyDraft,
} from './index';

const draftDto = {
  archivedAt: null,
  baseVersion: 3,
  content: { login_backoff_seconds: 30 },
  contentHash: 'hash-1',
  id: 'draft-1',
  lastMeaningfulActivityAt: '2026-08-13T00:00:00Z',
  namespace: 'identity',
  ownerId: 'account-1',
  revision: 2,
  schemaRevision: 1,
  scope: 'PLATFORM',
  stale: false,
  status: 'DRAFT',
  validationEvidence: null,
};
const result = <T>(data: T, etag?: string) => ({
  data,
  response: new Response(null, {
    headers: etag ? { ETag: etag } : undefined,
    status: 200,
  }),
});

beforeEach(() => {
  Object.values(apiMock).forEach((mock) => {
    mock.mockReset();
  });
});

describe('admin policies V0.2 generated client seam', () => {
  it('把 catalog active snapshot 与 key schema 组合为现有编辑模型', async () => {
    apiMock.GET.mockResolvedValue(
      result({
        active: {
          namespace: 'identity',
          schemaRevision: 1,
          scope: 'PLATFORM',
          snapshotHash: 'hash-active',
          values: { login_backoff_seconds: 45 },
          version: 3,
        },
        items: [
          {
            defaultValue: 30,
            effectSemantics: '下次登录尝试生效',
            enumValues: null,
            key: 'login_backoff_seconds',
            maxValue: 300,
            minValue: 1,
            namespace: 'identity',
            schemaRevision: 1,
            unit: 'seconds',
            valueType: 'INTEGER',
          },
        ],
      }),
    );

    await expect(listPolicyCatalog()).resolves.toMatchObject({
      activeVersion: 3,
      items: [
        {
          activeValue: 45,
          activeVersion: 3,
          key: 'login_backoff_seconds',
          label: 'login_backoff_seconds',
          min: 1,
          max: 300,
        },
      ],
      namespace: 'identity',
      scope: 'PLATFORM',
    });
  });

  it('为 V0.2 不再下发的展示元数据保留本地适配', async () => {
    apiMock.GET.mockResolvedValue(
      result({
        active: {
          namespace: 'identity',
          schemaRevision: 1,
          scope: 'PLATFORM',
          snapshotHash: 'hash-active',
          values: { 'identity.password_expiry': 'NEVER' },
          version: 1,
        },
        items: [
          {
            defaultValue: 'NEVER',
            effectSemantics: '发布后用于后续认证时的密码有效性判断。',
            enumValues: ['NEVER', '90_DAYS'],
            key: 'identity.password_expiry',
            maxValue: null,
            minValue: null,
            namespace: 'identity',
            schemaRevision: 1,
            unit: null,
            valueType: 'ENUM',
          },
        ],
      }),
    );

    await expect(listPolicyCatalog()).resolves.toMatchObject({
      items: [
        {
          description: '正式密码的过期周期',
          enumOptions: [
            { label: '永不过期', value: 'NEVER' },
            { label: '90 天', value: '90_DAYS' },
          ],
          label: '密码过期周期',
        },
      ],
    });
  });

  it('enum label 未知时回退原值，缺少 enum/min/max 时不伪造约束', async () => {
    apiMock.GET.mockResolvedValue(
      result({
        active: {
          namespace: 'identity',
          schemaRevision: 1,
          scope: 'PLATFORM',
          snapshotHash: 'hash-active',
          values: { 'identity.session_limit': 5 },
          version: 4,
        },
        items: [
          {
            defaultValue: 5,
            effectSemantics: '下次登录生效',
            enumValues: [5],
            key: 'identity.session_limit',
            maxValue: null,
            minValue: null,
            namespace: 'identity',
            schemaRevision: 1,
            unit: null,
            valueType: 'INTEGER',
          },
        ],
      }),
    );

    const catalog = await listPolicyCatalog();

    expect(catalog.items[0]).toMatchObject({
      description: '同一账号同时有效的 Session 数量上限',
      enumOptions: [{ label: '5', value: '5' }],
      label: 'Session 上限',
    });
    expect(catalog.items[0]).not.toHaveProperty('min');
    expect(catalog.items[0]).not.toHaveProperty('max');
  });

  it('draft create/update 使用 values，并优先采用响应 ETag', async () => {
    apiMock.POST.mockResolvedValue(result(draftDto, '"v2"'));
    apiMock.PATCH.mockResolvedValue(
      result({ ...draftDto, revision: 3 }, '"v3"'),
    );

    await expect(
      createPolicyDraft('identity', { values: {} }),
    ).resolves.toMatchObject({ etag: '"v2"', revision: 2 });
    expect(apiMock.POST).toHaveBeenCalledWith(
      '/api/v1/admin/policies/{namespace}/drafts',
      expect.objectContaining({ body: { values: {} } }),
    );

    await expect(
      updatePolicyDraft(
        'identity',
        'draft-1',
        { content: { login_backoff_seconds: 60 } },
        '"v2"',
      ),
    ).resolves.toMatchObject({ etag: '"v3"', revision: 3 });
    expect(apiMock.PATCH).toHaveBeenCalledWith(
      '/api/v1/admin/policies/{namespace}/drafts/{draft_id}',
      expect.objectContaining({
        body: { values: { login_backoff_seconds: 60 } },
      }),
    );
  });

  it('draft 与 validate 缺失响应 ETag 时按 revision 生成强 ETag', async () => {
    apiMock.POST.mockResolvedValueOnce(result(draftDto)).mockResolvedValueOnce(
      result({
        contentHash: 'hash-1',
        draftId: 'draft-1',
        issues: [{ code: 'INVALID', message: '值无效', path: '/value' }],
        revision: 7,
        valid: false,
      }),
    );

    await expect(
      createPolicyDraft('identity', { values: {} }),
    ).resolves.toMatchObject({ etag: '"v2"' });
    await expect(
      validatePolicyDraft('identity', 'draft-1', '"v6"'),
    ).resolves.toEqual({
      etag: '"v7"',
      issues: [{ code: 'INVALID', message: '值无效', path: '/value' }],
      revision: 7,
      valid: false,
    });
  });

  it('preview 标记 changed true/false，并为未知 policy key 回退原 key', async () => {
    apiMock.GET.mockResolvedValue(
      result({
        baseVersion: 3,
        contentHash: 'hash-preview',
        draftId: 'draft-1',
        items: [
          {
            after: 30,
            before: 30,
            effectSemantics: '保持不变',
            key: 'identity.session_idle_minutes',
          },
          {
            after: 'new',
            before: 'old',
            effectSemantics: '立即生效',
            key: 'custom.policy',
          },
        ],
        revision: 4,
      }),
    );

    await expect(
      previewPolicyDraft('identity', 'draft-1', '"v3"'),
    ).resolves.toMatchObject({
      changes: [
        { changed: false, label: 'Session 空闲期限' },
        { changed: true, label: 'custom.policy' },
      ],
      etag: '"v4"',
    });
  });

  it('publish 返回正式版本，并把原因、TOTP 与 If-Match 原样发送', async () => {
    const input = { reason: '发布认证策略', totpCode: createTotpCode() };
    apiMock.POST.mockResolvedValue(
      result({
        namespace: 'identity',
        publishedAt: '2026-08-13T00:00:00Z',
        reason: input.reason,
        scope: 'PLATFORM',
        version: 5,
      }),
    );

    await expect(
      publishPolicyDraft('identity', 'draft-1', input, '"v4"'),
    ).resolves.toEqual({
      namespace: 'identity',
      publishedAt: '2026-08-13T00:00:00Z',
      reason: input.reason,
      scope: 'PLATFORM',
      version: 5,
    });
    expect(apiMock.POST).toHaveBeenCalledWith(
      '/api/v1/admin/policies/{namespace}/drafts/{draft_id}/publish',
      {
        body: input,
        params: {
          header: {
            'Idempotency-Key': expect.stringMatching(/^[0-9a-f-]{36}$/),
            'If-Match': '"v4"',
          },
          path: { draft_id: 'draft-1', namespace: 'identity' },
        },
      },
    );
  });

  it('版本列表只把第一项标为 current', async () => {
    const version = (number: number) => ({
      namespace: 'identity',
      publishedAt: `2026-08-${number.toString().padStart(2, '0')}T00:00:00Z`,
      publishedBy: `account-${number}`,
      reason: `version-${number}`,
      scope: 'PLATFORM',
      snapshotHash: `hash-${number}`,
      version: number,
    });
    apiMock.GET.mockResolvedValue(result({ items: [version(4), version(3)] }));

    await expect(listPolicyVersions('identity')).resolves.toMatchObject({
      items: [
        { current: true, version: 4 },
        { current: false, version: 3 },
      ],
    });
    expect(apiMock.GET).toHaveBeenCalledWith(
      '/api/v1/admin/policies/{namespace}/versions',
      { params: { path: { namespace: 'identity' } } },
    );
  });

  it('validate/preview/rollback 全部携带 If-Match，rollback 发送 reason 与 TOTP', async () => {
    const totpCode = createTotpCode();
    apiMock.POST.mockResolvedValueOnce(
      result({
        contentHash: 'hash-1',
        draftId: 'draft-1',
        issues: [],
        revision: 2,
        valid: true,
      }),
    ).mockResolvedValueOnce(result(draftDto, '"v2"'));
    apiMock.GET.mockResolvedValue(
      result({
        baseVersion: 3,
        contentHash: 'hash-1',
        draftId: 'draft-1',
        items: [],
        revision: 2,
      }),
    );

    await validatePolicyDraft('identity', 'draft-1', '"v2"');
    await previewPolicyDraft('identity', 'draft-1', '"v2"');
    await rollbackPolicyVersion(
      'identity',
      { reason: '回滚故障配置', toVersion: 2, totpCode },
      3,
    );

    expect(apiMock.POST).toHaveBeenNthCalledWith(
      1,
      '/api/v1/admin/policies/{namespace}/drafts/{draft_id}/validate',
      expect.objectContaining({
        body: {},
        params: expect.objectContaining({
          header: expect.objectContaining({ 'If-Match': '"v2"' }),
        }),
      }),
    );
    expect(apiMock.GET).toHaveBeenCalledWith(
      '/api/v1/admin/policies/{namespace}/drafts/{draft_id}/preview',
      expect.objectContaining({
        params: expect.objectContaining({ header: { 'If-Match': '"v2"' } }),
      }),
    );
    expect(apiMock.POST).toHaveBeenNthCalledWith(
      2,
      '/api/v1/admin/policies/{namespace}/rollback',
      expect.objectContaining({
        body: {
          reason: '回滚故障配置',
          scope: 'PLATFORM',
          toVersion: 2,
          totpCode,
        },
        params: expect.objectContaining({
          header: expect.objectContaining({ 'If-Match': '"v3"' }),
        }),
      }),
    );
  });
});
