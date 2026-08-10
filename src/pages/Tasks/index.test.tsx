import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent, {
  PointerEventsCheckLevel,
  type UserEvent,
} from '@testing-library/user-event';
import { App } from 'antd';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import ArchivedTasksPage from './Archived';
import { AssignTaskSteps } from './AssignTaskSteps';
import { TASK_ROWS } from './constant';
import TasksPage from './index';

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

async function openAssignment(user: UserEvent) {
  const taskRow = await screen.findByRole('row', {
    name: /REQ-2026-0142/,
  });
  await user.click(
    within(taskRow).getByRole('button', {
      name: '分配任务',
    }),
  );
  return { dialog: await screen.findByRole('dialog'), taskRow };
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
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('统一任务创建链路')).toBeInTheDocument();
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
    await selectOption(user, '任务状态', '运行中');

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
    renderPage(<TasksPage />);
    const { dialog } = await openAssignment(user);

    await user.click(within(dialog).getByRole('button', { name: '下一步' }));
    expect(await screen.findByText('请选择成员')).toBeInTheDocument();

    await selectOption(user, '选择成员', '林一 · 前端开发');
    await user.click(within(dialog).getByRole('button', { name: '下一步' }));

    const submitButton = await within(dialog).findByRole('button', {
      name: /提\s*交/,
    });
    await user.click(submitButton);
    expect(await screen.findByText('请选择仓库')).toBeInTheDocument();
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

    expect(await screen.findByText('归档任务')).toBeInTheDocument();
    expect(screen.getByText('只读')).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '创建任务' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '分配任务' }),
    ).not.toBeInTheDocument();
  });
});
