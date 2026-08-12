import { createStyles } from 'antd-style';
import { BRAND_ORANGE } from '@/constants/theme';

export const useStyles = createStyles(({ token }) => ({
  root: {
    display: 'inline-flex',
    alignItems: 'center',
    minWidth: 0,
    color: token.colorText,
  },
  defaultRoot: {
    gap: 10,
  },
  smallRoot: {
    gap: 9,
  },
  collapsed: {
    justifyContent: 'center',
  },
  mark: {
    display: 'block',
    flexShrink: 0,
    color: BRAND_ORANGE,
  },
  defaultMark: {
    width: 32,
    height: 32,
  },
  smallMark: {
    width: 24,
    height: 24,
  },
  name: {
    overflow: 'hidden',
    fontWeight: token.fontWeightStrong,
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  defaultName: {
    fontSize: 15,
  },
  smallName: {
    fontSize: token.fontSize,
  },
}));
