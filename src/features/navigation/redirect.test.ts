import { describe, expect, it } from 'vitest';
import { buildLoginPath, resolvePostLoginPath } from './redirect';

describe('session redirects', () => {
  it('401 登录地址保留当前站内路径、查询与 hash', () => {
    expect(
      buildLoginPath({
        hash: '#member',
        pathname: '/admin/users',
        search: '?status=enabled',
      }),
    ).toBe('/login?redirect=%2Fadmin%2Fusers%3Fstatus%3Denabled%23member');
  });

  it.each([
    {
      candidate: '/admin/users?status=enabled#member',
      expected: '/admin/users?status=enabled#member',
    },
    { candidate: '/tasks/task-42', expected: '/tasks/task-42' },
    { candidate: null, expected: '/home' },
    { candidate: '', expected: '/home' },
    { candidate: 'https://evil.example/path', expected: '/home' },
    { candidate: '//evil.example/path', expected: '/home' },
    { candidate: '/\\evil.example/path', expected: '/home' },
    { candidate: '/login', expected: '/home' },
    { candidate: '/login?redirect=/admin', expected: '/home' },
    { candidate: '/login/', expected: '/home' },
    { candidate: '/bootstrap?token=secret', expected: '/home' },
    { candidate: '/bootstrap/', expected: '/home' },
  ])('登录后将 $candidate 归一为 $expected', ({ candidate, expected }) => {
    expect(resolvePostLoginPath(candidate)).toBe(expected);
  });

  it.each([
    '/login',
    '/login/',
    '/bootstrap',
    '/bootstrap/',
  ])('%s 上的 401 不生成自指回跳', (path) => {
    expect(buildLoginPath({ pathname: path, search: '' })).toBe('/login');
  });
});
