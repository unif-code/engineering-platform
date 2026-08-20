import { describe, expect, it } from 'vitest';
import { resolveApiEnvelope } from './envelope';

describe('resolveApiEnvelope', () => {
  it('返回成功信封里的业务数据', async () => {
    await expect(
      resolveApiEnvelope(
        Promise.resolve({ code: 200, data: 7, message: 'ok' }),
      ),
    ).resolves.toBe(7);
  });

  it('把业务失败信封转换为 message Error', async () => {
    await expect(
      resolveApiEnvelope(
        Promise.resolve({ code: 422, data: null, message: 'invalid' }),
      ),
    ).rejects.toThrow('invalid');
  });

  it('优先保留 response envelope 的服务端错误详情与 cause', async () => {
    const rejection = {
      response: { data: { message: 'server detail' } },
    };

    await expect(
      resolveApiEnvelope(Promise.reject(rejection)),
    ).rejects.toMatchObject({
      cause: rejection,
      message: 'server detail',
    });
  });

  it('原样透传既有 Error', async () => {
    const error = new Error('network');

    await expect(resolveApiEnvelope(Promise.reject(error))).rejects.toBe(error);
  });

  it('把非 Error rejection 收敛为带 cause 的 Request failed', async () => {
    await expect(
      resolveApiEnvelope(Promise.reject('offline')),
    ).rejects.toMatchObject({ cause: 'offline', message: 'Request failed' });
  });

  it.each([
    null,
    { response: null },
    { response: { data: null } },
    { response: { data: { message: 503 } } },
  ])('忽略不符合信封形状的 response message: %j', async (rejection) => {
    await expect(
      resolveApiEnvelope(Promise.reject(rejection)),
    ).rejects.toMatchObject({ cause: rejection, message: 'Request failed' });
  });
});
