import { createStyles } from 'antd-style';

export const useStyles = createStyles(({ token }) => ({
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: token.margin,
  },
  filter: {
    minWidth: 190,
  },
  principal: {
    display: 'flex',
    flexDirection: 'column',
    gap: token.marginXXS,
  },
  secondary: {
    color: token.colorTextSecondary,
    fontFamily: token.fontFamilyCode,
    fontSize: token.fontSizeSM,
  },
  code: {
    fontFamily: token.fontFamilyCode,
  },
}));
