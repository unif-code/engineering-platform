import { createStyles } from 'antd-style';

export const useStyles = createStyles(({ token }) => ({
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: token.margin,
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: token.margin,
  },
  filter: {
    width: 120,
  },
  actionFilter: {
    width: 220,
  },
  search: {
    width: 200,
  },
  loadMore: {
    display: 'flex',
    justifyContent: 'center',
  },
  code: {
    color: token.colorTextSecondary,
    fontFamily: token.fontFamilyCode,
    fontSize: token.fontSizeSM,
  },
}));
