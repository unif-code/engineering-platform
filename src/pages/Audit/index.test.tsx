import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from 'antd';
import { describe, expect, it } from 'vitest';
import AuditPage from '.';

function renderPage() {
  return render(
    <App>
      <AuditPage />
    </App>,
  );
}

describe('AuditPage', () => {
  it('呈现审计指标、趋势、筛选工具栏和本地表格', async () => {
    renderPage();

    const metrics = screen.getByRole('region', { name: '审计指标' });
    expect(within(metrics).getAllByRole('article')).toHaveLength(4);
    expect(
      within(metrics).getByRole('article', { name: '高风险事件：4' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('figure', { name: '近 7 日审计趋势' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('toolbar', { name: '审计筛选与操作' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('row', { name: /AUD-2026-0810-001/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('从审计行打开详情 Drawer，并可通过关闭按钮移除', async () => {
    const user = userEvent.setup();
    renderPage();

    const auditRow = await screen.findByRole('row', {
      name: /AUD-2026-0810-001/,
    });
    await user.click(
      within(auditRow).getByRole('button', { name: '查看详情' }),
    );

    const dialog = await screen.findByRole('dialog', {
      name: '审计事件详情',
    });
    expect(dialog).toHaveTextContent('Correlation ID');
    expect(dialog).toHaveTextContent('corr-audit-0810-001');
    expect(dialog).toHaveTextContent('Config Publish');
    expect(dialog).toHaveTextContent('生产策略 / access-policy-v8');

    await user.click(
      within(dialog).getByRole('button', { name: /关闭|close/i }),
    );
    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: '审计事件详情' }),
      ).not.toBeInTheDocument();
    });
  });

  it('导出报表只提示静态操作且不改变审计行', async () => {
    const user = userEvent.setup();
    renderPage();

    const table = await screen.findByRole('table');
    await screen.findByRole('row', { name: /AUD-2026-0810-001/ });
    const initialRowCount = within(table).getAllByRole('row').length;

    await user.click(screen.getByRole('button', { name: '导出报表' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '静态原型操作：导出审计报表，未保存任何业务数据。',
    );
    expect(within(table).getAllByRole('row')).toHaveLength(initialRowCount);
    expect(
      screen.getByRole('row', { name: /AUD-2026-0810-001/ }),
    ).toBeInTheDocument();
  });

  it('保存筛选只提示静态操作且不改变审计行', async () => {
    const user = userEvent.setup();
    renderPage();

    const table = await screen.findByRole('table');
    await screen.findByRole('row', { name: /AUD-2026-0810-001/ });
    const initialRowCount = within(table).getAllByRole('row').length;

    await user.click(screen.getByRole('button', { name: '保存筛选' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '静态原型操作：保存审计筛选，未保存任何业务数据。',
    );
    expect(within(table).getAllByRole('row')).toHaveLength(initialRowCount);
    expect(
      screen.getByRole('row', { name: /AUD-2026-0810-001/ }),
    ).toBeInTheDocument();
  });
});
