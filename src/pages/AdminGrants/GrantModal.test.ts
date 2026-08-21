import { describe, expect, it } from 'vitest';
import { buildGrantSubmitInput } from './GrantModal';
import type {
  GrantFormValues,
  GrantPrincipalOption,
  GrantScopeOption,
} from './type';

const principals: readonly GrantPrincipalOption[] = [
  { label: '测试用户', type: 'ACCOUNT', value: 'account-1' },
];
const scopes: readonly GrantScopeOption[] = [
  { label: '全平台', type: 'PLATFORM', value: 'PLATFORM' },
  { label: '工作区', type: 'WORKSPACE', value: 'workspace-1' },
];

function values(overrides: Partial<GrantFormValues> = {}): GrantFormValues {
  return {
    capability: 'task.create',
    principalId: 'account-1',
    principalType: 'ACCOUNT',
    reason: '  覆盖授权输入边界  ',
    scopeId: 'PLATFORM',
    validity: 'LONG_TERM',
    ...overrides,
  };
}

describe('buildGrantSubmitInput', () => {
  it('构建平台和工作区范围并规范化原因', () => {
    expect(buildGrantSubmitInput(values(), principals, scopes)).toEqual({
      capability: 'task.create',
      principalId: 'account-1',
      reason: '覆盖授权输入边界',
      scope: { type: 'PLATFORM' },
    });
    expect(
      buildGrantSubmitInput(
        values({ scopeId: 'workspace-1' }),
        principals,
        scopes,
      ),
    ).toMatchObject({ scope: { id: 'workspace-1', type: 'WORKSPACE' } });
  });

  it.each([
    {
      expected: '请选择与主体类型匹配的主体',
      input: values({ principalId: 'missing' }),
    },
    { expected: '请选择范围', input: values({ scopeId: 'missing' }) },
    {
      expected: '当前契约尚未开放临时有效期授权',
      input: values({ validity: 'TEMPORARY_30' }),
    },
  ])('$expected', ({ expected, input }) => {
    expect(() => buildGrantSubmitInput(input, principals, scopes)).toThrow(
      expected,
    );
  });
});
