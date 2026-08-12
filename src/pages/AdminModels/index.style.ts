import { createStyles } from 'antd-style';

export const useStyles = createStyles(({ token }) => ({
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: token.margin,
  },
  code: {
    fontFamily: token.fontFamilyCode,
  },
  catalogNote: {
    display: 'block',
    marginTop: token.marginSM,
    fontSize: token.fontSizeSM,
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: token.marginSM,
  },
  usageGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: token.margin,
    alignItems: 'flex-start',
    '& > :first-child': {
      flex: '1.4 1 560px',
    },
    '& > :last-child': {
      flex: '1 1 320px',
    },
  },
  distributionColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: token.margin,
  },
  analysisCard: {
    borderColor: token.colorBorderSecondary,
  },
  chartFigure: {
    width: '100%',
    margin: 0,
  },
  evaluationJobs: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: token.margin,
    marginBottom: token.margin,
  },
  evaluationJob: {
    display: 'flex',
    flexDirection: 'column',
    gap: token.marginXXS,
    padding: token.padding,
    border: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadiusLG,
    background: token.colorBgContainer,
  },
  evaluationJobTitle: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: token.marginXS,
  },
  evaluationLatest: {
    marginTop: token.marginXXS,
    padding: `${token.paddingXXS}px ${token.paddingSM}px`,
    borderRadius: token.borderRadius,
    color: token.colorPrimary,
    background: token.colorPrimaryBg,
  },
}));
