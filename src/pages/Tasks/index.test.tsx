import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { App } from 'antd';
import { describe, expect, it } from 'vitest';
import ArchivedTasksPage from './Archived';
import TasksPage from './index';

function renderPage(page: React.ReactNode) {
  return render(<App>{page}</App>);
}

async function selectOption(label: string, option: string) {
  const control = screen.getByLabelText(label);
  const selector = control
    .closest('.ant-select')
    ?.querySelector('.ant-select-selector');

  fireEvent.mouseDown(selector ?? control);
  fireEvent.click(
    await screen.findByText(option, {
      selector: '.ant-select-item-option-content',
    }),
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
    renderPage(<TasksPage />);
    await screen.findByText('REQ-2026-0142');

    fireEvent.click(screen.getByText('看板'));

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

    fireEvent.click(screen.getByText('列表'));

    expect(await screen.findByText('REQ-2026-0142')).toBeInTheDocument();
    expect(screen.getByText('REQ-2026-0138')).toBeInTheDocument();
  });

  it('列表与看板切换时保留 keyword 和 status 筛选状态', async () => {
    renderPage(<TasksPage />);
    await screen.findByText('REQ-2026-0142');

    const search = screen.getByRole('searchbox', { name: '搜索任务' });
    fireEvent.change(search, { target: { value: '工作区' } });
    await selectOption('任务状态', '运行中');

    await waitFor(() => {
      expect(screen.getByText('REQ-2026-0142')).toBeInTheDocument();
      expect(screen.getByText('REQ-2026-0119')).toBeInTheDocument();
      expect(screen.queryByText('REQ-2026-0138')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('看板'));
    await screen.findByRole('region', { name: '任务看板' });
    fireEvent.click(screen.getByText('列表'));

    expect(search).toHaveValue('工作区');
    expect(await screen.findByText('REQ-2026-0142')).toBeInTheDocument();
    expect(screen.getByText('REQ-2026-0119')).toBeInTheDocument();
    expect(screen.queryByText('REQ-2026-0138')).not.toBeInTheDocument();
  });

  it('合法创建提交只提示并关闭弹窗，不新增任务行', async () => {
    renderPage(<TasksPage />);
    await screen.findByText('REQ-2026-0142');
    const table = await screen.findByRole('table');
    await waitFor(() => {
      expect(within(table).getAllByRole('row')).toHaveLength(7);
    });
    const initialRows = within(table).getAllByRole('row').length;

    fireEvent.click(screen.getByRole('button', { name: '创建任务' }));
    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByText('创建任务', { selector: '.ant-modal-title' }),
    ).toBeInTheDocument();

    fireEvent.change(within(dialog).getByLabelText('标题'), {
      target: { value: '不会写入的任务' },
    });
    await selectOption('Workspace', '平台工作区');
    await selectOption('目标仓库', 'engineering-platform');
    fireEvent.change(within(dialog).getByLabelText('说明'), {
      target: { value: '只验证静态原型交互' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: '创建任务' }));

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

  it('分配任务逐步校验成员与仓库，最终只提示且不修改 owner', async () => {
    renderPage(<TasksPage />);
    const taskId = await screen.findByText('REQ-2026-0142');
    const taskRow = taskId.closest('tr');

    expect(taskRow).not.toBeNull();
    expect(
      within(taskRow as HTMLElement).getByText('陈晓'),
    ).toBeInTheDocument();
    fireEvent.click(
      within(taskRow as HTMLElement).getByRole('button', {
        name: '分配任务',
      }),
    );

    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByText('分配任务', { selector: '.ant-modal-title' }),
    ).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: '下一步' }));
    expect(await screen.findByText('请选择成员')).toBeInTheDocument();

    await selectOption('选择成员', '林一 · 前端开发');
    fireEvent.click(within(dialog).getByRole('button', { name: '下一步' }));

    const submitButton = await within(dialog).findByRole('button', {
      name: /提\s*交/,
    });
    fireEvent.click(submitButton);
    expect(await screen.findByText('请选择仓库')).toBeInTheDocument();

    await selectOption('确认仓库', 'engineering-platform');
    fireEvent.click(submitButton);

    expect(
      await screen.findByText('静态原型操作：分配任务，未保存任何业务数据。'),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    const unchangedRow = screen.getByText('REQ-2026-0142').closest('tr');
    expect(
      within(unchangedRow as HTMLElement).getByText('陈晓'),
    ).toBeInTheDocument();
    expect(screen.queryByText('林一 · 前端开发')).not.toBeInTheDocument();
  });
});

describe('ArchivedTasksPage', () => {
  it('呈现只读归档列表且不提供创建入口', async () => {
    renderPage(<ArchivedTasksPage />);

    expect(await screen.findByText('归档任务')).toBeInTheDocument();
    expect(screen.getByText('只读')).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '创建任务' }),
    ).not.toBeInTheDocument();
  });
});
