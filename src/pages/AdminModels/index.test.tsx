import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { App } from 'antd';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@ant-design/charts', () => ({
  Bar: ({ yField }: { yField?: string | (() => string) }) => (
    <div
      data-ant-design-chart="bar"
      data-y-field={typeof yField === 'function' ? yField() : yField}
    />
  ),
  Column: () => <div data-ant-design-chart="column" />,
}));

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

async function selectOption(
  user: UserEvent,
  dialog: HTMLElement,
  label: string,
  option: string,
) {
  await user.click(within(dialog).getByRole('combobox', { name: label }));
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
  it('按原型呈现三个 Tabs、五个模型和精简目录工具栏', async () => {
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
        { name: /DeepSeek V4/ },
        PRO_TABLE_INITIAL_ROW_WAIT_OPTIONS,
      ),
    ).toBeInTheDocument();
    expect(
      within(catalog).getByRole('row', { name: /GPT-5\.6/ }),
    ).toBeInTheDocument();

    const table = within(catalog).getByRole('table');
    expect(table).toHaveStyle({ width: '1040px' });
    expect(within(table).getAllByRole('row')).toHaveLength(6);
    expect(
      within(table).getByRole('columnheader', { name: '部署名' }),
    ).toBeInTheDocument();
    expect(
      within(table).getByRole('columnheader', { name: '接入' }),
    ).toBeInTheDocument();
    expect(
      within(table).getByRole('columnheader', { name: '限流' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '接入模型' })).toBeVisible();
    expect(
      screen.getByText(
        'Chat（对话）与 Execution（执行）独立治理；Agent 请求逻辑能力（coding-backend / review-code…），由 Route Policy（路由策略）解析到实际模型部署',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(
      screen.getByText(
        'Provider 参数由 Adapter 映射，不渗入业务模型 · 联网搜索 / 深度思考为 Deployment Capability',
      ),
    ).toBeInTheDocument();
  });

  it('调用看板呈现六项原型 KPI 与四个图形', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('tab', { name: '调用看板' }));

    const metrics = await screen.findByRole('region', {
      name: '模型调用 KPI',
    });
    expect(within(metrics).getAllByRole('article')).toHaveLength(6);
    expect(
      within(metrics).getByRole('article', { name: '今日调用：42,318' }),
    ).toBeInTheDocument();
    expect(
      within(metrics).getByRole('article', { name: 'Chat / Agent：38 / 62' }),
    ).toBeInTheDocument();
    const usageChart = screen.getByRole('figure', {
      name: '近十四日模型调用量',
    });
    const shareChart = screen.getByRole('figure', {
      name: 'Chat 与 Agent 调用占比',
    });
    const modelChart = screen.getByRole('figure', {
      name: '按模型调用分布',
    });
    const teamChart = screen.getByRole('figure', {
      name: '按 Team 调用分布',
    });
    expect(
      usageChart.querySelector('[data-ant-design-chart="column"]'),
    ).toBeInTheDocument();
    expect(
      shareChart.querySelector('[data-ant-design-chart="bar"]'),
    ).toBeInTheDocument();
    expect(
      shareChart.querySelector('[data-y-field="调用占比"]'),
    ).toBeInTheDocument();
    expect(
      modelChart.querySelector('[data-ant-design-chart="bar"]'),
    ).toBeInTheDocument();
    expect(
      teamChart.querySelector('[data-ant-design-chart="bar"]'),
    ).toBeInTheDocument();
  });

  it('启用与停用操作只反馈且保持模型目录状态', async () => {
    const user = userEvent.setup();
    renderPage();

    const activeRow = await screen.findByRole('row', {
      name: /DeepSeek V4/,
    });
    await user.click(
      within(activeRow).getByRole('button', { name: '停用 DeepSeek V4' }),
    );
    await expectStaticAction('停用模型 DeepSeek V4');

    const inactiveRow = screen.getByRole('row', { name: /GPT-5\.6/ });
    await user.click(
      within(inactiveRow).getByRole('button', { name: '启用 GPT-5.6' }),
    );
    await expectStaticAction('启用模型 GPT-5.6');

    expect(
      within(activeRow).getByRole('button', { name: '停用 DeepSeek V4' }),
    ).toBeInTheDocument();
    expect(
      within(inactiveRow).getByRole('button', { name: '启用 GPT-5.6' }),
    ).toBeInTheDocument();
  });

  it('模型评测 Tab 呈现评测作业和不可变证据表格', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('tab', { name: '模型评测' }));

    const evaluation = await screen.findByRole('region', {
      name: '模型评测内容',
    });
    expect(within(evaluation).getAllByRole('article')).toHaveLength(2);
    expect(
      within(evaluation).getByRole('article', { name: 'promptfoo 回归' }),
    ).toBeInTheDocument();
    expect(
      within(evaluation).getByRole('article', { name: 'EvalScope 基准' }),
    ).toBeInTheDocument();
    expect(
      within(evaluation).getByText(
        /评测只经 ModelEvaluationPort → ModelGatewayPort/,
      ),
    ).toBeInTheDocument();
    expect(within(evaluation).getByRole('table')).toBeInTheDocument();
    expect(
      await within(evaluation).findByRole('row', {
        name: /EV-3312.*qwen3\.8-max.*126\/128 通过/,
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
      { name: /DeepSeek V4/ },
      PRO_TABLE_INITIAL_ROW_WAIT_OPTIONS,
    );

    await user.click(screen.getByRole('tab', { name: '调用看板' }));
    await screen.findByRole('figure', { name: '近十四日模型调用量' });
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
        { name: /DeepSeek V4/ },
        PRO_TABLE_INITIAL_ROW_WAIT_OPTIONS,
      );
      const initialRowCount = within(table).getAllByRole('row').length;

      await user.click(screen.getByRole('button', { name: '接入模型' }));
      const dialog = await screen.findByRole('dialog', { name: '接入模型' });

      await user.type(
        within(dialog).getByRole('textbox', { name: '模型名称' }),
        'GLM-5',
      );
      await user.type(
        within(dialog).getByRole('textbox', { name: '部署名' }),
        'glm-5',
      );
      await selectOption(user, dialog, '用途', 'Chat + Execution');
      await selectOption(user, dialog, '接入方式', '百炼 compatible-mode');
      await user.type(
        within(dialog).getByRole('textbox', { name: '上下文窗口' }),
        '256K',
      );
      const rate = within(dialog).getByRole('spinbutton', {
        name: '限流 (RPM)',
      });
      await user.type(rate, '200');
      await selectOption(user, dialog, '初始状态', '灰度');

      expect(within(dialog).getAllByRole('textbox')).toHaveLength(3);
      expect(within(dialog).getAllByRole('combobox')).toHaveLength(3);
      expect(within(dialog).getAllByRole('spinbutton')).toHaveLength(1);
      await user.click(within(dialog).getByRole('button', { name: /接\s*入/ }));

      await expectStaticAction('接入模型 GLM-5');
      await waitFor(() => {
        expect(
          screen.queryByRole('dialog', { name: '接入模型' }),
        ).not.toBeInTheDocument();
      });
      expect(
        within(screen.getByRole('table')).getAllByRole('row'),
      ).toHaveLength(initialRowCount);
      expect(
        screen.queryByRole('row', { name: /GLM-5/ }),
      ).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: '接入模型' }));
      const reopenedDialog = await screen.findByRole('dialog', {
        name: '接入模型',
      });
      expect(
        within(reopenedDialog).getByRole('textbox', { name: '模型名称' }),
      ).toHaveValue('');
      expect(
        within(reopenedDialog).getByRole('textbox', {
          name: '上下文窗口',
        }),
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
        { name: /DeepSeek V4/ },
        PRO_TABLE_INITIAL_ROW_WAIT_OPTIONS,
      );
      const initialRowCount = within(screen.getByRole('table')).getAllByRole(
        'row',
      ).length;

      await user.click(
        within(modelRow).getByRole('button', { name: '配置 DeepSeek V4' }),
      );
      const dialog = await screen.findByRole('dialog', {
        name: '编辑模型配置',
      });
      const rateInput = within(dialog).getByRole('spinbutton', {
        name: '限流 (RPM)',
      });
      expect(rateInput).toHaveValue('600');
      expect(
        within(dialog).getByRole('textbox', { name: '上下文窗口' }),
      ).toHaveValue('256K');
      expect(
        within(dialog).getByRole('combobox', { name: '状态' }).parentElement,
      ).toHaveTextContent('启用');
      expect(
        within(dialog).queryByRole('textbox', { name: '逻辑能力标签' }),
      ).not.toBeInTheDocument();
      expect(
        within(dialog).queryByRole('spinbutton', { name: 'Route 权重' }),
      ).not.toBeInTheDocument();
      expect(within(dialog).getAllByRole('textbox')).toHaveLength(1);
      expect(within(dialog).getAllByRole('spinbutton')).toHaveLength(1);
      expect(within(dialog).getAllByRole('combobox')).toHaveLength(1);

      await user.clear(rateInput);
      await user.type(rateInput, '999');
      await user.click(within(dialog).getByRole('button', { name: /保\s*存/ }));

      await expectStaticAction('编辑模型配置 DeepSeek V4');
      await waitFor(() => {
        expect(
          screen.queryByRole('dialog', { name: '编辑模型配置' }),
        ).not.toBeInTheDocument();
      });
      expect(
        screen.getByRole('row', { name: /DeepSeek V4.*600 RPM/ }),
      ).toBeInTheDocument();
      expect(
        within(screen.getByRole('table')).getAllByRole('row'),
      ).toHaveLength(initialRowCount);

      await user.click(
        within(screen.getByRole('row', { name: /DeepSeek V4/ })).getByRole(
          'button',
          { name: '配置 DeepSeek V4' },
        ),
      );
      const reopenedDialog = await screen.findByRole('dialog', {
        name: '编辑模型配置',
      });
      expect(
        within(reopenedDialog).getByRole('spinbutton', { name: '限流 (RPM)' }),
      ).toHaveValue('600');

      await user.click(
        within(reopenedDialog).getByRole('button', { name: /取\s*消/ }),
      );
      await waitFor(() => {
        expect(
          screen.queryByRole('dialog', { name: '编辑模型配置' }),
        ).not.toBeInTheDocument();
      });
    },
    PAGE_INTERACTION_TEST_TIMEOUT,
  );
});
