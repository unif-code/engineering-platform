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
  sectionCard: {
    borderColor: token.colorBorderSecondary,
    boxShadow: token.boxShadowTertiary,
  },
  entryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: token.marginSM,

    [`@media (max-width: ${token.screenLG}px)`]: {
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    },

    [`@media (max-width: ${token.screenSM}px)`]: {
      gridTemplateColumns: 'minmax(0, 1fr)',
    },
  },
  entryCard: {
    borderColor: token.colorBorderSecondary,
    backgroundColor: token.colorFillQuaternary,
  },
  entryDescription: {
    minHeight: '2.8em',
    marginBlock: `0 ${token.marginSM}px`,
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
    lineHeight: token.lineHeightSM,
  },
  lowerGrid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
    gap: token.margin,
    alignItems: 'start',

    [`@media (max-width: ${token.screenLG}px)`]: {
      gridTemplateColumns: 'minmax(0, 1fr)',
    },
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
  riskBody: {
    flex: 1,
    minWidth: 0,
  },
  riskDescription: {
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
  statusContent: {
    width: '100%',
    minWidth: 0,
  },
  statusHeader: {
    display: 'flex',
    gap: token.marginSM,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: token.marginXXS,
  },
  statusDescription: {
    display: 'block',
    marginBottom: token.marginXS,
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
  },
}));
