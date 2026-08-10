import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DistributionBar } from '.';

const items = [
  { key: 'ready', label: '就绪', tone: 'info', value: 2 },
  { key: 'building', label: '开发中', tone: 'brand', value: 3 },
  { key: 'done', label: '已交付', tone: 'success', value: 5 },
] as const;

describe('DistributionBar', () => {
  it('用按数值伸展的分段和文字图例共同表达分布', () => {
    render(<DistributionBar ariaLabel="阶段分布" items={items} />);

    const distribution = screen.getByRole('figure', { name: '阶段分布' });
    const segments = within(distribution).getByRole('group', {
      name: '阶段分布比例',
    });
    const ready = within(segments).getByRole('meter', {
      name: '就绪：2',
    });
    const building = within(segments).getByRole('meter', {
      name: '开发中：3',
    });
    const done = within(segments).getByRole('meter', {
      name: '已交付：5',
    });

    expect(ready).toHaveStyle({ flexGrow: '2' });
    expect(building).toHaveStyle({ flexGrow: '3' });
    expect(done).toHaveStyle({ flexGrow: '5' });
    expect(done).toHaveAttribute('max', '10');

    const legend = within(distribution).getByRole('list', {
      name: '阶段分布图例',
    });
    const legendItems = within(legend).getAllByRole('listitem');
    expect(legendItems).toHaveLength(3);
    expect(within(legendItems[0]).getByText('就绪')).toBeVisible();
    expect(within(legendItems[0]).getByText('2')).toBeVisible();
    expect(within(legendItems[1]).getByText('开发中')).toBeVisible();
    expect(within(legendItems[1]).getByText('3')).toBeVisible();
    expect(within(legendItems[2]).getByText('已交付')).toBeVisible();
    expect(within(legendItems[2]).getByText('5')).toBeVisible();
  });

  it('允许只保留可访问分段而隐藏文字图例', () => {
    render(
      <DistributionBar
        ariaLabel="紧凑阶段分布"
        items={items}
        showLegend={false}
      />,
    );

    const distribution = screen.getByRole('figure', {
      name: '紧凑阶段分布',
    });
    expect(
      within(distribution).getAllByRole('meter', { hidden: false }),
    ).toHaveLength(3);
    expect(
      within(distribution).queryByRole('list', {
        name: '紧凑阶段分布图例',
      }),
    ).not.toBeInTheDocument();
  });
});
