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
  search: {
    width: 170,
    maxWidth: '100%',
  },
  board: {
    maxWidth: '100%',
    overflowX: 'auto',
  },
  boardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, minmax(210px, 1fr))',
    gap: token.marginSM,
    minWidth: 1100,
    alignItems: 'start',
  },
  boardColumn: {
    minWidth: 0,
    padding: token.paddingSM,
    border: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadiusLG,
    background: token.colorFillQuaternary,
  },
  boardHeader: {
    display: 'flex',
    gap: token.marginXS,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBlockEnd: token.marginSM,

    '& h5': {
      margin: 0,
      fontFamily: token.fontFamilyCode,
    },
  },
  boardCount: {
    minWidth: token.controlHeightSM,
    paddingInline: token.paddingXS,
    borderRadius: token.borderRadiusSM,
    background: token.colorFillSecondary,
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
    textAlign: 'center',
  },
}));
