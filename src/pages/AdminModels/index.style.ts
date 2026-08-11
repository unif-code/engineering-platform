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
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: token.margin,
  },
  analysisGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: token.margin,
    alignItems: 'stretch',
  },
  analysisCard: {
    height: '100%',
    borderColor: token.colorBorderSecondary,
    boxShadow: token.boxShadowTertiary,
  },
}));
