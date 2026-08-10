import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FilterToolbar } from '.';

describe('FilterToolbar', () => {
  it('在具名工具栏中呈现筛选、搜索、摘要与动作插槽', () => {
    render(
      <FilterToolbar
        actions={<button type="button">创建</button>}
        ariaLabel="任务筛选与操作"
        filters={<span>状态筛选</span>}
        search={<label htmlFor="task-search">搜索</label>}
        summary={<span>共 6 项</span>}
      />,
    );

    const toolbar = screen.getByRole('toolbar', { name: '任务筛选与操作' });

    expect(within(toolbar).getByText('状态筛选')).toBeInTheDocument();
    expect(within(toolbar).getByText('搜索')).toBeInTheDocument();
    expect(within(toolbar).getByText('共 6 项')).toBeInTheDocument();
    expect(
      within(toolbar).getByRole('button', { name: '创建' }),
    ).toBeInTheDocument();
  });
});
