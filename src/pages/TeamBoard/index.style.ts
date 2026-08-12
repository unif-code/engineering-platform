import { createStyles } from 'antd-style';

export const useStyles = createStyles(({ token }) => ({
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: token.margin,
  },
  toolbar: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: token.marginSM,
  },
  teamSelector: {
    flex: 'none',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: token.margin,
  },
  analysisGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: token.margin,
    alignItems: 'stretch',
  },
  rightStack: {
    display: 'flex',
    flexDirection: 'column',
    gap: token.margin,
  },
  card: {
    height: '100%',
    borderColor: token.colorBorderSecondary,
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
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: token.marginSM,
    marginBottom: token.marginXXS,
  },
  memberMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: token.marginXS,
  },
  participationRow: {
    display: 'flex',
    alignItems: 'center',
    gap: token.marginSM,
    marginTop: token.marginXS,
  },
  participationProgress: {
    flex: 1,
  },
  mergeAverage: {
    color: token.colorPrimary,
  },
  blockerItem: {
    borderBlockEnd: `${token.lineWidth}px ${token.lineType} ${token.colorSplit}`,

    '&:last-child': {
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
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: token.marginSM,
  },
  blockerDescription: {
    marginBlock: `${token.marginXXS}px 0`,
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
    lineHeight: token.lineHeightSM,
  },
  emptyBlocker: {
    paddingBlock: token.paddingSM,
    color: token.colorTextSecondary,
  },
}));
