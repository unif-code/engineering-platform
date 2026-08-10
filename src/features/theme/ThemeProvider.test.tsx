import { ProProvider } from '@ant-design/pro-components';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { theme } from 'antd';
import { type PropsWithChildren, useContext } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { THEME_MEDIA_QUERY, THEME_STORAGE_KEY } from '@/constants/theme';
import { createAntdThemeConfig } from './config';
import { ThemeProvider, usePlatformTheme } from './ThemeProvider';
import { ThemeSelector } from './ThemeSelector';

const mocks = vi.hoisted(() => ({
  getAntdConfigSetter: vi.fn(),
  setAntdConfig: vi.fn(),
}));

vi.mock('@umijs/max', () => ({
  useAntdConfigSetter: () => mocks.getAntdConfigSetter(),
}));

interface MatchMediaController {
  addEventListener: ReturnType<typeof vi.fn>;
  emit: (matches: boolean) => void;
  removeEventListener: ReturnType<typeof vi.fn>;
}

function installMatchMedia(initialMatches: boolean): MatchMediaController {
  let matches = initialMatches;
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const addEventListener = vi.fn(
    (_type: string, listener: (event: MediaQueryListEvent) => void) => {
      listeners.add(listener);
    },
  );
  const removeEventListener = vi.fn(
    (_type: string, listener: (event: MediaQueryListEvent) => void) => {
      listeners.delete(listener);
    },
  );
  const mediaQueryList = {
    get matches() {
      return matches;
    },
    media: THEME_MEDIA_QUERY,
    onchange: null,
    addEventListener,
    removeEventListener,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  } as unknown as MediaQueryList;

  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation(() => mediaQueryList),
  );

  return {
    addEventListener,
    removeEventListener,
    emit(nextMatches) {
      matches = nextMatches;
      const event = {
        matches: nextMatches,
        media: THEME_MEDIA_QUERY,
      } as MediaQueryListEvent;
      for (const listener of listeners) {
        listener(event);
      }
    },
  };
}

function ThemeProbe() {
  const { mode, resolvedTheme, setMode } = usePlatformTheme();

  return (
    <div>
      <output aria-label="当前主题">{`${mode}/${resolvedTheme}`}</output>
      <button type="button" onClick={() => setMode('light')}>
        设为浅色
      </button>
      <button type="button" onClick={() => setMode('dark')}>
        设为深色
      </button>
      <button type="button" onClick={() => setMode('system')}>
        设为系统
      </button>
    </div>
  );
}

function ProThemeProbe() {
  const { dark } = useContext(ProProvider);

  return <output aria-label="ProComponents 暗色状态">{String(dark)}</output>;
}

function TestThemeProvider({ children }: PropsWithChildren) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

beforeEach(() => {
  mocks.getAntdConfigSetter.mockReset();
  mocks.setAntdConfig.mockReset();
  mocks.getAntdConfigSetter.mockReturnValue(mocks.setAntdConfig);
  window.localStorage.clear();
  delete window.__ENGINEERING_PLATFORM_THEME__;
  document.documentElement.style.colorScheme = '';
  document.documentElement.style.backgroundColor = '';
  vi.unstubAllGlobals();
});

describe('createAntdThemeConfig', () => {
  it.each([
    { resolvedTheme: 'light' as const, algorithm: theme.defaultAlgorithm },
    { resolvedTheme: 'dark' as const, algorithm: theme.darkAlgorithm },
  ])('为 $resolvedTheme 生成单一算法和平台 token', ({
    resolvedTheme,
    algorithm,
  }) => {
    expect(createAntdThemeConfig(resolvedTheme)).toEqual({
      algorithm: [algorithm],
      token: {
        colorPrimary: '#C25700',
        colorBgLayout: resolvedTheme === 'dark' ? '#121212' : '#F5F5F5',
        colorBgContainer: resolvedTheme === 'dark' ? '#1F1F1F' : '#FFFFFF',
        borderRadius: 8,
      },
    });
  });
});

