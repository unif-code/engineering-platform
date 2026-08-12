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
  analysisGrid: {
    display: 'grid',
    gridTemplateColumns: '1.2fr 1fr 1fr',
    gap: token.margin,
    alignItems: 'stretch',
  },
  card: {
    height: '100%',
    borderColor: token.colorBorderSecondary,
  },
  chartFigure: {
    width: '100%',
    margin: 0,
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
