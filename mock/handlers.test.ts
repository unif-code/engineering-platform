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
        { routeKey: 'home', name: '工作台', order: 1 },
        { routeKey: 'tasks', name: '任务', order: 2 },
        { routeKey: 'workspaces', name: '工作区', order: 3 },
        { routeKey: 'messages', name: '消息中心', order: 4 },
        { routeKey: 'teamBoard', name: '团队看板', order: 5 },
        { routeKey: 'audit', name: '审计看板', order: 6 },
        { routeKey: 'admin', name: '管理概览', order: 7 },
        { routeKey: 'adminWorkspaces', name: '工作区管理', order: 8 },
        { routeKey: 'adminSkills', name: '技能管理', order: 9 },
        { routeKey: 'adminModels', name: '模型管理', order: 10 },
        { routeKey: 'adminRoles', name: '角色管理', order: 11 },
        { routeKey: 'adminUsers', name: '用户管理', order: 12 },
        { routeKey: 'adminMenus', name: '菜单管理', order: 13 },
      ],
      message: 'ok',
    });
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
