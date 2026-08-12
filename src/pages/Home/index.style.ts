import { createStyles } from 'antd-style';

export const useStyles = createStyles(({ token }) => ({
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: token.margin,
  },
  workbenchHeader: {
    display: 'flex',
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
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: token.margin,
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
