// 运行时配置：https://umijs.org/docs/api/runtime-config
import {
  history,
  type RequestConfig,
  type RunTimeLayoutConfig,
  type RuntimeAntdConfig,
  useQueryClient,
} from '@umijs/max';
import { Badge, Tag } from 'antd';
import {
  createElement,
  type MouseEvent,
  type ReactNode,
  useEffect,
} from 'react';
import {
  fetchMe,
  logout,
  type Principal,
  type ScopedCapability,
  type WorkspaceSummary,
} from '@/features/auth';
import {
  buildLoginPath,
  buildMenuData,
  fetchNavigation,
  type NavigationItem,
  ROUTE_REGISTRY,
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
import {
  clearSessionQueryCache,
  registerSessionQueryCacheClearer,
} from '@/utils/sessionQueryCache';

export interface InitialState {
  capabilities: string[];
  navigation: NavigationItem[];
  principal: Principal | null;
  scopedCapabilities: ScopedCapability[];
  workspaces: WorkspaceSummary[];
}

const EMPTY_INITIAL_STATE: InitialState = {
  capabilities: [],
  navigation: [],
  principal: null,
  scopedCapabilities: [],
  workspaces: [],
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

    const { capabilities, scopedCapabilities, workspaces, ...principal } = me;
    return {
      capabilities,
      navigation,
      principal,
      scopedCapabilities,
      workspaces,
    };
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

function SessionQueryCacheBoundary({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  const queryClient = useQueryClient();
  useEffect(
    () =>
      registerSessionQueryCacheClearer(async () => {
        await queryClient.cancelQueries();
        queryClient.clear();
      }),
    [queryClient],
  );
  return children;
}

export function rootContainer(container: ReactNode): ReactNode {
  return createElement(
    ThemeProvider,
    null,
    createElement(SessionQueryCacheBoundary, null, container),
  );
}

export const request: RequestConfig = {
  errorConfig: {
    errorHandler(error) {
      const { status: responseStatus, url } = readRequestFailure(error);
      const apiError = normalizeApiError(error);
      const status = responseStatus ?? apiError.problem.status;
      if (status === 401 && !isAuthEndpoint(url)) {
        notifyRuntimeUnauthorized();
      }
      if (status === 403) {
        const requestId = apiError.requestId;
        history.replace(
          `${ROUTE_REGISTRY['access-denied'].path}${
            requestId ? `?requestId=${encodeURIComponent(requestId)}` : ''
          }`,
        );
      }
      throw apiError;
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
      await clearSessionQueryCache();
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
    navTheme: 'realDark',
    logo: false,
    title: false,
    siderWidth: 208,
    defaultCollapsed: false,
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
    menuItemRender: (item, defaultDom, menuProps) => {
      const content =
        typeof item.unreadCount === 'number' &&
        item.unreadCount > 0 &&
        menuProps.collapsed
          ? createElement(
              Badge,
              {
                'aria-label': `${item.unreadCount} 条未读消息`,
                dot: true,
                offset: [-2, 2],
              },
              defaultDom,
            )
          : defaultDom;
      const path = item.path;
      if (typeof path !== 'string') {
        return content;
      }

      return createElement(
        'a',
        {
          href: path,
          onClick: (event: MouseEvent<HTMLAnchorElement>) => {
            event.preventDefault();
            item.onClick();
            history.push(path);
          },
        },
        content,
      );
    },
    menuTextRender: (item, defaultText, menuProps) => {
      const unreadCount =
        typeof item.unreadCount === 'number' ? item.unreadCount : 0;
      if (item.prototypeBadge === undefined && unreadCount === 0) {
        return defaultText;
      }

      return createElement(
        'span',
        {
          style: {
            alignItems: 'center',
            display: 'flex',
            gap: 8,
            width: '100%',
          },
        },
        createElement('span', { style: { flex: 1 } }, defaultText),
        item.prototypeBadge
          ? createElement(
              Tag,
              {
                'aria-hidden': true,
                color: 'orange',
                style: { marginInlineEnd: 0 },
                variant: 'filled',
              },
              item.prototypeBadge,
            )
          : null,
        unreadCount > 0 && !menuProps.collapsed
          ? createElement(Badge, {
              'aria-label': `${unreadCount} 条未读消息`,
              count: unreadCount,
              overflowCount: 99,
              showZero: false,
            })
          : null,
      );
    },
    token: {
      header: { heightLayoutHeader: 52 },
      pageContainer: {
        paddingBlockPageContainerContent: 20,
        paddingInlinePageContainerContent: 24,
      },
    },
  };
}) satisfies RunTimeLayoutConfig;
