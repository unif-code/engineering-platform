import { describe, expect, it } from 'vitest';
import { loginHandler, meHandler, navigationHandler } from './handlers';

describe('mock handlers', () => {
  it('me 返回 V0.2 scoped capability DTO', () => {
    expect(meHandler()).toEqual({
      capabilities: [
        { capability: 'audit.read', scopeType: 'PLATFORM' },
        { capability: 'identity.account.manage', scopeType: 'PLATFORM' },
        { capability: 'organization.manage', scopeType: 'PLATFORM' },
        {
          capability: 'authorization.grant.manage',
          scopeType: 'PLATFORM',
        },
        {
          capability: 'platform.configuration.manage',
          scopeType: 'PLATFORM',
        },
        { capability: 'workspace.manage', scopeType: 'PLATFORM' },
      ],
      employeeId: '00000000',
      name: '平台管理员',
    });
  });

  it('navigation 返回 V0.2 order 字段且不泄漏旧 sort 字段', () => {
    const navigation = navigationHandler();

    expect(navigation).toHaveLength(16);
    expect(navigation[0]).toEqual({
      meta: { section: 'workspace' },
      name: '工作台',
      order: 1,
      routeKey: 'home',
    });
    expect(navigation[13]).toEqual({
      meta: { section: 'administration' },
      name: 'Grant 管理',
      order: 14,
      routeKey: 'admin.grants',
    });
    expect(navigation.some((item) => 'sort' in item)).toBe(false);
  });

  it('navigation 的治理路由唯一且按 order 排序', () => {
    const navigation = navigationHandler();
    const adminKeys = navigation
      .filter(({ routeKey }) => routeKey.startsWith('admin'))
      .sort((left, right) => left.order - right.order)
      .map(({ routeKey }) => routeKey);

    expect(adminKeys).toEqual([
      'admin.workspaces',
      'admin.organization',
      'admin.skills',
      'admin.models',
      'admin.roles',
      'admin.users',
      'admin.grants',
      'admin.policies',
      'admin.menus',
    ]);
    expect(new Set(adminKeys)).toHaveProperty('size', adminKeys.length);
  });

  it('login 为已初始化账号返回 TOTP_REQUIRED', () => {
    expect(
      loginHandler({
        employeeNo: '00000001',
        password: 'Valid-Password!2026',
      }),
    ).toEqual({
      data: {
        challengeToken: 'challenge-00000001',
        state: 'TOTP_REQUIRED',
      },
      employeeNo: '00000001',
      kind: 'success',
    });
  });

  it('login 为待初始化账号返回 BOOTSTRAP_REQUIRED 且不暴露 token', () => {
    expect(
      loginHandler({
        employeeNo: '00000009',
        password: 'Temporary-Password!2026',
      }),
    ).toEqual({
      data: { state: 'BOOTSTRAP_REQUIRED' },
      employeeNo: '00000009',
      kind: 'success',
    });
  });

  it.each([
    { caseName: 'body 为 undefined', body: undefined },
    { caseName: 'body 为 null', body: null },
    { caseName: 'body 为数组', body: [] },
    {
      caseName: '员工号不是 8 位数字',
      body: { employeeNo: '123', password: 'Valid-Password!2026' },
    },
    {
      caseName: 'employeeNo 不是 string',
      body: { employeeNo: 1, password: 'Valid-Password!2026' },
    },
    {
      caseName: 'password 不是 string',
      body: { employeeNo: '00000001', password: null },
    },
    {
      caseName: 'password 为空',
      body: { employeeNo: '00000001', password: '' },
    },
  ])('login 在$caseName时返回 validation 决策', ({ body }) => {
    expect(loginHandler(body)).toEqual({ kind: 'validation' });
  });

  it('login 密码错误时保留员工号供退避计数', () => {
    expect(
      loginHandler({ employeeNo: '00000001', password: 'wrong-password' }),
    ).toEqual({
      employeeNo: '00000001',
      kind: 'invalidCredentials',
    });
  });
});
