import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { App } from 'antd';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AdminWorkspacesPage from '.';

type Deferred = {
  promise: Promise<void>;
  resolve: () => void;
};

type ControlledRequest = {
  completed: Deferred;
  release: Deferred;
  started: Deferred;
};

const controlledRequests = vi.hoisted(
  () => new Map<string, ControlledRequest>(),
);

function createDeferred(): Deferred {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });

  return { promise, resolve };
}

function deferRequest(params: { keyword: string; status: string }) {
  const request = {
    completed: createDeferred(),
    release: createDeferred(),
    started: createDeferred(),
  };
  controlledRequests.set(
    JSON.stringify([params.keyword, params.status]),
    request,
  );

  return {
    async resolve() {
      request.release.resolve();
      await request.completed.promise;
    },
    started: request.started.promise,
  };
}

vi.mock('./util', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./util')>();

  return {
    ...actual,
    queryWorkspaceRows: async (
      ...args: Parameters<typeof actual.queryWorkspaceRows>
    ) => {
      const key = JSON.stringify([args[0].keyword, args[0].status]);
      const request = controlledRequests.get(key);

      if (!request) {
        return actual.queryWorkspaceRows(...args);
      }

      controlledRequests.delete(key);
      request.started.resolve();
      await request.release.promise;

      try {
        return await actual.queryWorkspaceRows(...args);
      } finally {
        request.completed.resolve();
      }
    },
  };
});

function renderPage() {
  return render(
    <App>
      <AdminWorkspacesPage />
    </App>,
  );
}

async function selectOption(user: UserEvent, label: string, option: string) {
  await user.click(screen.getByRole('combobox', { name: label }));
  await user.click(await screen.findByRole('option', { name: option }));
}

afterEach(() => {
  for (const request of controlledRequests.values()) {
    request.completed.resolve();
    request.release.resolve();
    request.started.resolve();
  }
  controlledRequests.clear();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('AdminWorkspacesPage', () => {
  it('呈现三个固定工作区、筛选工具栏和 1050px 横向表格', async () => {
    renderPage();

    expect(
      screen.getByRole('toolbar', { name: '工作区筛选与操作' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('row', { name: /Platform Core/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('row', { name: /Agent Runtime/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('row', { name: /Delivery Governance/ }),
    ).toBeInTheDocument();

    const table = screen.getByRole('table');
    expect(table).toHaveStyle({ width: '1050px' });
    expect(within(table).getAllByRole('row')).toHaveLength(4);
  });

  it('下游无法取消旧请求时，快速连续筛选只呈现最新结果', async () => {
    const NativeAbortController = globalThis.AbortController;
    // 保留原生 AbortSignal，仅模拟下游无法取消已在途的旧请求。
    vi.stubGlobal(
      'AbortController',
      class NonCancellingAbortController extends NativeAbortController {
        override abort() {
          return undefined;
        }
      },
    );

    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('row', { name: /Platform Core/ });

    const search = screen.getByRole('searchbox', { name: '搜索工作区' });
    await user.type(search, 'Agent');

    await waitFor(() => {
      expect(
        screen.getByRole('row', { name: /Agent Runtime/ }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('row', { name: /Platform Core/ }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('row', { name: /Delivery Governance/ }),
      ).not.toBeInTheDocument();
    });

    const staleRequest = deferRequest({
      keyword: '',
      status: 'all',
    });
    const latestRequest = deferRequest({
      keyword: '',
      status: 'restricted',
    });

    await user.clear(search);
    await staleRequest.started;
    await selectOption(user, '工作区状态', '受限');
    await latestRequest.started;

    expect(
      screen.getByRole('toolbar', { name: '工作区筛选与操作' }),
    ).toHaveTextContent('共 1 个工作区');

    await act(() => latestRequest.resolve());

    await waitFor(() => {
      expect(
        screen.getByRole('row', { name: /Delivery Governance.*受限/ }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('row', { name: /Platform Core/ }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('row', { name: /Agent Runtime/ }),
      ).not.toBeInTheDocument();
    });

    await act(() => staleRequest.resolve());

    expect(
      screen.getByRole('row', { name: /Delivery Governance.*受限/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('row', { name: /Platform Core/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('row', { name: /Agent Runtime/ }),
    ).not.toBeInTheDocument();
  });

  it('创建 Modal 包含规定字段，合法提交只提示且不新增工作区', async () => {
    const user = userEvent.setup();
    renderPage();

    const table = await screen.findByRole('table');
    await waitFor(() => {
      expect(within(table).getAllByRole('row')).toHaveLength(4);
    });
    const initialRowCount = within(table).getAllByRole('row').length;

    await user.click(screen.getByRole('button', { name: '创建工作区' }));
    const dialog = await screen.findByRole('dialog', { name: '创建工作区' });

    await user.type(
      within(dialog).getByRole('textbox', { name: '名称' }),
      'Prototype Workspace',
    );
    await user.type(
      within(dialog).getByRole('textbox', { name: 'Owner' }),
      '林一',
    );
    await selectOption(user, '默认 Team', 'Platform');
    await user.type(
      within(dialog).getByRole('textbox', { name: '说明' }),
      '仅用于验证静态原型交互',
    );
    await user.click(within(dialog).getByRole('button', { name: /创\s*建/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '静态原型操作：创建工作区，未保存任何业务数据。',
    );
    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: '创建工作区' }),
      ).not.toBeInTheDocument();
    });
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(
      initialRowCount,
    );
    expect(
      screen.queryByRole('row', { name: /Prototype Workspace/ }),
    ).not.toBeInTheDocument();
  });

  it('查看与编辑只产生视觉反馈且不修改工作区行', async () => {
    const user = userEvent.setup();
    renderPage();

    const table = await screen.findByRole('table');
    const workspaceRow = await screen.findByRole('row', {
      name: /Platform Core/,
    });
    const initialRowCount = within(table).getAllByRole('row').length;

    await user.click(
      within(workspaceRow).getByRole('button', { name: '查看' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '静态原型操作：查看工作区 Platform Core，未保存任何业务数据。',
    );

    await user.click(
      within(workspaceRow).getByRole('button', { name: '编辑' }),
    );
    await waitFor(() => {
      expect(
        screen
          .getAllByRole('alert')
          .some((alert) =>
            alert.textContent?.includes(
              '静态原型操作：编辑工作区 Platform Core，未保存任何业务数据。',
            ),
          ),
      ).toBe(true);
    });
    expect(within(table).getAllByRole('row')).toHaveLength(initialRowCount);
    expect(
      screen.getByRole('row', { name: /Platform Core/ }),
    ).toBeInTheDocument();
  });
});
