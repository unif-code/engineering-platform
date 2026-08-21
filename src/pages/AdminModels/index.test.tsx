import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@ant-design/charts', () => ({
  Bar: () => <div data-ant-design-chart="bar" />,
  Column: () => <div data-ant-design-chart="column" />,
}));

import AdminModelsPage from '.';

describe('AdminModelsPage', () => {
  it('模型目录保留最终原型列与禁用入口且没有静态模型', () => {
    render(<AdminModelsPage />);

    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
      '模型目录',
      '调用看板',
      '模型评测',
    ]);
    expect(screen.getByRole('button', { name: '接入模型' })).toMatchObject({
      disabled: true,
      title: '当前版本暂未接入',
    });

    const catalog = screen.getByRole('region', { name: '模型目录内容' });
    expect(
      within(catalog)
        .getAllByRole('columnheader')
        .map((header) => header.textContent),
    ).toEqual([
      '模型',
      '部署名',
      '用途',
      '接入',
      '上下文',
      '限流',
      '状态',
      '操作',
    ]);
    expect(within(catalog).getByText('当前没有真实数据')).toBeVisible();
    expect(screen.queryByText('DeepSeek V4')).not.toBeInTheDocument();
    expect(screen.queryByText('GPT-5.6')).not.toBeInTheDocument();
  });

  it('调用看板保留数据容器且每个容器明确为空', async () => {
    const user = userEvent.setup();
    render(<AdminModelsPage />);

    await user.click(screen.getByRole('tab', { name: '调用看板' }));

    for (const regionName of [
      '模型调用 KPI',
      '调用量趋势',
      'Chat 与 Agent 调用占比',
      '按模型分布',
      '按 Team 分布',
    ]) {
      expect(
        within(screen.getByRole('region', { name: regionName })).getByText(
          '当前没有真实数据',
        ),
      ).toBeVisible();
    }
    expect(screen.queryByText('42,318')).not.toBeInTheDocument();
    expect(screen.queryByText('38%')).not.toBeInTheDocument();
  });

  it('模型评测保留作业与证据表格且两者都明确为空', async () => {
    const user = userEvent.setup();
    render(<AdminModelsPage />);

    await user.click(screen.getByRole('tab', { name: '模型评测' }));

    expect(
      within(screen.getByRole('region', { name: '评测作业' })).getByText(
        '当前没有真实数据',
      ),
    ).toBeVisible();
    const evidence = screen.getByRole('region', { name: '评测证据' });
    expect(
      within(evidence)
        .getAllByRole('columnheader')
        .map((header) => header.textContent),
    ).toEqual([
      '证据 ID',
      '类型',
      '目标 Deployment',
      '输入 / 阈值快照',
      '结论（owner 判定）',
      '时间',
    ]);
    expect(within(evidence).getByText('当前没有真实数据')).toBeVisible();
    expect(screen.queryByText('promptfoo 回归')).not.toBeInTheDocument();
    expect(screen.queryByText('EV-3312')).not.toBeInTheDocument();
  });
});
