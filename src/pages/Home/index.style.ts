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

    '@media (max-width: 1280px)': {
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    },

    [`@media (max-width: ${token.screenSM}px)`]: {
      gridTemplateColumns: 'minmax(0, 1fr)',
    },
  },
  contentGrid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 3fr) minmax(320px, 2fr)',
    gap: token.margin,
    alignItems: 'start',

    [`@media (max-width: ${token.screenLG}px)`]: {
      gridTemplateColumns: 'minmax(0, 1fr)',
    },
  },
  column: {
    display: 'flex',
    minWidth: 0,
    flexDirection: 'column',
    gap: token.margin,
  },
  card: {
    borderColor: token.colorBorderSecondary,
    boxShadow: token.boxShadowTertiary,
  },
  list: {
    margin: 0,
    padding: 0,
    listStyle: 'none',
  },
  listItem: {
    display: 'flex',
    gap: token.marginSM,
    alignItems: 'center',
    paddingBlock: token.paddingSM,
    borderBlockEnd: `${token.lineWidth}px ${token.lineType} ${token.colorSplit}`,

    '&:last-child': {
      borderBlockEnd: 0,
    },
  },
  itemBody: {
    flex: 1,
    minWidth: 0,
  },
  itemTitle: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: token.marginXS,
    alignItems: 'center',
    color: token.colorText,
  },
  code: {
    color: token.colorTextTertiary,
    fontFamily: token.fontFamilyCode,
    fontSize: token.fontSizeSM,
  },
  itemDescription: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: token.marginXS,
    alignItems: 'center',
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
  },
  action: {
    flexShrink: 0,
  },
}));
