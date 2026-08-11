import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/theme', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/theme')>()),
  usePlatformTheme: () => ({
    mode: 'light' as const,
    resolvedTheme: 'light' as const,
    setMode: vi.fn(),
  }),
}));

import { LoginShell } from './LoginShell';

describe('LoginShell', () => {
  it('按原型呈现统一品牌、Hero、交付链路和认证容器', () => {
    render(
      <LoginShell headerAction={<button type="button">主题设置</button>}>
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
      screen.getByRole('button', { name: '主题设置' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('form', { name: '凭据步骤' })).toBeInTheDocument();
    expect(screen.queryByText(/重置演示数据/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText('TOTP 动态码')).not.toBeInTheDocument();
  });
});
