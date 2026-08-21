import { createStyles } from 'antd-style';

export const useStyles = createStyles(({ token }) => ({
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: token.margin,
  },
  workbenchHeader: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: token.margin,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  workbenchHeading: {
    display: 'flex',
    minWidth: 0,
    flexDirection: 'column',
    gap: token.marginXXS,
  },
  greeting: {
    margin: 0,
    color: token.colorText,
    fontSize: token.fontSizeHeading3,
    lineHeight: token.lineHeightHeading3,
  },
  intro: {
    margin: 0,
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
  },
  sectionTitle: {
    margin: 0,
    color: token.colorText,
    fontSize: token.fontSizeLG,
    lineHeight: token.lineHeightLG,
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: token.margin,
    marginBlockStart: token.marginSM,
  },
  contentGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: token.margin,
    alignItems: 'start',
  },
  column: {
    display: 'flex',
    flex: '1 1 320px',
    minWidth: 0,
    flexDirection: 'column',
    gap: token.margin,
  },
  card: {
    borderColor: token.colorBorderSecondary,
  },
}));
