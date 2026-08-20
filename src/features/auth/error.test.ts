import { describe, expect, it } from 'vitest';
import { ApiError } from '@/services/transport';
import { getAuthErrorMessage } from './error';

describe('getAuthErrorMessage', () => {
  it('按页面映射、detail、全局标题和 fallback 的顺序选择中文消息', () => {
    expect(
      getAuthErrorMessage(
        new ApiError({ title: 'BOOTSTRAP_SESSION_EXPIRED' }),
        '默认提示',
        { BOOTSTRAP_SESSION_EXPIRED: '联系管理员重新签发临时密码' },
      ),
    ).toBe('联系管理员重新签发临时密码');
    expect(
      getAuthErrorMessage(
        new ApiError({ detail: ' 服务端详情 ', title: 'UNKNOWN' }),
        '默认提示',
      ),
    ).toBe('服务端详情');
    expect(
      getAuthErrorMessage(
        new ApiError({ title: 'Authentication challenge exhausted' }),
        '默认提示',
      ),
    ).toBe('动态码验证次数过多，请重新登录');
    expect(getAuthErrorMessage(new ApiError({}), '默认提示')).toBe('默认提示');
  });

  it('只在 requestId 非空时附加请求编号', () => {
    expect(
      getAuthErrorMessage(
        new ApiError({ detail: '认证失败', requestId: ' request-1 ' }),
        '默认提示',
      ),
    ).toBe('认证失败（请求编号：request-1）');
    expect(
      getAuthErrorMessage(
        new ApiError({ detail: '认证失败', requestId: '   ' }),
        '默认提示',
      ),
    ).toBe('认证失败');
  });

  it('普通 Error 使用非空 message，其他输入使用 fallback', () => {
    expect(getAuthErrorMessage(new Error('网络中断'), '默认提示')).toBe(
      '网络中断',
    );
    expect(getAuthErrorMessage(new Error('   '), '默认提示')).toBe('默认提示');
    expect(getAuthErrorMessage('offline', '默认提示')).toBe('默认提示');
  });
});
