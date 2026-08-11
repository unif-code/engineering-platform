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
    display: 'inline-block',
    flexShrink: 0,
    borderRadius: token.borderRadiusLG,
    backgroundColor: BRAND_ORANGE,
  },
  defaultMark: {
    width: 26,
    height: 26,
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
