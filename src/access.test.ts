import { describe, expect, it } from 'vitest';
import access from './access';

const loggedInUser = { employeeId: '00000000', name: 'V0.1 Stub' };

function createInitialState(
  routeKeys: string[],
  me: { employeeId: string; name: string } | null = loggedInUser,
) {
  return {
    me,
    navigation: routeKeys.map((routeKey, order) => ({
      routeKey,
      name: routeKey,
      order,
    })),
  };
}

describe('access', () => {
  it('只有用户端 routeKey 时不开放管理端', () => {
    expect(access(createInitialState(['home', 'tasks'])).canAccessAdmin).toBe(
      false,
    );
  });

  it.each([
    'admin',
    'adminWorkspaces',
    'adminSkills',
    'adminModels',
    'adminRoles',
    'adminUsers',
    'adminMenus',
  ])('任一已知管理端 key %s 都开放管理端', (routeKey) => {
    expect(access(createInitialState(['home', routeKey])).canAccessAdmin).toBe(
      true,
    );
  });

  it('伪造未知 key 和原型属性不能开放管理端', () => {
    expect(
      access(createInitialState(['adminGhost', 'constructor'])).canAccessAdmin,
    ).toBe(false);
  });

  it('缺少 initialState 时 fail-closed 拒绝管理端', () => {
    expect(access().canAccessAdmin).toBe(false);
  });

  it('initialState 已加载但未登录时让父 RouteGuard 接管跳转', () => {
    expect(access(createInitialState([], null)).canAccessAdmin).toBe(true);
  });
});
