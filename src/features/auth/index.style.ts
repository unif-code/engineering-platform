import { createStyles } from 'antd-style';

export const useBootstrapStyles = createStyles(({ token }) => ({
  eyebrow: {
    marginBlock: 0,
    color: token.colorPrimary,
    fontSize: token.fontSizeSM,
    fontWeight: token.fontWeightStrong,
    letterSpacing: '0.12em',
  },
  title: {
    marginBlock: `${token.marginXS}px ${token.marginXL}px`,
    color: token.colorTextHeading,
    fontSize: token.fontSizeHeading2,
    lineHeight: token.lineHeightHeading2,
  },
  steps: {
    marginBottom: token.marginXL,
  },
  content: {
    maxWidth: 520,
    marginInline: 'auto',
  },
  heading: {
    marginBlock: `0 ${token.marginXS}px`,
    color: token.colorTextHeading,
    fontSize: token.fontSizeHeading3,
    lineHeight: token.lineHeightHeading3,
  },
  description: {
    marginBlock: `0 ${token.marginLG}px`,
    color: token.colorTextSecondary,
    lineHeight: token.lineHeight,
  },
  alert: {
    marginBottom: token.marginLG,
    paddingBlock: token.paddingSM,
    paddingInline: token.padding,
    border: `${token.lineWidth}px ${token.lineType} ${token.colorErrorBorder}`,
    borderRadius: token.borderRadius,
    backgroundColor: token.colorErrorBg,
    color: token.colorErrorText,
    lineHeight: token.lineHeight,
  },
  qrRegion: {
    display: 'grid',
    justifyItems: 'center',
    gap: token.margin,
    marginBottom: token.marginLG,
    padding: token.paddingLG,
    border: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadiusLG,
    backgroundColor: token.colorBgContainer,
  },
  secretLabel: {
    margin: 0,
    color: token.colorTextSecondary,
    textAlign: 'center',
  },
  secret: {
    display: 'block',
    marginTop: token.marginXXS,
    color: token.colorText,
    fontFamily: token.fontFamilyCode,
    overflowWrap: 'anywhere',
  },
  complete: {
    paddingBlock: token.paddingXL,
    textAlign: 'center',
  },
}));