describe('ThemeProvider', () => {
  it('bootstrap 为 system/light 但订阅时系统已是暗色时立即收敛', async () => {
    window.__ENGINEERING_PLATFORM_THEME__ = {
      mode: 'system',
      resolvedTheme: 'light',
    };
    installMatchMedia(true);

    render(<ThemeProbe />, { wrapper: TestThemeProvider });

    await waitFor(() =>
      expect(screen.getByLabelText('当前主题')).toHaveTextContent(
        'system/dark',
      ),
    );
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('system 模式随系统偏好变化并同步文档主题', async () => {
    const media = installMatchMedia(false);
    render(<ThemeProbe />, { wrapper: TestThemeProvider });

    expect(screen.getByLabelText('当前主题')).toHaveTextContent('system/light');
    expect(document.documentElement.style.colorScheme).toBe('light');

    act(() => media.emit(true));

    expect(screen.getByLabelText('当前主题')).toHaveTextContent('system/dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
    await waitFor(() => expect(mocks.setAntdConfig).toHaveBeenCalled());
  });

  it('手动 light 模式忽略后续系统变化并持久化选择', () => {
    const media = installMatchMedia(true);
    render(<ThemeProbe />, { wrapper: TestThemeProvider });

    fireEvent.click(screen.getByRole('button', { name: '设为浅色' }));

    expect(screen.getByLabelText('当前主题')).toHaveTextContent('light/light');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');

    act(() => media.emit(false));
    act(() => media.emit(true));

    expect(screen.getByLabelText('当前主题')).toHaveTextContent('light/light');
  });

  it('已排队的 system 事件不覆盖最新手动选择', () => {
    const media = installMatchMedia(false);
    render(<ThemeProbe />, { wrapper: TestThemeProvider });
    const queuedListener = media.addEventListener.mock.calls[0]?.[1] as (
      event: MediaQueryListEvent,
    ) => void;

    fireEvent.click(screen.getByRole('button', { name: '设为浅色' }));
    act(() =>
      queuedListener({
        matches: true,
        media: THEME_MEDIA_QUERY,
      } as MediaQueryListEvent),
    );

    expect(screen.getByLabelText('当前主题')).toHaveTextContent('light/light');
  });

  it('切回 system 删除持久化值并立即解析当前系统偏好', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'light');
    installMatchMedia(true);
    render(<ThemeProbe />, { wrapper: TestThemeProvider });

    expect(screen.getByLabelText('当前主题')).toHaveTextContent('light/light');

    fireEvent.click(screen.getByRole('button', { name: '设为系统' }));

    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
    expect(screen.getByLabelText('当前主题')).toHaveTextContent('system/dark');
  });

  it('卸载时移除 system 媒体查询 listener', () => {
    const media = installMatchMedia(false);
    const { unmount } = render(<ThemeProbe />, {
      wrapper: TestThemeProvider,
    });
    const listener = media.addEventListener.mock.calls[0]?.[1];

    unmount();

    expect(media.removeEventListener).toHaveBeenCalledWith('change', listener);
  });

  it('setter identity 变化但主题未变时不重复同步配置', async () => {
    installMatchMedia(false);
    mocks.getAntdConfigSetter.mockImplementation(
      () => (config: unknown) => mocks.setAntdConfig(config),
    );
    const { rerender } = render(
      <ThemeProvider>
        <span>首次渲染</span>
      </ThemeProvider>,
    );
    await waitFor(() => expect(mocks.setAntdConfig).toHaveBeenCalledOnce());

    rerender(
      <ThemeProvider>
        <span>父级重渲染</span>
      </ThemeProvider>,
    );

    expect(mocks.setAntdConfig).toHaveBeenCalledOnce();
  });

  it('把 system、light、dark 的同一解析结果投影到 ProProvider.dark', () => {
    const media = installMatchMedia(false);
    render(
      <ThemeProvider>
        <ThemeProbe />
        <ProThemeProbe />
      </ThemeProvider>,
    );

    expect(screen.getByLabelText('ProComponents 暗色状态')).toHaveTextContent(
      'false',
    );

    act(() => media.emit(true));
    expect(screen.getByLabelText('ProComponents 暗色状态')).toHaveTextContent(
      'true',
    );

    fireEvent.click(screen.getByRole('button', { name: '设为浅色' }));
    expect(screen.getByLabelText('ProComponents 暗色状态')).toHaveTextContent(
      'false',
    );

    fireEvent.click(screen.getByRole('button', { name: '设为深色' }));
    expect(screen.getByLabelText('ProComponents 暗色状态')).toHaveTextContent(
      'true',
    );

    fireEvent.click(screen.getByRole('button', { name: '设为系统' }));
    expect(screen.getByLabelText('ProComponents 暗色状态')).toHaveTextContent(
      'true',
    );
  });
});

describe('ThemeSelector', () => {
  it.each([
    { label: '跟随系统', mode: 'system' as const, stored: 'dark' },
    { label: '浅色', mode: 'light' as const, stored: 'dark' },
    { label: '深色', mode: 'dark' as const, stored: 'light' },
  ])('通过主题菜单选择 $label 并标记当前项', async ({
    label,
    mode,
    stored,
  }) => {
    window.localStorage.setItem(THEME_STORAGE_KEY, stored);
    installMatchMedia(false);
    render(
      <ThemeProvider>
        <ThemeSelector />
        <ThemeProbe />
      </ThemeProvider>,
    );

    const trigger = screen.getByRole('button', { name: '主题设置' });
    fireEvent.click(trigger);
    fireEvent.click(await screen.findByRole('menuitem', { name: label }));

    expect(screen.getByLabelText('当前主题')).toHaveTextContent(
      new RegExp(`^${mode}/`),
    );

    fireEvent.click(trigger);
    const selectedItem = await screen.findByRole('menuitem', { name: label });
    expect(selectedItem).toHaveClass('ant-dropdown-menu-item-selected');
  });
});
