import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { App } from 'antd';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AdminModelsPage from '.';

const PAGE_INTERACTION_TEST_TIMEOUT = 30_000;
const PRO_TABLE_INITIAL_ROW_WAIT_OPTIONS = { timeout: 5_000 };

function renderPage() {
  return render(
    <App>
      <AdminModelsPage />
    </App>,
  );
}

async function selectOption(user: UserEvent, label: string, option: string) {
  await user.click(screen.getByRole('combobox', { name: label }));
  await user.click(await screen.findByRole('option', { name: option }));
}

async function expectStaticAction(action: string) {
  const expected = `静态原型操作：${action}，未保存任何业务数据。`;

  await waitFor(() => {
    expect(
      screen
        .getAllByRole('alert')
        .some((alert) => alert.textContent?.includes(expected)),
    ).toBe(true);
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('AdminModelsPage', () => {
  it('默认呈现三个 Tabs 与 1120px 模型目录表格', async () => {
    renderPage();

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(3);
    expect(screen.getByRole('tab', { name: '模型目录' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', { name: '调用看板' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '模型评测' })).toBeInTheDocument();

    const catalog = screen.getByRole('region', { name: '模型目录内容' });
    expect(
      await within(catalog).findByRole(
        'row',
        { name: /GPT-4\.1/ },
        PRO_TABLE_INITIAL_ROW_WAIT_OPTIONS,
      ),
    ).toBeInTheDocument();
    expect(
      within(catalog).getByRole('row', { name: /Claude Sonnet 4/ }),
    ).toBeInTheDocument();

    const table = within(catalog).getByRole('table');
    expect(table).toHaveStyle({ width: '1120px' });
    expect(within(table).getAllByRole('row')).toHaveLength(5);
  });

  it(
    '通过搜索与短状态 Select 筛选模型目录',
    async () => {
      const user = userEvent.setup();
      renderPage();
      await screen.findByRole(
        'row',
        { name: /GPT-4\.1/ },
        PRO_TABLE_INITIAL_ROW_WAIT_OPTIONS,
      );

      const search = screen.getByRole('searchbox', { name: '搜索模型' });
      await user.type(search, 'qwen');

      await waitFor(() => {
        expect(
          screen.getByRole('row', { name: /Qwen3-Coder/ }),
        ).toBeInTheDocument();
        expect(
          screen.queryByRole('row', { name: /GPT-4\.1/ }),
        ).not.toBeInTheDocument();
      });

      await user.clear(search);
      await selectOption(user, '模型状态', '已停用');

      await waitFor(() => {
        expect(
          screen.getByRole('row', { name: /DeepSeek-R1/ }),
        ).toBeInTheDocument();
        expect(
          screen.queryByRole('row', { name: /Claude Sonnet 4/ }),
        ).not.toBeInTheDocument();
      });
    },
    PAGE_INTERACTION_TEST_TIMEOUT,
  );

  it('调用看板呈现四项 KPI 与两个可访问图形', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('tab', { name: '调用看板' }));

    const metrics = await screen.findByRole('region', {
      name: '模型调用 KPI',
    });
    expect(within(metrics).getAllByRole('article')).toHaveLength(4);
    expect(
      within(metrics).getByRole('article', { name: '今日调用：12,846' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('figure', { name: '近七日模型调用量' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('figure', { name: 'Provider 调用分布' }),
    ).toBeInTheDocument();
  });

  it('模型评测 Tab 呈现本地评测表格', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('tab', { name: '模型评测' }));

    const evaluation = await screen.findByRole('region', {
      name: '模型评测内容',
    });
    expect(within(evaluation).getByRole('table')).toBeInTheDocument();
    expect(
      within(evaluation).getByRole('row', {
        name: /Qwen3-Coder.*Internal Code Eval/,
      }),
    ).toBeInTheDocument();
  });

  it('切换三个 Tabs 不调用 global fetch', async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    renderPage();
    await screen.findByRole(
      'row',
      { name: /GPT-4\.1/ },
      PRO_TABLE_INITIAL_ROW_WAIT_OPTIONS,
    );

    await user.click(screen.getByRole('tab', { name: '调用看板' }));
    await screen.findByRole('figure', { name: '近七日模型调用量' });
    await user.click(screen.getByRole('tab', { name: '模型评测' }));
    await screen.findByRole('region', { name: '模型评测内容' });
    await user.click(screen.getByRole('tab', { name: '模型目录' }));
    await screen.findByRole('region', { name: '模型目录内容' });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it(
    '接入模型合法提交只反馈，目录行不变且重开为空',
    async () => {
      const user = userEvent.setup();
      renderPage();
      const table = await screen.findByRole('table');
      await screen.findByRole(
        'row',
        { name: /GPT-4\.1/ },
        PRO_TABLE_INITIAL_ROW_WAIT_OPTIONS,
      );
      const initialRowCount = within(table).getAllByRole('row').length;

      await user.click(screen.getByRole('button', { name: '接入模型' }));
      const dialog = await screen.findByRole('dialog', { name: '接入模型' });

      await user.type(
        within(dialog).getByRole('textbox', { name: '名称' }),
        'Prototype Model',
      );
      await selectOption(user, 'Provider', 'OpenAI');
      const contextWindow = within(dialog).getByRole('spinbutton', {
        name: '上下文窗口',
      });
      await user.clear(contextWindow);
      await user.type(contextWindow, '32000');
      await user.type(
        within(dialog).getByRole('textbox', { name: '用途' }),
        '验证静态模型接入流程',
      );
      await user.click(within(dialog).getByRole('button', { name: /接\s*入/ }));

      await expectStaticAction('接入模型 Prototype Model');
      await waitFor(() => {
        expect(
          screen.queryByRole('dialog', { name: '接入模型' }),
        ).not.toBeInTheDocument();
      });
      expect(
        within(screen.getByRole('table')).getAllByRole('row'),
      ).toHaveLength(initialRowCount);
      expect(
        screen.queryByRole('row', { name: /Prototype Model/ }),
      ).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: '接入模型' }));
      const reopenedDialog = await screen.findByRole('dialog', {
        name: '接入模型',
      });
      expect(
        within(reopenedDialog).getByRole('textbox', { name: '名称' }),
      ).toHaveValue('');

      await user.click(
        within(reopenedDialog).getByRole('button', { name: /取\s*消/ }),
      );
      await waitFor(() => {
        expect(
          screen.queryByRole('dialog', { name: '接入模型' }),
        ).not.toBeInTheDocument();
      });
    },
    PAGE_INTERACTION_TEST_TIMEOUT,
  );

  it(
    '编辑模型提交后丢弃临时值并保持原目录行',
    async () => {
      const user = userEvent.setup();
      renderPage();
      const modelRow = await screen.findByRole(
        'row',
        { name: /GPT-4\.1/ },
        PRO_TABLE_INITIAL_ROW_WAIT_OPTIONS,
      );
      const initialRowCount = within(screen.getByRole('table')).getAllByRole(
        'row',
      ).length;

      await user.click(
        within(modelRow).getByRole('button', { name: '编辑 GPT-4.1' }),
      );
      const dialog = await screen.findByRole('dialog', { name: '编辑模型' });
      const nameInput = within(dialog).getByRole('textbox', { name: '名称' });
      expect(nameInput).toHaveValue('GPT-4.1');

      await user.clear(nameInput);
      await user.type(nameInput, '不会保存的模型名');
      await user.click(within(dialog).getByRole('button', { name: /保\s*存/ }));

      await expectStaticAction('编辑模型 GPT-4.1');
      await waitFor(() => {
        expect(
          screen.queryByRole('dialog', { name: '编辑模型' }),
        ).not.toBeInTheDocument();
      });
      expect(screen.getByRole('row', { name: /GPT-4\.1/ })).toBeInTheDocument();
      expect(
        screen.queryByRole('row', { name: /不会保存的模型名/ }),
      ).not.toBeInTheDocument();
      expect(
        within(screen.getByRole('table')).getAllByRole('row'),
      ).toHaveLength(initialRowCount);

      await user.click(
        within(screen.getByRole('row', { name: /GPT-4\.1/ })).getByRole(
          'button',
          { name: '编辑 GPT-4.1' },
        ),
      );
      const reopenedDialog = await screen.findByRole('dialog', {
        name: '编辑模型',
      });
      expect(
        within(reopenedDialog).getByRole('textbox', { name: '名称' }),
      ).toHaveValue('GPT-4.1');

      await user.click(
        within(reopenedDialog).getByRole('button', { name: /取\s*消/ }),
      );
      await waitFor(() => {
        expect(
          screen.queryByRole('dialog', { name: '编辑模型' }),
        ).not.toBeInTheDocument();
      });
    },
    PAGE_INTERACTION_TEST_TIMEOUT,
  );
});
