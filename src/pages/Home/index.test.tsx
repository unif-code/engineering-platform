import { render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const homeMocks = vi.hoisted(() => ({
  initialState: {
    principal: { employeeId: crypto.randomUUID(), name: '平台管理员' },
  } as { principal?: { employeeId: string; name?: string } } | undefined,
}));

vi.mock('@umijs/max', () => ({
  useModel: () => ({
    initialState: homeMocks.initialState,
  }),
}));

import HomePage from './index';

describe('HomePage', () => {
  afterEach(() => {
    homeMocks.initialState = {
      principal: { employeeId: crypto.randomUUID(), name: '平台管理员' },
    };
  });

  it('呈现工作台区块与四项关键指标', () => {
    render(<HomePage />);

    for (const label of [
      '待审批',
      '我的任务',
      '运行中 Agent',
      '最近 MR',
      '平台公告',
      '待处理 Gate',
      '我的进行中任务',
      '运行中 Agent Attempt',
      '本周已合并 MR',
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(
      screen.getByRole('heading', { name: '你好，平台管理员' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('聚合 Gate、任务、Agent Attempt 与交付动态'),
    ).not.toBeInTheDocument();
  });

  it('会为缺少当前用户信息的会话显示中性称呼', () => {
    homeMocks.initialState = undefined;

    render(<HomePage />);

    expect(
      screen.getByRole('heading', { name: '你好，平台用户' }),
    ).toBeInTheDocument();
  });

  it.each([
    ['待审批', 2],
    ['我的任务', 3],
    ['运行中 Agent', 2],
    ['最近 MR', 2],
    ['平台公告', 2],
  ])('%s 区块呈现固定的中性 fixture', (sectionName, itemCount) => {
    render(<HomePage />);

    const section = screen.getByRole('region', { name: sectionName });
    const items = within(section).getAllByRole('listitem');

    expect(items).toHaveLength(itemCount);
    for (const item of items) {
      expect(within(item).getByRole('link')).toHaveAccessibleName();
    }
  });
});
