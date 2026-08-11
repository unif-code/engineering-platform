import { RouteContext } from '@ant-design/pro-components';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App as AntdApp } from 'antd';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '@/features/theme';
import { ApiError } from '@/services/transport';
import { HeaderActions, HeaderTitle, MenuBrand } from '.';

vi.mock('@umijs/max', () => ({
  useAntdConfigSetter: () => vi.fn(),
}));

beforeEach(() => {
  window.localStorage.clear();
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({
      matches: false,
      media: '(prefers-color-scheme: dark)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  );
});

describe('HeaderActions', () => {
  it('呈现搜索、主题、消息入口和当前用户头像', () => {
    const onLogout = vi.fn();
    render(
      <AntdApp>
        <ThemeProvider>
          <HeaderActions onLogout={onLogout} user={{ name: '平台用户' }} />
        </ThemeProvider>
      </AntdApp>,
    );

    expect(screen.getByRole('combobox', { name: '全局搜索' })).toHaveAttribute(
      'placeholder',
      '搜索任务、工作区、Artifact',
    );
    expect(
      screen.getByRole('button', { name: '主题设置' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '消息入口' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '退出登录' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: '用户：平台用户' }),
    ).toBeInTheDocument();
    expect(screen.getByText('平台用户')).toBeInTheDocument();
  });

  it('消息入口只展示静态提示', async () => {
    render(
      <AntdApp>
        <ThemeProvider>
          <HeaderActions onLogout={vi.fn()} user={null} />
        </ThemeProvider>
      </AntdApp>,
    );

    fireEvent.click(screen.getByRole('button', { name: '消息入口' }));

    expect(
      await screen.findByText('静态原型：消息入口暂未接入。'),
    ).toBeInTheDocument();
  });

  it('选择静态搜索项只展示未接入提示', async () => {
    render(
      <AntdApp>
        <ThemeProvider>
          <HeaderActions onLogout={vi.fn()} user={{ name: '平台用户' }} />
        </ThemeProvider>
      </AntdApp>,
    );

    const search = screen.getByRole('combobox', { name: '全局搜索' });
    fireEvent.change(search, { target: { value: '搜索任务' } });
    const options = await screen.findAllByText('搜索任务');
    fireEvent.click(options.at(-1) as HTMLElement);

    expect(
      await screen.findByText('静态原型：全局搜索暂未接入。'),
    ).toBeInTheDocument();
  });

  it('退出成功调用 Session owner，失败展示 Problem detail 原文', async () => {
    const user = userEvent.setup();
    const onLogout = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(
        new ApiError({ detail: '退出失败，请重试', status: 503 }),
      );
    render(
      <AntdApp>
        <ThemeProvider>
          <HeaderActions onLogout={onLogout} user={{ name: '平台用户' }} />
        </ThemeProvider>
      </AntdApp>,
    );
    const button = screen.getByRole('button', { name: '退出登录' });

    await user.click(button);
    await vi.waitFor(() => expect(onLogout).toHaveBeenCalledOnce());
    await vi.waitFor(() => expect(button).not.toHaveClass('ant-btn-loading'));

    await user.click(button);
    expect(await screen.findByText('退出失败，请重试')).toBeInTheDocument();
    expect(onLogout).toHaveBeenCalledTimes(2);
  });
});

describe('shell branding', () => {
  it('顶栏标题和展开、折叠菜单品牌都使用统一产品名', () => {
    const { rerender } = render(
      <>
        <HeaderTitle />
        <MenuBrand />
      </>,
    );

    expect(screen.getAllByText('研发协作平台')).toHaveLength(2);
    expect(
      screen.getByRole('img', { name: '研发协作平台' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('IP')).not.toBeInTheDocument();

    rerender(<MenuBrand collapsed />);

    expect(
      screen.getByRole('img', { name: '研发协作平台' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('研发协作平台')).not.toBeInTheDocument();
    expect(screen.queryByText('IP')).not.toBeInTheDocument();
  });

  it('顶栏标题优先展示 ProLayout 当前页面名', () => {
    render(
      <RouteContext.Provider
        value={{
          pageTitleInfo: {
            id: '/tasks',
            pageName: '任务',
            title: '任务 - 研发协作平台',
          },
        }}
      >
        <HeaderTitle />
      </RouteContext.Provider>,
    );

    expect(screen.getByText('任务')).toBeInTheDocument();
    expect(screen.queryByText('研发协作平台')).not.toBeInTheDocument();
  });
});
