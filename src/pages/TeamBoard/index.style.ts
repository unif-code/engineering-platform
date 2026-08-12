import { createStyles } from 'antd-style';

export const useStyles = createStyles(({ token }) => ({
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: token.margin,
  },
  card: {
    height: '100%',
    borderColor: token.colorBorderSecondary,
    boxShadow: token.boxShadowTertiary,
  },
  selectorHeader: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: token.margin,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  teamName: {
    margin: 0,
    color: token.colorText,
    fontSize: token.fontSizeHeading3,
    lineHeight: token.lineHeightHeading3,
  },
  teamSummary: {
    marginBlock: `${token.marginXXS}px 0`,
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
    lineHeight: token.lineHeightSM,
  },
  teamSelector: {
    flex: '1 1 360px',
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
  chartFigure: {
    width: '100%',
    margin: 0,
  },
  list: {
    margin: 0,
    padding: 0,
    listStyle: 'none',
  },
  memberItem: {
    paddingBlock: token.paddingSM,
    borderBlockEnd: `${token.lineWidth}px ${token.lineType} ${token.colorSplit}`,

    '&:first-child': {
      paddingBlockStart: 0,
    },

    '&:last-child': {
      paddingBlockEnd: 0,
      borderBlockEnd: 0,
    },
  },
  memberHeader: {
    display: 'flex',
    gap: token.marginSM,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: token.marginXS,
  },
  memberIdentity: {
    display: 'flex',
    minWidth: 0,
    flexDirection: 'column',
  },
  memberRole: {
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
    lineHeight: token.lineHeightSM,
  },
  loadValue: {
    flexShrink: 0,
    color: token.colorText,
  },
  blockerItem: {
    borderBlockEnd: `${token.lineWidth}px ${token.lineType} ${token.colorSplit}`,

    '&:first-child': {
      paddingBlockStart: 0,
    },

    '&:last-child': {
      paddingBlockEnd: 0,
      borderBlockEnd: 0,
    },
  },
  blockerButton: {
    height: 'auto',
    paddingBlock: token.paddingSM,
    paddingInline: 0,
    textAlign: 'start',
    whiteSpace: 'normal',
  },
  blockerHeader: {
    display: 'flex',
    gap: token.marginSM,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  blockerDescription: {
    marginBlock: `${token.marginXXS}px 0`,
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
    lineHeight: token.lineHeightSM,
  },
}));
