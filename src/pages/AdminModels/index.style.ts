import { createStyles } from 'antd-style';

export const useStyles = createStyles(({ token }) => ({
  page: {
    display: 'flex',
    minWidth: 0,
    flexDirection: 'column',
    gap: token.margin,
  },
  tabsCard: {
    borderColor: token.colorBorderSecondary,
    boxShadow: token.boxShadowTertiary,
  },
  tabPanel: {
    minWidth: 0,
  },
  filter: {
    minWidth: 136,
  },
  search: {
    width: 300,
    maxWidth: '100%',
  },
  modelName: {
    display: 'flex',
    flexDirection: 'column',
    gap: token.marginXXS,
  },
  modelId: {
    color: token.colorTextSecondary,
    fontFamily: token.fontFamilyCode,
    fontSize: token.fontSizeSM,
  },
  contextWindow: {
    fontFamily: token.fontFamilyCode,
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: token.margin,

    [`@media (max-width: ${token.screenXL}px)`]: {
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    },

    [`@media (max-width: ${token.screenSM}px)`]: {
      gridTemplateColumns: 'minmax(0, 1fr)',
    },
  },
  analysisGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: token.margin,
    alignItems: 'stretch',

    [`@media (max-width: ${token.screenLG}px)`]: {
      gridTemplateColumns: 'minmax(0, 1fr)',
    },
  },
  analysisCard: {
    height: '100%',
    borderColor: token.colorBorderSecondary,
    boxShadow: token.boxShadowTertiary,
  },
}));
