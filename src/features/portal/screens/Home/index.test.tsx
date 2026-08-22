import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const homeMocks = vi.hoisted(() => ({
  initialState: {
    principal: { employeeId: crypto.randomUUID(), name: '当前用户' },
  } as
    | {
        principal: { employeeId: string; name: string };
      }
    | undefined,
}));

vi.mock('@umijs/max', () => ({
  useModel: () => ({ initialState: homeMocks.initialState }),
}));

import HomePage from './index';

describe('HomePage', () => {
  it('保留工作台区域并只展示真实空状态', () => {
    render(<HomePage />);

    expect(
      screen.getByRole('heading', { name: '你好，当前用户' }),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: '创建任务' })).toMatchObject({
      disabled: true,
      title: '当前版本暂未接入',
    });
    const myTasks = screen.getByRole('region', { name: '我的任务' });
    expect(within(myTasks).getByText('暂无真实任务数据')).toBeVisible();
    expect(screen.getByRole('region', { name: '关键指标' })).toBeVisible();
    expect(screen.getByRole('region', { name: '待审批' })).toBeVisible();
    expect(screen.getByRole('region', { name: '运行中 Agent' })).toBeVisible();
    expect(screen.getByRole('region', { name: '最近 MR' })).toBeVisible();
    expect(screen.getByRole('region', { name: '平台公告' })).toBeVisible();
    expect(screen.queryByText('TASK-1024')).not.toBeInTheDocument();
    expect(screen.queryByText('REQ-1042')).not.toBeInTheDocument();
  });

  it('initialState 缺失时使用中性欢迎语', () => {
    homeMocks.initialState = undefined;

    render(<HomePage />);

    expect(
      screen.getByRole('heading', { name: '你好，平台用户' }),
    ).toBeVisible();
  });
});
