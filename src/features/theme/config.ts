import { type ConfigProviderProps, theme } from 'antd';
import {
  BRAND_ORANGE,
  BRAND_ORANGE_ACTIVE,
  BRAND_ORANGE_HOVER,
  DARK_CONTAINER_BACKGROUND,
  DARK_LAYOUT_BACKGROUND,
  LIGHT_CONTAINER_BACKGROUND,
  LIGHT_LAYOUT_BACKGROUND,
} from '@/constants/theme';
import type { ResolvedTheme } from './type';

export function createAntdThemeConfig(
  resolvedTheme: ResolvedTheme,
): ConfigProviderProps['theme'] {
  const dark = resolvedTheme === 'dark';
  const subtleOrange = dark ? '#2A1B10' : '#FFF7F0';
  const selectedOrange = dark ? '#3A2413' : '#FFF1E6';
  const border = dark ? '#424242' : '#D9D9D9';
  const secondaryBorder = dark ? '#303030' : '#F0F0F0';

  return {
    algorithm: [dark ? theme.darkAlgorithm : theme.defaultAlgorithm],
    components: {
      Button: {
        defaultActiveBorderColor: BRAND_ORANGE_ACTIVE,
        defaultActiveColor: BRAND_ORANGE_ACTIVE,
        defaultHoverBorderColor: BRAND_ORANGE,
        defaultHoverColor: BRAND_ORANGE,
        primaryColor: '#FFFFFF',
        primaryShadow: 'none',
      },
      Input: {
        activeBorderColor: BRAND_ORANGE,
        activeShadow: '0 0 0 2px rgba(235, 110, 0, 0.12)',
        hoverBorderColor: BRAND_ORANGE,
      },
      Pagination: {
        itemActiveBg: subtleOrange,
        itemActiveColor: BRAND_ORANGE,
        itemActiveColorHover: BRAND_ORANGE_HOVER,
        itemSizeSM: 24,
      },
      Select: {
        activeBorderColor: BRAND_ORANGE,
        activeOutlineColor: 'rgba(235, 110, 0, 0.12)',
        hoverBorderColor: BRAND_ORANGE,
        optionActiveBg: subtleOrange,
        optionSelectedBg: selectedOrange,
        optionSelectedColor: BRAND_ORANGE,
      },
      Table: {
        borderColor: secondaryBorder,
        cellFontSizeSM: 13,
        cellPaddingBlockSM: 8,
        cellPaddingInlineSM: 12,
        headerBg: dark ? DARK_CONTAINER_BACKGROUND : '#FAFAFA',
        headerColor: dark ? 'rgba(255,255,255,.65)' : 'rgba(0,0,0,.65)',
        headerSplitColor: secondaryBorder,
        rowHoverBg: subtleOrange,
        rowSelectedBg: selectedOrange,
        rowSelectedHoverBg: dark ? '#4A2D16' : '#FFE8D6',
      },
    },
    token: {
      colorBorder: border,
      colorBorderSecondary: secondaryBorder,
      colorBgLayout: dark ? DARK_LAYOUT_BACKGROUND : LIGHT_LAYOUT_BACKGROUND,
      colorBgContainer: dark
        ? DARK_CONTAINER_BACKGROUND
        : LIGHT_CONTAINER_BACKGROUND,
      colorInfo: BRAND_ORANGE,
      colorLink: BRAND_ORANGE,
      colorLinkHover: BRAND_ORANGE_HOVER,
      colorPrimary: BRAND_ORANGE,
      colorText: dark ? 'rgba(255,255,255,.88)' : '#191919',
      colorTextSecondary: dark ? 'rgba(255,255,255,.65)' : 'rgba(0,0,0,.65)',
      borderRadius: 8,
    },
  };
}

export function createProThemeConfig(resolvedTheme: ResolvedTheme) {
  const dark = resolvedTheme === 'dark';

  return {
    dark,
    token: {
      layout: {
        sider: {
          colorBgCollapsedButton: dark ? '#262626' : '#FFFFFF',
          colorBgMenuItemActive: dark ? 'rgba(255,255,255,.08)' : '#FFF7F0',
          colorBgMenuItemHover: dark ? 'rgba(255,255,255,.08)' : '#FFF7F0',
          colorBgMenuItemSelected: dark ? BRAND_ORANGE : '#FFF7F0',
          colorMenuBackground: dark ? '#191919' : '#FFFFFF',
          colorMenuItemDivider: dark ? 'rgba(255,255,255,.08)' : '#EBEBEB',
          colorTextCollapsedButton: dark
            ? 'rgba(255,255,255,.65)'
            : 'rgba(0,0,0,.45)',
          colorTextCollapsedButtonHover: dark ? '#FFFFFF' : BRAND_ORANGE,
          colorTextMenu: dark ? 'rgba(255,255,255,.65)' : 'rgba(0,0,0,.7)',
          colorTextMenuActive: dark ? '#FFFFFF' : BRAND_ORANGE,
          colorTextMenuItemHover: dark ? '#FFFFFF' : BRAND_ORANGE,
          colorTextMenuSecondary: dark
            ? 'rgba(255,255,255,.3)'
            : 'rgba(0,0,0,.35)',
          colorTextMenuSelected: dark ? '#FFFFFF' : BRAND_ORANGE,
          colorTextMenuTitle: dark ? '#FFFFFF' : '#191919',
          colorTextSubMenuSelected: dark ? '#FFFFFF' : BRAND_ORANGE,
        },
      },
    },
  };
}
