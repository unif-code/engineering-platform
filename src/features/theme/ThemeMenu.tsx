import {
  CheckOutlined,
  DesktopOutlined,
  MoonOutlined,
  SunOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import type { ThemeMode } from './type';

const THEME_OPTIONS = [
  { key: 'system' as const, label: '跟随系统' },
  { key: 'light' as const, label: '浅色' },
  { key: 'dark' as const, label: '深色' },
];

const themeIcon = (mode: ThemeMode) => {
  if (mode === 'light') {
    return <SunOutlined aria-hidden="true" />;
  }
  if (mode === 'dark') {
    return <MoonOutlined aria-hidden="true" />;
  }
  return <DesktopOutlined aria-hidden="true" />;
};

export const getThemeMenuKey = (mode: ThemeMode) => `theme:${mode}`;

export function getThemeModeFromMenuKey(key: string): ThemeMode | null {
  const mode = key.startsWith('theme:') ? key.slice('theme:'.length) : '';
  return mode === 'system' || mode === 'light' || mode === 'dark' ? mode : null;
}

export const createThemeMenuItems = (
  mode: ThemeMode,
): NonNullable<MenuProps['items']> => [
  {
    children: THEME_OPTIONS.map((option) => ({
      extra:
        option.key === mode ? <CheckOutlined aria-hidden="true" /> : undefined,
      icon: themeIcon(option.key),
      key: getThemeMenuKey(option.key),
      label: option.label,
    })),
    label: '主题',
    type: 'group',
  },
];
