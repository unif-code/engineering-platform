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
  previewPolicyDraft,
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

  it('validate/preview/rollback 全部携带 If-Match，rollback 发送 reason 与 TOTP', async () => {
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
      { reason: '回滚故障配置', toVersion: 2, totpCode: '123456' },
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
          totpCode: '123456',
        },
        params: expect.objectContaining({
          header: expect.objectContaining({ 'If-Match': '"v3"' }),
        }),
      }),
    );
  });
});
