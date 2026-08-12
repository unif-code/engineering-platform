import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MetricCard } from '.';

describe('MetricCard', () => {
  it('呈现指标标题、数值、说明与附加内容', () => {
    render(
      <MetricCard
        description="较昨日增加 2 项"
        extra={<span>实时</span>}
        title="运行中任务"
        value={8}
      />,
    );

    expect(screen.getByText('运行中任务')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('较昨日增加 2 项')).toBeInTheDocument();
    expect(screen.getByText('实时')).toBeInTheDocument();
    const card = screen.getByText('运行中任务').closest('.ant-pro-card');
    expect(card).toBeInstanceOf(HTMLElement);
    if (!(card instanceof HTMLElement)) {
      throw new TypeError('指标卡片没有渲染为 HTMLElement');
    }
    expect(getComputedStyle(card).boxShadow).toBe('');
  });
});
