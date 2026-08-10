import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from 'antd';
import { describe, expect, it } from 'vitest';
import TeamBoardPage from '.';

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
  it('默认展示 Platform 的完整交付视图', () => {
    renderPage();

    const teamSelector = screen.getByRole('radiogroup', {
      name: '选择团队',
    });
    for (const team of ['Platform', 'Agent Runtime', 'Delivery Governance']) {
      expect(
        within(teamSelector).getByRole('radio', { name: team }),
      ).toBeInTheDocument();
    }
    expect(
      within(teamSelector).getByRole('radio', { name: 'Platform' }),
    ).toBeChecked();

    const metrics = screen.getByRole('region', { name: 'Platform KPI' });
    expect(within(metrics).getAllByRole('article')).toHaveLength(4);
    expect(
      within(metrics).getByRole('article', { name: '迭代完成率：86%' }),
    ).toBeInTheDocument();

    const throughput = screen.getByRole('figure', {
      name: 'Platform 七日吞吐',
    });
    expect(
      within(
        within(throughput).getByRole('list', {
          name: 'Platform 七日吞吐数据',
        }),
      ).getAllByRole('listitem'),
    ).toHaveLength(7);

    const distribution = screen.getByRole('figure', {
      name: 'Platform 阶段分布',
    });
    expect(
      within(
        within(distribution).getByRole('list', {
          name: 'Platform 阶段分布图例',
        }),
      ).getAllByRole('listitem'),
    ).toHaveLength(5);

    expect(
      within(
        screen.getByRole('list', { name: 'Platform 成员负载' }),
      ).getAllByRole('listitem'),
    ).toHaveLength(3);
    expect(
      screen.getByRole('listitem', { name: '林澄：平台体验负责人，负载 72%' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('list', { name: 'Platform 阻塞事项' }),
    ).toHaveTextContent('制品权限矩阵待确认');
  });

  it('切换 Team 后同步更新 KPI、吞吐、阶段、成员和阻塞事项', async () => {
    const user = userEvent.setup();
    renderPage();

    await selectTeam(user, 'Agent Runtime');

    expect(
      screen.getByRole('region', { name: 'Agent Runtime KPI' }),
    ).toHaveTextContent('运行成功率94%');
    expect(
      screen.getByRole('figure', { name: 'Agent Runtime 七日吞吐' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('figure', { name: 'Agent Runtime 阶段分布' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('listitem', {
        name: '方舟：Agent 平台工程师，负载 84%',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('list', { name: 'Agent Runtime 阻塞事项' }),
    ).toHaveTextContent('沙箱镜像冷启动偏高');
    expect(
      screen.queryByRole('list', { name: 'Platform 成员负载' }),
    ).not.toBeInTheDocument();

    await selectTeam(user, 'Delivery Governance');

    expect(
      screen.getByRole('region', { name: 'Delivery Governance KPI' }),
    ).toHaveTextContent('合并通过率91%');
    expect(
      screen.getByRole('figure', {
        name: 'Delivery Governance 七日吞吐',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('figure', {
        name: 'Delivery Governance 阶段分布',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('listitem', {
        name: '沈一：交付治理负责人，负载 76%',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('list', {
        name: 'Delivery Governance 阻塞事项',
      }),
    ).toHaveTextContent('发布 Gate 证据缺失');
    expect(
      screen.queryByRole('list', { name: 'Agent Runtime 成员负载' }),
    ).not.toBeInTheDocument();
  });
});
