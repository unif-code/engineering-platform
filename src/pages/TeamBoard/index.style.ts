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
    gap: token.margin,
    alignItems: 'center',
    justifyContent: 'space-between',

    [`@media (max-width: ${token.screenMD}px)`]: {
      flexDirection: 'column',
      alignItems: 'stretch',
    },
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
    width: 'min(100%, 560px)',
    flexShrink: 0,
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
