// 运行时配置：https://umijs.org/docs/api/runtime-config
import type { RunTimeLayoutConfig } from '@umijs/max';
import { type CurrentUser, fetchMe } from '@/features/auth';
import {
  buildMenuData,
  fetchNavigation,
  type NavigationItem,
} from '@/features/navigation';

export interface InitialState {
  me: CurrentUser | null;
  navigation: NavigationItem[];
}

export async function getInitialState(): Promise<InitialState> {
  const [me, navigation] = await Promise.all([fetchMe(), fetchNavigation()]);
  return { me, navigation };
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
