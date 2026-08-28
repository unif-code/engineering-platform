import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearSessionQueryCache,
  registerSessionQueryCacheClearer,
} from './sessionQueryCache';

let unregister: () => void = () => undefined;

afterEach(() => {
  unregister();
  unregister = () => undefined;
});

describe('session query cache boundary', () => {
  it('等待当前 QueryClient 完成 cancel 与 clear', async () => {
    const calls: string[] = [];
    unregister = registerSessionQueryCacheClearer(async () => {
      calls.push('cancel');
      await Promise.resolve();
      calls.push('clear');
    });

    await clearSessionQueryCache();

    expect(calls).toEqual(['cancel', 'clear']);
  });

  it('旧 boundary 卸载不会移除后来注册的 QueryClient', async () => {
    const oldClearer = vi.fn();
    const currentClearer = vi.fn();
    const unregisterOld = registerSessionQueryCacheClearer(oldClearer);
    unregister = registerSessionQueryCacheClearer(currentClearer);

    unregisterOld();
    await clearSessionQueryCache();

    expect(oldClearer).not.toHaveBeenCalled();
    expect(currentClearer).toHaveBeenCalledOnce();
  });
});
