import { describe, expect, it } from 'vitest';
import { loginHandler, meHandler, navigationHandler } from './handlers';

describe('mock handlers', () => {
  it('me 返回与后端 Principal 投影一致的裸 DTO', () => {
    expect(meHandler()).toEqual({
      capabilities: [
        'audit.read',
        'identity.account.manage',
        'organization.manage',
        'authorization.grant.manage',
        'platform.configuration.manage',
        'workspace.manage',
      ],
      employeeId: '00000000',
      name: '平台管理员',
    });
  });

  it('navigation 返回 dotted routeKey、sort 与不透明 meta 的裸数组', () => {
    expect(navigationHandler()).toEqual([
      {
        meta: { section: 'workspace' },
        name: '工作台',
        order: 1,
        routeKey: 'home',
        sort: 10,
      },
      {
        meta: { section: 'workspace' },
        name: '工作区',
        order: 2,
        routeKey: 'workspaces',
        sort: 20,
      },
      {
        meta: { section: 'governance' },
        name: '审计看板',
        order: 3,
        routeKey: 'audit',
        sort: 30,
      },
      {
        meta: { section: 'administration' },
        name: '管理概览',
        order: 4,
        routeKey: 'admin',
        sort: 40,
      },
      {
        meta: { section: 'administration' },
        name: '组织管理',
        order: 5,
        routeKey: 'admin.organization',
        sort: 50,
      },
      {
        meta: { section: 'administration' },
        name: '工作区管理',
        order: 6,
        routeKey: 'admin.workspaces',
        sort: 60,
      },
      {
        meta: { section: 'administration' },
        name: '账号管理',
        order: 7,
        routeKey: 'admin.users',
        sort: 70,
      },
      {
        meta: { section: 'administration' },
        name: 'Grant 管理',
        order: 8,
        routeKey: 'admin.grants',
        sort: 80,
      },
    ]);
  });

  it('navigation 的 admin.grants 仅出现一次且由 sort 保持在账号管理之后', () => {
    const navigation = navigationHandler();
    const adminKeys = navigation
      .filter(({ routeKey }) => routeKey.startsWith('admin'))
      .sort((left, right) => left.sort - right.sort)
      .map(({ routeKey }) => routeKey);

    expect(adminKeys).toEqual([
      'admin',
      'admin.organization',
      'admin.workspaces',
      'admin.users',
      'admin.grants',
    ]);
    expect(
      navigation.filter(({ routeKey }) => routeKey === 'admin.grants'),
    ).toHaveLength(1);
  });

  it('login 为已初始化账号返回 TOTP challenge 决策', () => {
    expect(
      loginHandler({
        employeeNo: '00000001',
        password: 'Valid-Password!2026',
      }),
    ).toEqual({
      data: {
        challengeToken: 'challenge-00000001',
        stage: 'TOTP',
      },
      employeeNo: '00000001',
      kind: 'success',
    });
  });

  it('login 为待初始化账号返回 BOOTSTRAP token 决策', () => {
    expect(
      loginHandler({
        employeeNo: '00000009',
        password: 'Temporary-Password!2026',
      }),
    ).toEqual({
      data: {
        bootstrapToken: 'bootstrap-00000009',
        stage: 'BOOTSTRAP',
      },
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
