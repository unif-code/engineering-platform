import { RouteContext } from '@ant-design/pro-components';
import { render, screen } from '@testing-library/react';
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
  it('顶栏只呈现搜索和当前用户菜单，消息入口由侧栏承载', async () => {
    const user = userEvent.setup();
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
      screen.getByRole('combobox', { name: '全局搜索' }).closest('.ant-select'),
    ).toHaveStyle({ width: '220px' });
    expect(screen.queryByRole('button', { name: /消息入口/ })).toBeNull();
    expect(screen.queryByRole('button', { name: '主题设置' })).toBeNull();
    expect(screen.queryByRole('button', { name: '退出登录' })).toBeNull();
    expect(
      screen.getByRole('img', { name: '用户：平台用户' }),
    ).toBeInTheDocument();
    expect(screen.getByText('平台用户')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '平台用户账号菜单' }));
    expect(
      await screen.findByRole('menuitem', { name: '跟随系统' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: '浅色' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: '深色' })).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: '退出登录' }),
    ).toBeInTheDocument();
  });

  it('用户菜单为主题选项显示图标和当前项勾选', async () => {
    const user = userEvent.setup();
    render(
      <AntdApp>
        <ThemeProvider>
          <HeaderActions onLogout={vi.fn()} user={{ name: '平台管理员' }} />
        </ThemeProvider>
      </AntdApp>,
    );

    const trigger = screen.getByRole('button', {
      name: '平台管理员账号菜单',
    });
    await user.click(trigger);

    const system = await screen.findByRole('menuitem', { name: '跟随系统' });
    const light = screen.getByRole('menuitem', { name: '浅色' });
    const dark = screen.getByRole('menuitem', { name: '深色' });
    expect(system.querySelector('.anticon-desktop')).toBeInTheDocument();
    expect(system.querySelector('.anticon-check')).toBeInTheDocument();
    expect(light.querySelector('.anticon-sun')).toBeInTheDocument();
    expect(dark.querySelector('.anticon-moon')).toBeInTheDocument();

    await user.click(dark);
    await user.click(trigger);
    const selectedDark = await screen.findByRole('menuitem', { name: '深色' });
    expect(selectedDark).toHaveClass('ant-dropdown-menu-item-selected');
    expect(selectedDark.querySelector('.anticon-check')).toBeInTheDocument();
  });

  it('未接入的全局搜索保持原型位置但不可触发假结果', async () => {
    const user = userEvent.setup();
    render(
      <AntdApp>
        <ThemeProvider>
          <HeaderActions onLogout={vi.fn()} user={{ name: '平台用户' }} />
        </ThemeProvider>
      </AntdApp>,
    );

    const search = screen.getByRole('combobox', { name: '全局搜索' });
    expect(search).toBeDisabled();
    await user.hover(search.closest('[data-disabled-search]') as HTMLElement);

    expect(await screen.findByText('当前版本暂未接入')).toBeInTheDocument();
    expect(screen.queryByText(/静态原型/)).not.toBeInTheDocument();
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
    const accountMenu = screen.getByRole('button', {
      name: '平台用户账号菜单',
    });
    await user.click(accountMenu);
    await user.click(await screen.findByRole('menuitem', { name: '退出登录' }));
    await vi.waitFor(() => expect(onLogout).toHaveBeenCalledOnce());

    await user.click(accountMenu);
    await user.click(await screen.findByRole('menuitem', { name: '退出登录' }));
    expect(await screen.findByText('退出失败，请重试')).toBeInTheDocument();
    expect(onLogout).toHaveBeenCalledTimes(2);
  });

  it('缺少用户名使用无障碍 fallback，非 Problem 退出失败仍给出可见详情', async () => {
    const user = userEvent.setup();
    const onLogout = vi
      .fn()
      .mockRejectedValueOnce(new Error('网络暂时中断'))
      .mockRejectedValueOnce('offline');
    render(
      <AntdApp>
        <ThemeProvider>
          <HeaderActions onLogout={onLogout} />
        </ThemeProvider>
      </AntdApp>,
    );
    const accountMenu = screen.getByRole('button', {
      name: '当前用户账号菜单',
    });

    expect(
      screen.getByRole('img', { name: '用户：当前用户' }),
    ).toContainElement(document.querySelector('.anticon-user'));

    await user.click(accountMenu);
    await user.click(await screen.findByRole('menuitem', { name: '退出登录' }));
    expect(await screen.findByText('网络暂时中断')).toBeInTheDocument();

    await user.click(accountMenu);
    await user.click(await screen.findByRole('menuitem', { name: '退出登录' }));
    expect(await screen.findByText('退出登录失败，请重试')).toBeInTheDocument();
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
            id: '/requirements',
            pageName: '需求',
            title: '需求 - 研发协作平台',
          },
        }}
      >
        <HeaderTitle />
      </RouteContext.Provider>,
    );

    expect(screen.getByText('需求')).toBeInTheDocument();
    expect(screen.queryByText('研发协作平台')).not.toBeInTheDocument();
  });
});
