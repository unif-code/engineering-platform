import { describe, expect, it } from 'vitest';
import { loginHandler, meHandler, navigationHandler } from './handlers';

describe('mock handlers', () => {
  it('me 返回与后端 Principal 一致的完整成功信封', () => {
    expect(meHandler()).toEqual({
      code: 200,
      data: { employeeId: '00000000', name: 'V0.1 Stub' },
      message: 'ok',
    });
  });

  it('navigation 返回与后端 NavigationItem 一致且有序的完整成功信封', () => {
    expect(navigationHandler()).toEqual({
      code: 200,
      data: [
        { routeKey: 'home', name: '首页', order: 1 },
        { routeKey: 'admin', name: '管理后台', order: 2 },
      ],
      message: 'ok',
    });
  });

  it('login 格式合法时返回完整成功信封', () => {
    expect(
      loginHandler({ employeeId: '00000000', password: 'x', totp: '123456' }),
    ).toEqual({
      code: 200,
      data: { ok: true },
      message: 'ok',
    });
  });

  it.each([
    {
      caseName: '员工号不是 8 位数字',
      body: { employeeId: '123', password: 'x', totp: '123456' },
    },
    {
      caseName: '员工号长度正确但包含非数字',
      body: { employeeId: 'abcdefgh', password: 'x', totp: '123456' },
    },
    {
      caseName: '密码为空',
      body: { employeeId: '00000000', password: '', totp: '123456' },
    },
    {
      caseName: '动态口令不是 6 位数字',
      body: { employeeId: '00000000', password: 'x', totp: '12' },
    },
    {
      caseName: '动态口令长度正确但包含非数字',
      body: { employeeId: '00000000', password: 'x', totp: 'abcdef' },
    },
  ])('login 在$caseName时返回完整校验失败信封', ({ body }) => {
    expect(loginHandler(body)).toEqual({
      code: 422,
      data: null,
      message: 'Validation failed',
    });
  });

  it.each([
    { caseName: 'body 为 undefined', body: undefined },
    { caseName: 'body 为 null', body: null },
    { caseName: 'body 为数组', body: [] },
    {
      caseName: '缺少 totp',
      body: { employeeId: '00000000', password: 'x' },
    },
    {
      caseName: 'employeeId 不是 string',
      body: { employeeId: 0, password: 'x', totp: '123456' },
    },
    {
      caseName: 'password 不是 string',
      body: { employeeId: '00000000', password: null, totp: '123456' },
    },
    {
      caseName: 'totp 不是 string',
      body: { employeeId: '00000000', password: 'x', totp: 123456 },
    },
  ])('login 在$caseName时稳定返回完整 422 信封', ({ body }) => {
    expect(loginHandler(body)).toEqual({
      code: 422,
      data: null,
      message: 'Validation failed',
    });
  });
});
