import { ProConfigProvider } from '@ant-design/pro-components';
import { useAntdConfigSetter } from '@umijs/max';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useEffectEvent,
  useMemo,
  useState,
} from 'react';
import { THEME_MEDIA_QUERY } from '@/constants/theme';
import { createAntdThemeConfig, createProThemeConfig } from './config';
import {
  createThemeSnapshot,
  getInitialThemeSnapshot,
  persistThemeMode,
  syncDocumentTheme,
} from './model';
import type { ResolvedTheme, ThemeContextValue, ThemeMode } from './type';

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getCurrentSystemPreference(): boolean {
  try {
    return (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia(THEME_MEDIA_QUERY).matches
    );
  } catch {
    return false;
  }
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const setAntdConfig = useAntdConfigSetter();
  const [snapshot, setSnapshot] = useState(getInitialThemeSnapshot);

  const syncAntdThemeConfig = useEffectEvent((resolvedTheme: ResolvedTheme) => {
    setAntdConfig({
      theme: createAntdThemeConfig(resolvedTheme),
    });
  });

  const setMode = useCallback((mode: ThemeMode) => {
    persistThemeMode(mode);
    setSnapshot(
      createThemeSnapshot(
        mode === 'system' ? null : mode,
        mode === 'system' && getCurrentSystemPreference(),
      ),
    );
  }, []);

  useEffect(() => {
    syncDocumentTheme(snapshot.resolvedTheme);
    syncAntdThemeConfig(snapshot.resolvedTheme);
  }, [snapshot.resolvedTheme]);

  useEffect(() => {
    if (
      snapshot.mode !== 'system' ||
      typeof window === 'undefined' ||
      typeof window.matchMedia !== 'function'
    ) {
      return;
    }

    const mediaQueryList = window.matchMedia(THEME_MEDIA_QUERY);
    const reconcileSystemTheme = (prefersDark: boolean) => {
      setSnapshot((current) => {
        if (current.mode !== 'system') {
          return current;
        }

        const next = createThemeSnapshot(null, prefersDark);
        return current.resolvedTheme === next.resolvedTheme ? current : next;
      });
    };
    const handleChange = (event: MediaQueryListEvent) => {
      reconcileSystemTheme(event.matches);
    };
    mediaQueryList.addEventListener('change', handleChange);
    reconcileSystemTheme(mediaQueryList.matches);

    return () => {
      mediaQueryList.removeEventListener('change', handleChange);
    };
  }, [snapshot.mode]);

  const value = useMemo<ThemeContextValue>(
    () => ({ ...snapshot, setMode }),
    [setMode, snapshot],
  );
  const proThemeConfig = useMemo(
    () => createProThemeConfig(snapshot.resolvedTheme),
    [snapshot.resolvedTheme],
  );

  return (
    <ThemeContext.Provider value={value}>
      <ProConfigProvider {...proThemeConfig}>{children}</ProConfigProvider>
    </ThemeContext.Provider>
  );
}

export function usePlatformTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error('usePlatformTheme 必须在 ThemeProvider 内使用');
  }
  return value;
}
