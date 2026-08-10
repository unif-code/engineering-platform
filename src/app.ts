// 运行时配置：https://umijs.org/docs/api/runtime-config
import type { RunTimeLayoutConfig, RuntimeAntdConfig } from '@umijs/max';
import { createElement, type ReactNode } from 'react';
import { type CurrentUser, fetchMe } from '@/features/auth';
import {
  buildMenuData,
  fetchNavigation,
  type NavigationItem,
} from '@/features/navigation';
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
    logo: false,
    menu: {
      locale: false,
    },
    menuDataRender: () => buildMenuData(initialState?.navigation ?? []),
  };
}) satisfies RunTimeLayoutConfig;
