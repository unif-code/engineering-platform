import { describe, expect, it } from 'vitest';
import access from './access';

function createInitialState(routeKeys: string[]) {
  return {
    me: null,
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

  it('缺少 initialState 时默认拒绝管理端', () => {
    expect(access().canAccessAdmin).toBe(false);
  });
});
