import { type ConfigProviderProps, theme } from 'antd';
import {
  ACTION_ORANGE,
  DARK_CONTAINER_BACKGROUND,
  DARK_LAYOUT_BACKGROUND,
  LIGHT_CONTAINER_BACKGROUND,
  LIGHT_LAYOUT_BACKGROUND,
} from '@/constants/theme';
import type { ResolvedTheme } from './type';

export function createAntdThemeConfig(
  resolvedTheme: ResolvedTheme,
): ConfigProviderProps['theme'] {
  return {
    algorithm: [
      resolvedTheme === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
    ],
    token: {
      colorPrimary: ACTION_ORANGE,
      colorBgLayout:
        resolvedTheme === 'dark'
          ? DARK_LAYOUT_BACKGROUND
          : LIGHT_LAYOUT_BACKGROUND,
      colorBgContainer:
        resolvedTheme === 'dark'
          ? DARK_CONTAINER_BACKGROUND
          : LIGHT_CONTAINER_BACKGROUND,
      borderRadius: 8,
    },
  };
}
