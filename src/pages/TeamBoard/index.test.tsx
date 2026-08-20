import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from 'antd';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@ant-design/charts', () => ({
  Bar: () => <div data-ant-design-chart="bar" />,
  Column: () => <div data-ant-design-chart="column" />,
}));

import TeamBoardPage from '.';
import { formatChartValue } from './util';

function renderPage() {
  return render(
    <App>
      <TeamBoardPage />
    </App>,
  );
}

async function selectTeam(
  user: ReturnType<typeof userEvent.setup>,
  teamName: string,
) {
  const teamSelector = screen.getByRole('radiogroup', {
    name: '选择团队',
  });
  await user.click(within(teamSelector).getByText(teamName));
  const selectedTeam = within(teamSelector).getByRole('radio', {
    name: teamName,
  });
  expect(selectedTeam).toBeChecked();
}

describe('TeamBoardPage', () => {
  it('图表标签优先使用展示值并回退原始值', () => {
    expect(formatChartValue({ key: 'w1', label: 'W1', value: 2 })).toBe(2);
    expect(
      formatChartValue({
        key: 'w2',
        label: 'W2',
        value: 3,
        valueLabel: '3 天',
      }),
    ).toBe('3 天');
  });

  it('默认展示营销 Team 的原型完整分析视图', () => {
    renderPage();

    const teamSelector = screen.getByRole('radiogroup', {
      name: '选择团队',
    });
    for (const team of ['营销', '交易', '中台']) {
      expect(
        within(teamSelector).getByRole('radio', { name: team }),
      ).toBeInTheDocument();
    }
    expect(
      within(teamSelector).getByRole('radio', { name: '营销' }),
    ).toBeChecked();

    const metrics = screen.getByRole('region', { name: '营销 KPI' });
    expect(within(metrics).getAllByRole('article')).toHaveLength(4);
    expect(
      within(metrics).getByRole('article', { name: '进行中：14' }),
    ).toBeInTheDocument();

    const throughput = screen.getByRole('figure', {
      name: '营销近八周吞吐',
    });
    expect(
      throughput.querySelector('[data-ant-design-chart="column"]'),
    ).toBeInTheDocument();

    const distribution = screen.getByRole('figure', {
      name: '营销阶段分布',
    });
    expect(
      distribution.querySelector('[data-ant-design-chart="bar"]'),
    ).toBeInTheDocument();

    expect(
      within(screen.getByRole('list', { name: '营销成员负载' })).getAllByRole(
        'listitem',
      ),
    ).toHaveLength(4);
    expect(
      screen.getByRole('listitem', {
        name: '陈晓：5 项，Agent 参与率 82%',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('figure', { name: '营销合并请求处理周期' }),
    ).toHaveTextContent('当前 1.8 天');
    expect(
      screen.getByRole('list', { name: '营销阻塞事项' }),
    ).toHaveTextContent('需求对齐超 3 天');
    expect(screen.queryByText('Platform')).not.toBeInTheDocument();
  });

  it('切换 Team 后同步更新 KPI、吞吐、阶段、成员和阻塞事项', async () => {
    const user = userEvent.setup();
    renderPage();

    await selectTeam(user, '交易');

    expect(screen.getByRole('region', { name: '交易 KPI' })).toHaveTextContent(
      '进行中11',
    );
    expect(
      screen.getByRole('figure', { name: '交易近八周吞吐' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('figure', { name: '交易阶段分布' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('listitem', {
        name: '何山：4 项，Agent 参与率 77%',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('list', { name: '交易阻塞事项' }),
    ).toHaveTextContent('Agent 等待补充 K 线交互说明');
    expect(
      screen.queryByRole('list', { name: '营销成员负载' }),
    ).not.toBeInTheDocument();

    await selectTeam(user, '中台');

    expect(screen.getByRole('region', { name: '中台 KPI' })).toHaveTextContent(
      '阻塞0',
    );
    expect(
      screen.getByRole('figure', {
        name: '中台近八周吞吐',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('figure', {
        name: '中台阶段分布',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('listitem', {
        name: '康宁：3 项，Agent 参与率 70%',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('list', {
        name: '中台阻塞事项',
      }),
    ).toHaveTextContent('当前无阻塞任务');
    expect(
      screen.queryByRole('list', { name: '交易成员负载' }),
    ).not.toBeInTheDocument();
  });

  it('点击阻塞事项提供处理反馈且不修改团队数据', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(
      screen.getByRole('button', {
        name: '处理阻塞：需求对齐超 3 天',
      }),
    );

    expect(
      await screen.findByText(
        '静态原型操作：处理阻塞 需求对齐超 3 天，未保存任何业务数据。',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('list', { name: '营销阻塞事项' }),
    ).toHaveTextContent('需求对齐超 3 天');
  });
});
