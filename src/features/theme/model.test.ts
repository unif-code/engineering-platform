import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { THEME_STORAGE_KEY } from '@/constants/theme';
import {
  createThemeSnapshot,
  getInitialThemeSnapshot,
  persistThemeMode,
} from './model';

const setSystemPreference = (prefersDark: boolean) => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({ matches: prefersDark }),
  );
};

describe('theme model', () => {
  beforeEach(() => {
    window.localStorage.clear();
    delete window.__ENGINEERING_PLATFORM_THEME__;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it.each([
    {
      stored: null,
      prefersDark: false,
      expected: { mode: 'system', resolvedTheme: 'light' },
    },
    {
      stored: null,
      prefersDark: true,
      expected: { mode: 'system', resolvedTheme: 'dark' },
    },
    {
      stored: 'light',
      prefersDark: true,
      expected: { mode: 'light', resolvedTheme: 'light' },
    },
    {
      stored: 'dark',
      prefersDark: false,
      expected: { mode: 'dark', resolvedTheme: 'dark' },
    },
    {
      stored: 'invalid',
      prefersDark: true,
      expected: { mode: 'system', resolvedTheme: 'dark' },
    },
  ])('解析 $stored 与系统偏好', ({ stored, prefersDark, expected }) => {
    expect(createThemeSnapshot(stored, prefersDark)).toEqual(expected);
  });

  it('从浏览器存储和系统偏好读取初始主题', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    setSystemPreference(false);

    expect(getInitialThemeSnapshot()).toEqual({
      mode: 'dark',
      resolvedTheme: 'dark',
    });
  });

  it('优先复用首屏脚本写入的主题快照', () => {
    window.__ENGINEERING_PLATFORM_THEME__ = {
      mode: 'system',
      resolvedTheme: 'dark',
    };
    window.localStorage.setItem(THEME_STORAGE_KEY, 'light');
    setSystemPreference(false);

    expect(getInitialThemeSnapshot()).toEqual({
      mode: 'system',
      resolvedTheme: 'dark',
    });
  });

  it('读取浏览器存储失败时回退到 system/light 且不抛错', () => {
    setSystemPreference(true);
    vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });

    expect(() => getInitialThemeSnapshot()).not.toThrow();
    expect(getInitialThemeSnapshot()).toEqual({
      mode: 'system',
      resolvedTheme: 'light',
    });
  });

  it.each(['light', 'dark'] as const)('持久化手动 %s 模式', (mode) => {
    const setItem = vi.spyOn(window.localStorage, 'setItem');
    const removeItem = vi.spyOn(window.localStorage, 'removeItem');

    persistThemeMode(mode);

    expect(setItem).toHaveBeenCalledWith(THEME_STORAGE_KEY, mode);
    expect(removeItem).not.toHaveBeenCalled();
  });

  it('system 模式删除持久化值', () => {
    const setItem = vi.spyOn(window.localStorage, 'setItem');
    const removeItem = vi.spyOn(window.localStorage, 'removeItem');

    persistThemeMode('system');

    expect(removeItem).toHaveBeenCalledWith(THEME_STORAGE_KEY);
    expect(setItem).not.toHaveBeenCalled();
  });

  it.each([
    { mode: 'light' as const, method: 'setItem' as const },
    { mode: 'system' as const, method: 'removeItem' as const },
  ])('浏览器存储 $method 失败时不向上抛错', ({ mode, method }) => {
    vi.spyOn(window.localStorage, method).mockImplementation(() => {
      throw new Error('storage disabled');
    });

    expect(() => persistThemeMode(mode)).not.toThrow();
  });
});
