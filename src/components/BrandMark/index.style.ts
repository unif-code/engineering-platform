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
    display: 'inline-block',
    flexShrink: 0,
    borderRadius: token.borderRadiusLG,
    backgroundColor: BRAND_ORANGE,
  },
  defaultMark: {
    width: 32,
    height: 32,
  },
  smallMark: {
    width: 28,
    height: 28,
  },
  name: {
    overflow: 'hidden',
    fontSize: token.fontSizeLG,
    fontWeight: token.fontWeightStrong,
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
}));
