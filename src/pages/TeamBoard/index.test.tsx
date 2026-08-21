import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@ant-design/charts', () => ({
  Bar: () => <div data-ant-design-chart="bar" />,
  Column: () => <div data-ant-design-chart="column" />,
}));

import TeamBoardPage from '.';

describe('TeamBoardPage', () => {
  it('保留分析容器但不渲染虚构指标和图表序列', () => {
    render(<TeamBoardPage />);

    expect(screen.getByRole('heading', { name: '团队看板' })).toBeVisible();
    for (const regionName of [
      '团队关键指标',
      '任务吞吐',
      '阶段分布',
      '成员负载',
      '合并请求处理周期',
      '阻塞任务',
    ]) {
      expect(screen.getByRole('region', { name: regionName })).toBeVisible();
    }
    expect(screen.getAllByText(/暂无真实.+数据/).length).toBeGreaterThan(0);
    expect(screen.queryByText('14')).not.toBeInTheDocument();
    expect(screen.queryByText('陈晓')).not.toBeInTheDocument();
    expect(screen.queryByText('MK-1025')).not.toBeInTheDocument();
    expect(
      document.querySelector('[data-ant-design-chart]'),
    ).not.toBeInTheDocument();
  });
});
