// @vitest-environment-options {"settings":{"enableJavaScriptEvaluation":true,"suppressInsecureJavaScriptEnvironmentWarning":true}}
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DARK_LAYOUT_BACKGROUND,
  LIGHT_LAYOUT_BACKGROUND,
  THEME_STORAGE_KEY,
} from '@/constants/theme';
import { themePreflightScript } from '../../../config/themePreflight';

const executePreflight = () => {
  const script = document.createElement('script');
  script.textContent = themePreflightScript;
  document.head.append(script);
  script.remove();
};

const runPreflight = (stored: string | null, prefersDark: boolean) => {
  window.localStorage.clear();
  if (stored !== null) {
    window.localStorage.setItem(THEME_STORAGE_KEY, stored);
  }
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({ matches: prefersDark }),
  );

  executePreflight();
};

describe('theme preflight', () => {
  beforeEach(() => {
    delete window.__ENGINEERING_PLATFORM_THEME__;
    document.documentElement.style.colorScheme = '';
    document.documentElement.style.backgroundColor = '';
  });

  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it.each([
    {
      stored: null,
      prefersDark: false,
      expected: { mode: 'system', resolvedTheme: 'light' },
      background: LIGHT_LAYOUT_BACKGROUND,
    },
    {
      stored: null,
      prefersDark: true,
      expected: { mode: 'system', resolvedTheme: 'dark' },
      background: DARK_LAYOUT_BACKGROUND,
    },
    {
      stored: 'light',
      prefersDark: true,
      expected: { mode: 'light', resolvedTheme: 'light' },
      background: LIGHT_LAYOUT_BACKGROUND,
    },
    {
      stored: 'dark',
      prefersDark: false,
      expected: { mode: 'dark', resolvedTheme: 'dark' },
      background: DARK_LAYOUT_BACKGROUND,
    },
    {
      stored: 'invalid',
      prefersDark: true,
      expected: { mode: 'system', resolvedTheme: 'dark' },
      background: DARK_LAYOUT_BACKGROUND,
    },
  ])(
    '在 React 启动前同步 $stored 对应的主题',
    ({ stored, prefersDark, expected, background }) => {
      runPreflight(stored, prefersDark);

      expect(window.__ENGINEERING_PLATFORM_THEME__).toEqual(expected);
      expect(document.documentElement.style.colorScheme).toBe(
        expected.resolvedTheme,
      );
      expect(document.documentElement.style.backgroundColor).toBe(background);
    },
  );

  it('读取浏览器偏好失败时安全回退到 system/light', () => {
    vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });
    vi.stubGlobal('matchMedia', undefined);

    expect(executePreflight).not.toThrow();
    expect(window.__ENGINEERING_PLATFORM_THEME__).toEqual({
      mode: 'system',
      resolvedTheme: 'light',
    });
    expect(document.documentElement.style.colorScheme).toBe('light');
    expect(document.documentElement.style.backgroundColor).toBe(
      LIGHT_LAYOUT_BACKGROUND,
    );
  });
});
