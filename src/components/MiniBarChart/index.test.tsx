import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MiniBarChart } from '.';

describe('MiniBarChart', () => {
  it('用可访问名称和文字呈现每个柱形的数据', () => {
    render(
      <MiniBarChart
        ariaLabel="七日吞吐"
        data={[
          { key: 'mon', label: '周一', value: 3, valueLabel: '3 项' },
          {
            key: 'tue',
            label: '周二',
            tone: 'success',
            value: 8,
            valueLabel: '8 项',
          },
        ]}
        height={120}
        highlightKey="tue"
      />,
    );

    const chart = screen.getByRole('figure', { name: '七日吞吐' });
    const dataList = within(chart).getByRole('list', {
      name: '七日吞吐数据',
    });
    const dataPoints = within(dataList).getAllByRole('listitem');

    expect(dataList).toHaveStyle({ height: '120px' });
    expect(dataPoints).toHaveLength(2);
    expect(within(dataPoints[0]).getByText('周一')).toBeVisible();
    expect(within(dataPoints[0]).getByText('3 项')).toBeVisible();
    expect(within(dataPoints[1]).getByText('周二')).toBeVisible();
    expect(within(dataPoints[1]).getByText('8 项')).toBeVisible();
    expect(within(dataPoints[1]).getByText('重点')).toBeVisible();

    expect(
      within(dataPoints[0]).getByRole('meter', { name: '周一：3 项' }),
    ).toHaveAttribute('value', '3');
    expect(
      within(dataPoints[1]).getByRole('meter', { name: '周二：8 项' }),
    ).toHaveAttribute('max', '8');
  });
});
