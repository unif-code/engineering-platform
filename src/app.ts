// 运行时配置：https://umijs.org/docs/api/runtime-config
import type { RunTimeLayoutConfig, RuntimeAntdConfig } from '@umijs/max';
import { createElement, type ReactNode } from 'react';
import { type CurrentUser, fetchMe } from '@/features/auth';
import {
  buildMenuData,
  fetchNavigation,
  type NavigationItem,
} from '@/features/navigation';
import { HeaderActions, HeaderTitle, MenuBrand } from '@/features/shell';
import {
  createAntdThemeConfig,
  getInitialThemeSnapshot,
  ThemeProvider,
} from '@/features/theme';

export interface InitialState {
  me: CurrentUser | null;
  navigation: NavigationItem[];
}

export async function getInitialState(): Promise<InitialState> {
  const [me, navigation] = await Promise.all([fetchMe(), fetchNavigation()]);
  return { me, navigation };
}

export const antd: RuntimeAntdConfig = (memo) => ({
  ...memo,
  theme: createAntdThemeConfig(getInitialThemeSnapshot().resolvedTheme),
});

export function rootContainer(container: ReactNode): ReactNode {
  return createElement(ThemeProvider, null, container);
}

export const layout = (({ initialState }: { initialState?: InitialState }) => {
  return {
    layout: 'mix',
    navTheme: undefined,
    logo: false,
    title: false,
    siderWidth: 208,
    fixedHeader: true,
    fixSiderbar: true,
    menu: {
      locale: false,
      type: 'group',
      collapsedWidth: 64,
    },
    menuHeaderRender: (_logo, _title, props) =>
      createElement(MenuBrand, { collapsed: props?.collapsed }),
    headerTitleRender: false,
    headerContentRender: () => createElement(HeaderTitle),
    actionsRender: () => [
      createElement(HeaderActions, {
        key: 'platform-actions',
        user: initialState?.me,
      }),
    ],
    menuDataRender: () => buildMenuData(initialState?.navigation ?? []),
    token: {
      header: { heightLayoutHeader: 52 },
      pageContainer: {
        paddingBlockPageContainerContent: 20,
        paddingInlinePageContainerContent: 24,
      },
    },
  };
}) satisfies RunTimeLayoutConfig;
