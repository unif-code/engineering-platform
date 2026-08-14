import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMock = vi.hoisted(() => ({
  GET: vi.fn(),
  PATCH: vi.fn(),
  POST: vi.fn(),
}));

vi.mock('@/services/generated', () => ({ api: apiMock }));

import * as administration from './index';

type PublicService = (...args: never[]) => Promise<unknown>;

const draftDto = {
  archivedAt: null,
  baseVersion: 3,
  content: { 'identity.session_idle_minutes': 30 },
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

function publicService(name: string): PublicService {
  const service = (administration as Record<string, unknown>)[name];
  expect(service, `${name} 应由 administration 公开入口导出`).toBeTypeOf(
    'function',
  );
  return service as PublicService;
}

beforeEach(() => {
  Object.values(apiMock).forEach((mock) => {
    mock.mockReset();
  });
});

describe('administration Policy V0.2 generated client seam', () => {
  it('catalog 与版本历史使用 generated client 模板路径', async () => {
    apiMock.GET.mockResolvedValueOnce(
      result({
        active: {
          namespace: 'identity',
          schemaRevision: 1,
          scope: 'PLATFORM',
          snapshotHash: 'active-hash',
          values: { 'identity.session_idle_minutes': 30 },
          version: 3,
        },
        items: [
          {
            defaultValue: 30,
            effectSemantics: '下次登录生效',
            enumValues: null,
            key: 'identity.session_idle_minutes',
            maxValue: 120,
            minValue: 5,
            namespace: 'identity',
            schemaRevision: 1,
            unit: 'minutes',
            valueType: 'INTEGER',
          },
        ],
      }),
    ).mockResolvedValueOnce(
      result({
        items: [
          {
            namespace: 'identity',
            publishedAt: '2026-08-13T00:00:00Z',
            publishedBy: 'account-1',
            reason: '收紧 Session',
            scope: 'PLATFORM',
            snapshotHash: 'active-hash',
            version: 3,
          },
        ],
      }),
    );

    await expect(publicService('listPolicyCatalog')()).resolves.toMatchObject({
      activeVersion: 3,
      namespace: 'identity',
    });
    await expect(
      publicService('listPolicyVersions')('identity' as never),
    ).resolves.toMatchObject({ items: [{ current: true, version: 3 }] });

    expect(apiMock.GET).toHaveBeenNthCalledWith(1, '/api/v1/admin/policies');
    expect(apiMock.GET).toHaveBeenNthCalledWith(
      2,
      '/api/v1/admin/policies/{namespace}/versions',
      { params: { path: { namespace: 'identity' } } },
    );
  });

  it('创建与更新 Draft 映射 V0.2 body、幂等键和 If-Match', async () => {
    apiMock.POST.mockResolvedValue(result(draftDto, '"v2"'));
    apiMock.PATCH.mockResolvedValue(
      result({ ...draftDto, revision: 3 }, '"v3"'),
    );

    await publicService('createPolicyDraft')(
      'identity' as never,
      { values: {} } as never,
    );
    await publicService('updatePolicyDraft')(
      'identity' as never,
      'draft/1' as never,
      { content: { 'identity.session_idle_minutes': 45 } } as never,
      '"v2"' as never,
    );

    expect(apiMock.POST).toHaveBeenCalledWith(
      '/api/v1/admin/policies/{namespace}/drafts',
      {
        body: { values: {} },
        params: {
          header: {
            'Idempotency-Key': expect.stringMatching(/^[0-9a-f-]{36}$/),
          },
          path: { namespace: 'identity' },
        },
      },
    );
    expect(apiMock.PATCH).toHaveBeenCalledWith(
      '/api/v1/admin/policies/{namespace}/drafts/{draft_id}',
      {
        body: { values: { 'identity.session_idle_minutes': 45 } },
        params: {
          header: {
            'Idempotency-Key': expect.stringMatching(/^[0-9a-f-]{36}$/),
            'If-Match': '"v2"',
          },
          path: { draft_id: 'draft/1', namespace: 'identity' },
        },
      },
    );
  });

  it('Validate、Preview 使用 Draft 模板路径并携带 If-Match', async () => {
    apiMock.POST.mockResolvedValue(
      result({
        contentHash: 'hash-1',
        draftId: 'draft-1',
        issues: [],
        revision: 3,
        valid: true,
      }),
    );
    apiMock.GET.mockResolvedValue(
      result({
        baseVersion: 3,
        contentHash: 'hash-1',
        draftId: 'draft-1',
        items: [],
        revision: 3,
      }),
    );

    await publicService('validatePolicyDraft')(
      'identity' as never,
      'draft-1' as never,
      '"v2"' as never,
    );
    await publicService('previewPolicyDraft')(
      'identity' as never,
      'draft-1' as never,
      '"v3"' as never,
    );

    expect(apiMock.POST).toHaveBeenCalledWith(
      '/api/v1/admin/policies/{namespace}/drafts/{draft_id}/validate',
      {
        body: {},
        params: {
          header: {
            'Idempotency-Key': expect.stringMatching(/^[0-9a-f-]{36}$/),
            'If-Match': '"v2"',
          },
          path: { draft_id: 'draft-1', namespace: 'identity' },
        },
      },
    );
    expect(apiMock.GET).toHaveBeenCalledWith(
      '/api/v1/admin/policies/{namespace}/drafts/{draft_id}/preview',
      {
        params: {
          header: { 'If-Match': '"v3"' },
          path: { draft_id: 'draft-1', namespace: 'identity' },
        },
      },
    );
  });

  it('Publish 透传原因、TOTP、If-Match 与幂等键', async () => {
    const input = { reason: '收紧 Session 空闲期限', totpCode: '123456' };
    apiMock.POST.mockResolvedValue(
      result({
        namespace: 'identity',
        publishedAt: '2026-08-13T00:00:00Z',
        publishedBy: 'account-1',
        reason: input.reason,
        scope: 'PLATFORM',
        snapshotHash: 'published-hash',
        version: 4,
      }),
    );

    await publicService('publishPolicyDraft')(
      'identity' as never,
      'draft-1' as never,
      input as never,
      '"v3"' as never,
    );

    expect(apiMock.POST).toHaveBeenCalledWith(
      '/api/v1/admin/policies/{namespace}/drafts/{draft_id}/publish',
      {
        body: input,
        params: {
          header: {
            'Idempotency-Key': expect.stringMatching(/^[0-9a-f-]{36}$/),
            'If-Match': '"v3"',
          },
          path: { draft_id: 'draft-1', namespace: 'identity' },
        },
      },
    );
  });

  it('Rollback 从历史版本创建新 Draft 并携带 active version', async () => {
    const input = {
      reason: '回滚故障配置',
      toVersion: 2,
      totpCode: '123456',
    };
    apiMock.POST.mockResolvedValue(result(draftDto, '"v2"'));

    await publicService('rollbackPolicyVersion')(
      'identity' as never,
      input as never,
      4 as never,
    );

    expect(apiMock.POST).toHaveBeenCalledWith(
      '/api/v1/admin/policies/{namespace}/rollback',
      {
        body: { ...input, scope: 'PLATFORM' },
        params: {
          header: {
            'Idempotency-Key': expect.stringMatching(/^[0-9a-f-]{36}$/),
            'If-Match': '"v4"',
          },
          path: { namespace: 'identity' },
        },
      },
    );
  });
});
