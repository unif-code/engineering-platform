import { fireEvent, render, screen } from '@testing-library/react';
import { App } from 'antd';
import { describe, expect, it } from 'vitest';
import { useStaticPrototypeAction } from './useStaticPrototypeAction';

function StaticActionHarness() {
  const showStaticAction = useStaticPrototypeAction();

  return (
    <button onClick={() => showStaticAction('测试操作')} type="button">
      执行
    </button>
  );
}

describe('useStaticPrototypeAction', () => {
  it('通过当前 App 上下文展示未保存业务数据的统一提示', async () => {
    render(
      <App>
        <StaticActionHarness />
      </App>,
    );

    fireEvent.click(screen.getByRole('button', { name: '执行' }));

    expect(
      await screen.findByText('静态原型操作：测试操作，未保存任何业务数据。'),
    ).toBeInTheDocument();
  });
});
