import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const themeMock = vi.hoisted(() => ({
  resolvedTheme: 'light' as 'dark' | 'light',
}));

vi.mock('@/features/theme', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/theme')>()),
  usePlatformTheme: () => ({
    mode: themeMock.resolvedTheme,
    resolvedTheme: themeMock.resolvedTheme,
    setMode: vi.fn(),
  }),
}));

import { LoginShell } from './LoginShell';

beforeEach(() => {
  themeMock.resolvedTheme = 'light';
});

describe('LoginShell', () => {
  it('按原型呈现统一品牌、Hero、交付链路和认证容器', () => {
    render(
      <LoginShell>
        <form aria-label="凭据步骤" />
      </LoginShell>,
    );

    expect(
      screen.getByRole('img', { name: '研发协作平台' }),
    ).toBeInTheDocument();
    expect(screen.getByText('研发协作平台')).toBeInTheDocument();
    expect(screen.queryByText('IP')).not.toBeInTheDocument();
    expect(screen.getByText('集团内网 · V0.2')).toBeInTheDocument();
    expect(screen.getByText('ENGINEERING PLATFORM')).toBeInTheDocument();

    const heading = screen.getByRole('heading', {
      name: /需求到合并，\s*一条\s*可治理\s*的\s*AI 交付链路。/,
    });
    expect(within(heading).getByText('可治理')).toBeInTheDocument();

    const deliveryFlow = screen.getByRole('list', {
      name: '研发交付链路',
    });
    const stages = [
      '需求对齐',
      'Spec / Plan 规格计划',
      '开发',
      'Review 评审',
      'MR 合并',
    ];
    expect(within(deliveryFlow).getAllByRole('listitem')).toHaveLength(
      stages.length,
    );
    for (const stage of stages) {
      expect(within(deliveryFlow).getByText(stage)).toBeInTheDocument();
    }

    expect(
      screen.getByText('© 2026 集团企业开发部 · 仅限内网使用'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '主题设置' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('form', { name: '凭据步骤' })).toBeInTheDocument();
    expect(screen.queryByText(/重置演示数据/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText('TOTP 动态码')).not.toBeInTheDocument();
  });

  it('暗色主题使用不同的登录背景样式', () => {
    const light = render(
      <LoginShell>
        <span>浅色内容</span>
      </LoginShell>,
    );
    const lightClassName = screen.getByRole('main').className;
    light.unmount();

    themeMock.resolvedTheme = 'dark';
    render(
      <LoginShell>
        <span>暗色内容</span>
      </LoginShell>,
    );

    expect(screen.getByRole('main').className).not.toBe(lightClassName);
    expect(screen.getByText('暗色内容')).toBeInTheDocument();
  });
});
