import { createStyles } from 'antd-style';
import { BRAND_ORANGE, LIGHT_AUTH_BACKGROUND } from '@/constants/theme';

interface LoginStyleProps {
  isLightTheme: boolean;
}

export const useLoginStyles = createStyles(
  ({ token }, { isLightTheme }: LoginStyleProps) => ({
    page: {
      position: 'relative',
      display: 'flex',
      minHeight: '100vh',
      backgroundColor: isLightTheme
        ? LIGHT_AUTH_BACKGROUND
        : token.colorBgLayout,
      color: token.colorText,
    },
    header: {
      position: 'absolute',
      top: 0,
      right: 0,
      left: 0,
      zIndex: 2,
      display: 'flex',
      height: 56,
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingInline: 44,
    },
    headerActions: {
      display: 'flex',
      alignItems: 'center',
      gap: token.marginXS,
    },
    version: {
      color: token.colorTextTertiary,
      fontSize: token.fontSizeSM,
    },
    hero: {
      position: 'relative',
      display: 'flex',
      flex: 1,
      flexDirection: 'column',
      justifyContent: 'center',
      paddingBlock: token.paddingXL * 3,
      paddingInlineStart: 88,
      paddingInlineEnd: 48,
    },
    eyebrow: {
      marginBlock: `0 ${token.marginLG}px`,
      color: BRAND_ORANGE,
      fontSize: token.fontSizeSM,
      fontWeight: token.fontWeightStrong,
      letterSpacing: '0.3em',
    },
    heroTitle: {
      maxWidth: 720,
      margin: 0,
      color: token.colorTextHeading,
      fontSize: 50,
      fontWeight: 800,
      letterSpacing: '-0.035em',
      lineHeight: 1.28,
    },
    heroAccent: {
      color: BRAND_ORANGE,
    },
    deliveryStages: {
      display: 'flex',
      gap: token.marginXS,
      alignItems: 'center',
      marginBlock: `${token.marginXL + token.marginXS}px 0`,
      padding: 0,
      listStyle: 'none',
    },
    stageItem: {
      display: 'flex',
      alignItems: 'center',
      gap: token.marginXS,
    },
    stage: {
      paddingBlock: token.paddingXXS,
      paddingInline: token.paddingSM,
      border: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`,
      borderRadius: 14,
      backgroundColor: token.colorBgContainer,
      color: token.colorTextSecondary,
      fontSize: token.fontSizeSM,
      whiteSpace: 'nowrap',
    },
    terminalStage: {
      borderColor: token.colorText,
      backgroundColor: token.colorText,
      color: token.colorBgContainer,
    },
    stageArrow: {
      color: BRAND_ORANGE,
      fontSize: token.fontSizeSM,
    },
    meta: {
      position: 'absolute',
      bottom: 22,
      left: 88,
      color: token.colorTextQuaternary,
      fontSize: token.fontSizeSM,
    },
    formPane: {
      display: 'flex',
      flex: '0 0 548px',
      alignItems: 'center',
    },
    formCard: {
      boxSizing: 'border-box',
      width: 460,
      padding: 32,
      border: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`,
      borderRadius: 14,
      backgroundColor: token.colorBgElevated,
      boxShadow: token.boxShadowSecondary,
    },
  }),
);

export const useLoginStepStyles = createStyles(({ token }) => ({
  stepHeader: {
    marginBottom: token.marginLG,
  },
  stepTitle: {
    margin: 0,
    color: token.colorTextHeading,
    fontSize: token.fontSizeLG,
    fontWeight: token.fontWeightStrong,
    lineHeight: token.lineHeightLG,
  },
  stepDescription: {
    marginBlock: `${token.marginXXS}px 0`,
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
    lineHeight: token.lineHeightSM,
  },
}));
