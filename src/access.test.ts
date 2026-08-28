import { createEmployeeNo } from '@root/tests/auth-fixtures';
import { describe, expect, it } from 'vitest';
import access from './access';

function createInitialState(routeKeys: string[], loggedIn = true) {
  return {
    capabilities: loggedIn ? ['identity.account.manage'] : [],
    navigation: routeKeys.map((routeKey, order) => ({
      meta: {},
      name: routeKey,
      order,
      routeKey,
    })),
    principal: loggedIn
      ? { accountId: null, employeeId: createEmployeeNo(), name: '平台用户' }
      : null,
    scopedCapabilities: [],
    workspaces: [],
  };
}

describe('access', () => {
  it('登录用户不再被宽泛 admin projection 门禁抢先拦截', () => {
    expect(access(createInitialState(['home'])).canAccessAdmin).toBe(true);
    expect(access(createInitialState([])).canAccessAdmin).toBe(true);
  });

  it('缺少 Initial State 或 Principal 时 fail closed', () => {
    expect(access().canAccessAdmin).toBe(false);
    expect(access(createInitialState([], false)).canAccessAdmin).toBe(false);
  });
});
