import { createStyles } from 'antd-style';

export const useStyles = createStyles(({ token }) => ({
  page: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) 460px',
    minHeight: '100vh',
    overflow: 'hidden',
    backgroundColor: token.colorBgLayout,
    color: token.colorText,

    [`@media (max-width: ${token.screenMD}px)`]: {
      gridTemplateColumns: 'minmax(0, 1fr)',
      overflow: 'auto',
    },
  },
  hero: {
    display: 'flex',
    minWidth: 0,
    flexDirection: 'column',
    justifyContent: 'center',
    padding: `clamp(${token.paddingXL * 2}px, 7vw, 88px)`,
    background: `linear-gradient(145deg, ${token.colorPrimaryBg} 0%, ${token.colorBgLayout} 52%, ${token.colorBgContainer} 100%)`,

    [`@media (max-width: ${token.screenMD}px)`]: {
      paddingBlock: token.paddingXL * 3,
      paddingInline: token.paddingXL * 2,
    },

    [`@media (max-width: ${token.screenSM}px)`]: {
      paddingBlock: token.paddingXL * 2,
      paddingInline: token.padding,
    },
  },
  brand: {
    alignSelf: 'flex-start',
    marginBottom: token.marginXL * 2,
  },
  eyebrow: {
    marginBlock: `0 ${token.marginLG}px`,
    color: token.colorPrimary,
    fontSize: token.fontSizeSM,
    fontWeight: token.fontWeightStrong,
    letterSpacing: '0.18em',
  },
  heroTitle: {
    maxWidth: 720,
    margin: 0,
    color: token.colorTextHeading,
    fontSize: 'clamp(36px, 4.2vw, 60px)',
    fontWeight: token.fontWeightStrong,
    letterSpacing: '-0.04em',
    lineHeight: 1.16,

    [`@media (max-width: ${token.screenSM}px)`]: {
      fontSize: 34,
    },
  },
  deliveryStages: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: token.marginSM,
    alignItems: 'center',
    marginTop: token.marginXL * 2,
  },
  stage: {
    paddingBlock: token.paddingXXS,
    paddingInline: token.paddingSM,
    border: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadiusLG,
    backgroundColor: token.colorBgContainer,
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
    lineHeight: token.lineHeightSM,

    '&:last-child': {
      borderColor: token.colorText,
      backgroundColor: token.colorText,
      color: token.colorBgContainer,
    },
  },
  meta: {
    marginTop: token.marginXL * 2,
    color: token.colorTextTertiary,
    fontSize: token.fontSizeSM,
  },
  formPane: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
    padding: token.paddingXL,
    borderInlineStart: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`,
    backgroundColor: token.colorBgContainer,

    [`@media (max-width: ${token.screenMD}px)`]: {
      minHeight: 560,
      borderBlockStart: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`,
      borderInlineStart: 0,
    },

    [`@media (max-width: ${token.screenSM}px)`]: {
      minHeight: 0,
      paddingBlock: token.paddingXL * 3,
      paddingInline: token.padding,
    },
  },
  themeAction: {
    position: 'absolute',
    top: token.paddingXL,
    right: token.paddingXL,

    [`@media (max-width: ${token.screenSM}px)`]: {
      top: token.padding,
      right: token.padding,
    },
  },
  formCard: {
    boxSizing: 'border-box',
    width: '100%',
    padding: token.paddingXL + token.paddingSM,
    border: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`,
    borderRadius: 14,
    backgroundColor: token.colorBgElevated,
    boxShadow: token.boxShadowSecondary,

    [`@media (max-width: ${token.screenSM}px)`]: {
      padding: token.paddingLG,
    },
  },
}));
