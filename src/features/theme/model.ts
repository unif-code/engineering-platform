import {
  DARK_LAYOUT_BACKGROUND,
  LIGHT_LAYOUT_BACKGROUND,
  THEME_MEDIA_QUERY,
  THEME_STORAGE_KEY,
} from '@/constants/theme';
import type { ResolvedTheme, ThemeMode, ThemeSnapshot } from './type';

const DEFAULT_THEME_SNAPSHOT: ThemeSnapshot = {
  mode: 'system',
  resolvedTheme: 'light',
};

export function createThemeSnapshot(
  stored: string | null,
  prefersDark: boolean,
): ThemeSnapshot {
  if (stored === 'light' || stored === 'dark') {
    return { mode: stored, resolvedTheme: stored };
  }

  return {
    mode: 'system',
    resolvedTheme: prefersDark ? 'dark' : 'light',
  };
}

export function getInitialThemeSnapshot(): ThemeSnapshot {
  if (typeof window === 'undefined') {
    return DEFAULT_THEME_SNAPSHOT;
  }

  if (window.__ENGINEERING_PLATFORM_THEME__) {
    return window.__ENGINEERING_PLATFORM_THEME__;
  }

  try {
    if (typeof window.matchMedia !== 'function') {
      return DEFAULT_THEME_SNAPSHOT;
    }

    return createThemeSnapshot(
      window.localStorage.getItem(THEME_STORAGE_KEY),
      window.matchMedia(THEME_MEDIA_QUERY).matches,
    );
  } catch {
    return DEFAULT_THEME_SNAPSHOT;
  }
}

export function persistThemeMode(mode: ThemeMode): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    if (mode === 'system') {
      window.localStorage.removeItem(THEME_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    // 隐私模式或禁用存储时仍允许当前会话切换主题。
  }
}

export function syncDocumentTheme(theme: ResolvedTheme): void {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.style.colorScheme = theme;
  document.documentElement.style.backgroundColor =
    theme === 'dark' ? DARK_LAYOUT_BACKGROUND : LIGHT_LAYOUT_BACKGROUND;
}
