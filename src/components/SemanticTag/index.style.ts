import { createStyles } from 'antd-style';

export const useStyles = createStyles(({ token }) => ({
  tag: {
    marginInlineEnd: 0,
    fontWeight: token.fontWeightStrong,
  },
  neutral: {
    borderColor: token.colorBorderSecondary,
    backgroundColor: token.colorFillTertiary,
    color: token.colorTextSecondary,
  },
  brand: {
    borderColor: token.colorPrimaryBorder,
    backgroundColor: token.colorPrimaryBg,
    color: token.colorPrimary,
  },
  info: {
    borderColor: token.colorInfoBorder,
    backgroundColor: token.colorInfoBg,
    color: token.colorInfo,
  },
  success: {
    borderColor: token.colorSuccessBorder,
    backgroundColor: token.colorSuccessBg,
    color: token.colorSuccess,
  },
  warning: {
    borderColor: token.colorWarningBorder,
    backgroundColor: token.colorWarningBg,
    color: token.colorWarning,
  },
  danger: {
    borderColor: token.colorErrorBorder,
    backgroundColor: token.colorErrorBg,
    color: token.colorError,
  },
  purple: {
    borderColor: token.purple3,
    backgroundColor: token.purple1,
    color: token.purple7,
  },
  monospace: {
    fontFamily: token.fontFamilyCode,
  },
}));
