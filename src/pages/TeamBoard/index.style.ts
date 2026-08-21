import { createStyles } from 'antd-style';

export const useStyles = createStyles(({ token }) => ({
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: token.margin,
  },
  pageTitle: {
    margin: 0,
    color: token.colorText,
    fontSize: token.fontSizeHeading3,
    lineHeight: token.lineHeightHeading3,
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    margin: 0,
    color: token.colorText,
    fontSize: token.fontSizeLG,
    lineHeight: token.lineHeightLG,
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: token.margin,
    marginBlockStart: token.marginSM,
  },
  analysisGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: token.margin,

    [`@media (max-width: ${token.screenMD}px)`]: {
      gridTemplateColumns: 'minmax(0, 1fr)',
    },
  },
  rightStack: {
    display: 'flex',
    minWidth: 0,
    flexDirection: 'column',
    gap: token.margin,
  },
  card: {
    height: '100%',
    borderColor: token.colorBorderSecondary,
  },
}));
