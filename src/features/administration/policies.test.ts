import { beforeEach, describe, expect, it, vi } from 'vitest';

const requestMock = vi.hoisted(() => vi.fn());

vi.mock('@umijs/max', () => ({ request: requestMock }));

import * as administration from './index';

type PublicService = (...args: never[]) => Promise<unknown>;

function publicService(name: string): PublicService {
  const service = (administration as Record<string, unknown>)[name];
  expect(service, `${name} 应由 administration 公开入口导出`).toBeTypeOf(
    'function',
  );
  return service as PublicService;
}

beforeEach(() => {
  requestMock.mockReset();
  requestMock.mockResolvedValue({});
});

describe('administration Policy mock-only domain seam', () => {
  it('读取 catalog 与版本历史使用冻结的 Policy 路径', async () => {
    await publicService('listPolicyCatalog')();
    await publicService('listPolicyVersions')('identity' as never);

    expect(requestMock).toHaveBeenNthCalledWith(1, '/api/v1/admin/policies', {
      method: 'GET',
    });
    expect(requestMock).toHaveBeenNthCalledWith(
      2,
      '/api/v1/admin/policies/identity/versions',
      { method: 'GET' },
    );
  });

  it('创建与更新 Draft 均带幂等键，PATCH 另透传 If-Match', async () => {
    await publicService('createPolicyDraft')(
      'identity' as never,
      { scope: 'PLATFORM' } as never,
    );
    await publicService('updatePolicyDraft')(
      'identity' as never,
      'draft/1' as never,
      { content: { 'identity.session_idle_minutes': 30 } } as never,
      '"draft-1-r1"' as never,
    );

    expect(requestMock).toHaveBeenNthCalledWith(
      1,
      '/api/v1/admin/policies/identity/drafts',
      {
        data: { scope: 'PLATFORM' },
        headers: {
          'Idempotency-Key': expect.stringMatching(/^[0-9a-f-]{36}$/),
        },
        method: 'POST',
      },
    );
    expect(requestMock).toHaveBeenNthCalledWith(
      2,
      '/api/v1/admin/policies/identity/drafts/draft%2F1',
      {
        data: { content: { 'identity.session_idle_minutes': 30 } },
        headers: {
          'Idempotency-Key': expect.stringMatching(/^[0-9a-f-]{36}$/),
          'If-Match': '"draft-1-r1"',
        },
        method: 'PATCH',
      },
    );
  });

  it('Validate、Preview 使用 Draft 资源路径', async () => {
    await publicService('validatePolicyDraft')(
      'identity' as never,
      'draft-1' as never,
    );
    await publicService('previewPolicyDraft')(
      'identity' as never,
      'draft-1' as never,
    );

    expect(requestMock).toHaveBeenNthCalledWith(
      1,
      '/api/v1/admin/policies/identity/drafts/draft-1/validate',
      {
        headers: {
          'Idempotency-Key': expect.stringMatching(/^[0-9a-f-]{36}$/),
        },
        method: 'POST',
      },
    );
    expect(requestMock).toHaveBeenNthCalledWith(
      2,
      '/api/v1/admin/policies/identity/drafts/draft-1/preview',
      { method: 'GET' },
    );
  });

  it('Publish 透传原因与 TOTP，并带幂等键', async () => {
    const input = { reason: '收紧 Session 空闲期限', totpCode: '123456' };

    await publicService('publishPolicyDraft')(
      'identity' as never,
      'draft-1' as never,
      input as never,
    );

    expect(requestMock).toHaveBeenCalledWith(
      '/api/v1/admin/policies/identity/drafts/draft-1/publish',
      {
        data: input,
        headers: {
          'Idempotency-Key': expect.stringMatching(/^[0-9a-f-]{36}$/),
        },
        method: 'POST',
      },
    );
  });

  it('Rollback 从历史版本创建新 Draft', async () => {
    const input = { toVersion: 1 };

    await publicService('rollbackPolicyVersion')(
      'identity' as never,
      input as never,
    );

    expect(requestMock).toHaveBeenCalledWith(
      '/api/v1/admin/policies/identity/rollback',
      {
        data: input,
        headers: {
          'Idempotency-Key': expect.stringMatching(/^[0-9a-f-]{36}$/),
        },
        method: 'POST',
      },
    );
  });
});
