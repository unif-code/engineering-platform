import { describe, expect, it } from 'vitest';
import { ApiError } from '@/services/transport';
import { formatGovernanceError } from './error';

describe('formatGovernanceError', () => {
  it.each([
    { detail: '无治理权限', requestId: 'req-403', status: 403 },
    { detail: '当前状态冲突', requestId: 'req-409', status: 409 },
    { detail: '目标不合法', requestId: 'req-422', status: 422 },
  ])('保留 $status Problem 原文与 requestId', ({
    detail,
    requestId,
    status,
  }) => {
    expect(
      formatGovernanceError(
        new ApiError({ detail, requestId, status }),
        '治理操作失败',
      ),
    ).toBe(`${detail}（requestId: ${requestId}）`);
  });

  it('非 Problem 错误使用 Error message 或调用方 fallback', () => {
    expect(formatGovernanceError(new Error('网络中断'), '加载失败')).toBe(
      '网络中断',
    );
    expect(formatGovernanceError(null, '加载失败')).toBe('加载失败');
  });
});
