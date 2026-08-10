import { createStyles } from 'antd-style';
import { BRAND_ORANGE } from '@/constants/theme';

export const useStyles = createStyles(({ token }) => ({
  root: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: token.marginSM,
    minWidth: 0,
    color: token.colorText,
  },
  collapsed: {
    justifyContent: 'center',
  },
  mark: {
    display: 'inline-flex',
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: token.borderRadiusLG,
    backgroundColor: BRAND_ORANGE,
    color: token.colorWhite,
    fontWeight: token.fontWeightStrong,
    letterSpacing: '-0.02em',
  },
  defaultMark: {
    width: 32,
    height: 32,
    fontSize: token.fontSize,
  },
  smallMark: {
    width: 28,
    height: 28,
    fontSize: token.fontSizeSM,
  },
  name: {
    overflow: 'hidden',
    fontSize: token.fontSizeLG,
    fontWeight: token.fontWeightStrong,
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
}));
