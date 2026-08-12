// 运行时配置：https://umijs.org/docs/api/runtime-config
import {
  history,
  type RequestConfig,
  type RunTimeLayoutConfig,
  type RuntimeAntdConfig,
} from '@umijs/max';
import { createElement, type ReactNode } from 'react';
import { fetchMe, logout, type Principal } from '@/features/auth';
import {
  buildLoginPath,
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
import {
  ApiError,
  normalizeApiError,
  onUnauthorized,
} from '@/services/transport';

export interface InitialState {
  capabilities: string[];
  navigation: NavigationItem[];
  principal: Principal | null;
}

const EMPTY_INITIAL_STATE: InitialState = {
  capabilities: [],
  navigation: [],
  principal: null,
};

let notifyRuntimeUnauthorized: () => void = () => undefined;

interface LayoutRuntimeInput {
  initialState?: InitialState;
  setInitialState?: (initialState: InitialState) => Promise<void>;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function readRequestFailure(error: unknown): {
  status?: number;
  url?: string;
} {
  if (!isRecord(error)) {
    return {};
  }

  const status = isRecord(error.response) ? error.response.status : undefined;
  const url = isRecord(error.config) ? error.config.url : undefined;

  return {
    status: typeof status === 'number' ? status : undefined,
    url: typeof url === 'string' ? url : undefined,
  };
}

function isAuthEndpoint(url: string | undefined): boolean {
  return url?.includes('/api/v1/auth/') ?? false;
}

export async function getInitialState(): Promise<InitialState> {
  try {
    const [me, navigation] = await Promise.all([fetchMe(), fetchNavigation()]);
    if (me === null) {
      return EMPTY_INITIAL_STATE;
    }

    const { capabilities, ...principal } = me;
    return { capabilities, navigation, principal };
  } catch (error) {
    if (error instanceof ApiError && error.problem.status === 401) {
      return EMPTY_INITIAL_STATE;
    }
    throw error;
  }
}

export const antd: RuntimeAntdConfig = (memo) => ({
  ...memo,
  theme: createAntdThemeConfig(getInitialThemeSnapshot().resolvedTheme),
});

export function rootContainer(container: ReactNode): ReactNode {
  return createElement(ThemeProvider, null, container);
}

export const request: RequestConfig = {
  errorConfig: {
    errorHandler(error) {
      const { status, url } = readRequestFailure(error);
      if (status === 401 && !isAuthEndpoint(url)) {
        notifyRuntimeUnauthorized();
      }
      throw normalizeApiError(error);
    },
  },
};

export const layout = (({
  initialState,
  setInitialState = () => Promise.resolve(),
}: LayoutRuntimeInput) => {
  let clearingSession: Promise<void> | undefined;
  const clearSession = (loginPath: string): Promise<void> => {
    clearingSession ??= (async () => {
      await setInitialState(EMPTY_INITIAL_STATE);
      history.replace(loginPath);
    })().finally(() => {
      clearingSession = undefined;
    });
    return clearingSession;
  };
  const handleUnauthorized = () => {
    void clearSession(buildLoginPath(history.location));
  };

  notifyRuntimeUnauthorized = handleUnauthorized;
  onUnauthorized(handleUnauthorized);

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
      collapsedWidth: 56,
    },
    menuHeaderRender: (_logo, _title, props) =>
      createElement(MenuBrand, { collapsed: props?.collapsed }),
    headerTitleRender: false,
    headerContentRender: () => createElement(HeaderTitle),
    actionsRender: () => [
      createElement(HeaderActions, {
        key: 'platform-actions',
        onLogout: async () => {
          await logout();
          await clearSession('/login');
        },
        user: initialState?.principal,
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
