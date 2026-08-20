import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent, {
  PointerEventsCheckLevel,
  type UserEvent,
} from '@testing-library/user-event';
import { App } from 'antd';
import { type AnchorHTMLAttributes, type ReactNode, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import ArchivedTasksPage from './Archived';
import { AssignTaskSteps } from './AssignTaskSteps';
import { TASK_ROWS } from './constant';
import TasksPage from './index';

vi.mock('@umijs/max', () => ({
  Link: ({
    children,
    to,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & {
    children: ReactNode;
    to: string;
  }) => (
    <a {...props} href={to}>
      {children}
    </a>
  ),
}));

function renderPage(page: React.ReactNode) {
  return render(<App>{page}</App>);
}

function setupUser() {
  return userEvent.setup({
    pointerEventsCheck: PointerEventsCheckLevel.EachTarget,
  });
}

async function selectOption(user: UserEvent, label: string, option: string) {
  await user.click(screen.getByRole('combobox', { name: label }));
  await user.click(await screen.findByRole('option', { name: option }));
}

async function switchTaskView(user: UserEvent, view: '列表' | '看板') {
  const viewSwitcher = screen.getByRole('radiogroup', { name: '任务视图' });
  await user.click(within(viewSwitcher).getByText(view));
}

async function selectTaskStatus(user: UserEvent, status: string) {
  const statusFilter = screen.getByRole('radiogroup', { name: '任务状态' });
  await user.click(within(statusFilter).getByText(status));
}

function AssignmentHarness() {
  const [open, setOpen] = useState(true);
  const task = TASK_ROWS.find((row) => row.id === 'REQ-2026-0142');

  if (!task) {
    throw new Error('缺少分配任务测试数据');
  }

  return (
    <>
      <span>当前责任人：{task.owner}</span>
      {open ? (
        <AssignTaskSteps onClose={() => setOpen(false)} open task={task} />
      ) : null}
    </>
  );
}

describe('TasksPage', () => {
  it('默认呈现本地任务表格', async () => {
    renderPage(<TasksPage />);

    expect(await screen.findByText('REQ-2026-0142')).toBeInTheDocument();
    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();
    expect(table.closest('.ant-table')).toHaveClass('ant-table-small');
    expect(screen.getByText('统一任务创建链路')).toBeInTheDocument();
    expect(
      screen.queryByRole('region', { name: '任务指标' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('集中查看任务阶段、责任人和交付状态'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('radiogroup', { name: '任务状态' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: '搜索任务' })).toHaveAttribute(
      'placeholder',
      '搜索标题 / 编号',
    );
    expect(
      screen.queryByRole('link', { name: '查看归档' }),
    ).not.toBeInTheDocument();
    for (const columnName of [
      '编号',
      '任务标题',
      'Team',
      '仓库',
      '状态',
      '责任人',
      'Agent',
      '更新',
      '操作',
    ]) {
      expect(
        screen.getByRole('columnheader', { name: columnName }),
      ).toBeVisible();
    }
    const taskRow = screen.getByRole('row', { name: /REQ-2026-0142/ });
    expect(
      within(taskRow).getByRole('button', { name: '分配任务' }),
    ).toBeInTheDocument();
  });

  it('每个任务编号都提供对应的详情链接', async () => {
    renderPage(<TasksPage />);
    await screen.findByText('REQ-2026-0142');

    for (const row of TASK_ROWS) {
      expect(screen.getByRole('link', { name: row.id })).toHaveAttribute(
        'href',
        `/tasks/${row.id}`,
      );
    }
  });

  it('切换看板后只呈现阶段列，切回列表仍保留原任务', async () => {
    const user = setupUser();
    renderPage(<TasksPage />);
    await screen.findByText('REQ-2026-0142');

    await switchTaskView(user, '看板');

    const board = await screen.findByRole('region', { name: '任务看板' });
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    for (const stage of [
      'Clarification',
      'Spec',
      'Plan',
      'Implementation',
      'Review',
    ]) {
      expect(
        within(board).getByRole('heading', { name: stage }),
      ).toBeInTheDocument();
    }
    for (const row of TASK_ROWS) {
      expect(
        within(board).getByRole('link', {
          name: `查看任务 ${row.id}：${row.title}`,
        }),
      ).toHaveAttribute('href', `/tasks/${row.id}`);
    }

    await switchTaskView(user, '列表');

    expect(await screen.findByText('REQ-2026-0142')).toBeInTheDocument();
    expect(screen.getByText('REQ-2026-0138')).toBeInTheDocument();
  });

  it('列表与看板切换时保留 keyword 和 status 筛选状态', async () => {
    const user = setupUser();
    renderPage(<TasksPage />);
    await screen.findByText('REQ-2026-0142');

    const search = screen.getByRole('searchbox', { name: '搜索任务' });
    await user.type(search, '工作区');
    await selectTaskStatus(user, '运行中');

    await waitFor(() => {
      expect(screen.getByText('REQ-2026-0142')).toBeInTheDocument();
      expect(screen.getByText('REQ-2026-0119')).toBeInTheDocument();
      expect(screen.queryByText('REQ-2026-0138')).not.toBeInTheDocument();
    });

    await switchTaskView(user, '看板');
    await screen.findByRole('region', { name: '任务看板' });
    await switchTaskView(user, '列表');

    expect(search).toHaveValue('工作区');
    expect(await screen.findByText('REQ-2026-0142')).toBeInTheDocument();
    expect(screen.getByText('REQ-2026-0119')).toBeInTheDocument();
    expect(screen.queryByText('REQ-2026-0138')).not.toBeInTheDocument();
  });

  it('合法创建提交只提示并关闭弹窗，不新增任务行', async () => {
    const user = setupUser();
    renderPage(<TasksPage />);
    await screen.findByText('REQ-2026-0142');
    const table = await screen.findByRole('table');
    await waitFor(() => {
      expect(within(table).getAllByRole('row')).toHaveLength(7);
    });
    const initialRows = within(table).getAllByRole('row').length;

    await user.click(screen.getByRole('button', { name: '创建任务' }));
    const dialog = await screen.findByRole('dialog');

    await user.type(
      within(dialog).getByRole('textbox', { name: '标题' }),
      '不会写入的任务',
    );
    await selectOption(user, 'Workspace', '平台工作区');
    await selectOption(user, '目标仓库', 'engineering-platform');
    await user.type(
      within(dialog).getByRole('textbox', { name: '说明' }),
      '只验证静态原型交互',
    );
    await user.click(within(dialog).getByRole('button', { name: '创建任务' }));

    expect(
      await screen.findByText('静态原型操作：创建任务，未保存任何业务数据。'),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(
      initialRows,
    );
    expect(screen.queryByText('不会写入的任务')).not.toBeInTheDocument();
  });

  it('分配任务逐步校验成员与仓库', async () => {
    const user = setupUser();
    renderPage(<AssignmentHarness />);
    const dialog = await screen.findByRole('dialog');

    await user.click(within(dialog).getByRole('button', { name: '下一步' }));
    expect(await screen.findByText('请选择成员')).toBeInTheDocument();

    await selectOption(user, '选择成员', '林一 · 前端开发');
    await user.click(within(dialog).getByRole('button', { name: '下一步' }));

    const submitButton = await within(dialog).findByRole('button', {
      name: /提\s*交/,
    });
    await user.click(submitButton);
    expect(await screen.findByText('请选择仓库')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('没有目标任务时保留可关闭的空分配弹窗', async () => {
    const user = setupUser();
    const onClose = vi.fn();
    renderPage(<AssignTaskSteps onClose={onClose} open />);

    const dialog = await screen.findByRole('dialog', { name: '分配任务' });
    expect(within(dialog).queryByText('选择成员')).not.toBeInTheDocument();
    await user.keyboard('{Escape}');

    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
  });

  it('从活动任务行打开并关闭分配弹窗', async () => {
    const user = setupUser();
    renderPage(<TasksPage />);

    const row = await screen.findByRole('row', { name: /REQ-2026-0142/ });
    await user.click(within(row).getByRole('button', { name: '分配任务' }));
    expect(
      await screen.findByRole('dialog', { name: '分配任务' }),
    ).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: '分配任务' }),
      ).not.toBeInTheDocument();
    });
  });

  it('合法分配只提示并关闭弹窗，不修改 owner', async () => {
    const user = setupUser();
    renderPage(<AssignmentHarness />);
    const dialog = await screen.findByRole('dialog');

    expect(screen.getByText('当前责任人：陈晓')).toBeInTheDocument();
    await selectOption(user, '选择成员', '林一 · 前端开发');
    await user.click(within(dialog).getByRole('button', { name: '下一步' }));

    await selectOption(user, '确认仓库', 'engineering-platform');
    await user.click(
      await within(dialog).findByRole('button', { name: /提\s*交/ }),
    );

    expect(
      await screen.findByText('静态原型操作：分配任务，未保存任何业务数据。'),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    expect(screen.getByText('当前责任人：陈晓')).toBeInTheDocument();
    expect(screen.queryByText('林一 · 前端开发')).not.toBeInTheDocument();
  });
});

describe('ArchivedTasksPage', () => {
  it('呈现只读归档列表且不提供创建或分配入口', async () => {
    renderPage(<ArchivedTasksPage />);

    expect(screen.getByText('只读')).toBeInTheDocument();
    expect(screen.getByText(/已归档任务 · 只读留存/)).toBeInTheDocument();
    expect(screen.getByRole('table').closest('.ant-table')).toHaveClass(
      'ant-table-small',
    );
    expect(
      screen.queryByRole('button', { name: '创建任务' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '分配任务' }),
    ).not.toBeInTheDocument();
    const archivedRow = await screen.findByRole('row', {
      name: /REQ-2026-0098/,
    });
    expect(within(archivedRow).getByText('留存')).toBeInTheDocument();
  });
});
