import { createStyles } from 'antd-style';

export const useStyles = createStyles(({ token }) => ({
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: token.margin,
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: token.margin,

    [`@media (max-width: ${token.screenXL}px)`]: {
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    },
  },
  analysisGrid: {
    display: 'grid',
    gridTemplateColumns: '1.2fr 1fr 1fr',
    gap: token.margin,
    alignItems: 'stretch',

    [`@media (max-width: ${token.screenLG}px)`]: {
      gridTemplateColumns: 'minmax(0, 1fr)',
    },
  },
  card: {
    height: '100%',
    borderColor: token.colorBorderSecondary,
    boxShadow: token.boxShadowTertiary,
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
