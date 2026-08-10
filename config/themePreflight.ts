import {
  DARK_LAYOUT_BACKGROUND,
  LIGHT_LAYOUT_BACKGROUND,
  THEME_MEDIA_QUERY,
  THEME_STORAGE_KEY,
} from '../src/constants/theme';

export const themePreflightScript = `(() => {
  var mode = 'system';
  var resolvedTheme = 'light';

  try {
    if (typeof window.matchMedia !== 'function') {
      throw new Error('matchMedia unavailable');
    }

    var stored = window.localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
    var prefersDark = window.matchMedia(${JSON.stringify(THEME_MEDIA_QUERY)}).matches;

    if (stored === 'light' || stored === 'dark') {
      mode = stored;
      resolvedTheme = stored;
    } else {
      resolvedTheme = prefersDark ? 'dark' : 'light';
    }
  } catch (_error) {}

  window.__ENGINEERING_PLATFORM_THEME__ = { mode: mode, resolvedTheme: resolvedTheme };
  document.documentElement.style.colorScheme = resolvedTheme;
  document.documentElement.style.backgroundColor =
    resolvedTheme === 'dark'
      ? ${JSON.stringify(DARK_LAYOUT_BACKGROUND)}
      : ${JSON.stringify(LIGHT_LAYOUT_BACKGROUND)};
})();`;
