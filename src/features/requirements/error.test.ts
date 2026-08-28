import { describe, expect, it } from 'vitest';
import {
  formatRequirementError,
  isRequirementAuthorizationFailure,
} from './error';

describe('formatRequirementError', () => {
  it.each([null, undefined, [], 'network unavailable'])(
    '非 Problem 对象 %p 使用安全兜底文案',
    (error) => {
      expect(formatRequirementError(error, '需求操作失败')).toBe(
        '需求操作失败',
      );
    },
  );

  it('优先使用 Problem detail 并附加已归一的 requestId', () => {
    expect(
      formatRequirementError(
        {
          message: 'outer message',
          problem: { detail: '  服务端明确信息  ' },
          requestId: '  req-123  ',
        },
        '需求操作失败',
      ),
    ).toBe('服务端明确信息（requestId: req-123）');
  });

  it('Problem detail 不可用时回退到 Error message', () => {
    expect(
      formatRequirementError(
        { message: '  network unavailable  ', problem: { detail: 503 } },
        '需求操作失败',
      ),
    ).toBe('network unavailable');
  });

  it('空 detail、非字符串 message 与 requestId 最终回退安全文案', () => {
    expect(
      formatRequirementError(
        { message: 503, problem: { detail: '   ' }, requestId: 42 },
        '需求操作失败',
      ),
    ).toBe('需求操作失败');
  });
});

describe('isRequirementAuthorizationFailure', () => {
  it.each([401, 403])('识别权限失败状态 %s', (status) => {
    expect(isRequirementAuthorizationFailure({ problem: { status } })).toBe(
      true,
    );
  });

  it.each([
    null,
    new Error('network unavailable'),
    { problem: null },
    { problem: { status: '403' } },
    { problem: { status: 404 } },
  ])('不把非权限 Problem %p 误判成权限失败', (error) => {
    expect(isRequirementAuthorizationFailure(error)).toBe(false);
  });
});
