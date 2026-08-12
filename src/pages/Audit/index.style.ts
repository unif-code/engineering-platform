import { createStyles } from 'antd-style';

export const useStyles = createStyles(({ token }) => ({
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: token.margin,
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: token.margin,
  },
  analysisGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: token.margin,
    alignItems: 'stretch',
  },
  card: {
    height: '100%',
    borderColor: token.colorBorderSecondary,
    boxShadow: token.boxShadowTertiary,
  },
  chartFigure: {
    width: '100%',
    margin: 0,
  },
  filter: {
    minWidth: 136,
  },
  actionFilter: {
    minWidth: 190,
  },
  search: {
    width: 280,
    maxWidth: '100%',
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
  resultList: {
    display: 'flex',
    flexDirection: 'column',
    gap: token.marginSM,
    margin: 0,
    padding: 0,
    listStyle: 'none',
  },
  resultItem: {
    display: 'flex',
    gap: token.marginSM,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resultLabel: {
    display: 'flex',
    gap: token.marginXS,
    alignItems: 'center',
  },
  resultValue: {
    color: token.colorText,
    fontWeight: token.fontWeightStrong,
  },
  note: {
    marginBlock: `${token.margin}px 0`,
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
    lineHeight: token.lineHeightSM,
  },
}));
