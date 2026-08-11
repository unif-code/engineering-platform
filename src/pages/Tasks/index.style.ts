import { createStyles } from 'antd-style';

export const useStyles = createStyles(({ token }) => ({
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: token.margin,
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: token.margin,
  },
  search: {
    width: 280,
    maxWidth: '100%',
  },
  code: {
    color: token.colorTextTertiary,
    fontFamily: token.fontFamilyCode,
    fontSize: token.fontSizeSM,
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
  boardStack: {
    display: 'flex',
    flexDirection: 'column',
    gap: token.marginSM,
  },
  taskCard: {
    borderColor: token.colorBorderSecondary,
    boxShadow: token.boxShadowTertiary,
  },
  taskCode: {
    marginBlockEnd: token.marginXXS,
    color: token.colorTextTertiary,
    fontFamily: token.fontFamilyCode,
    fontSize: token.fontSizeSM,
  },
  taskTitle: {
    marginBlockEnd: token.marginXS,
    color: token.colorText,
    fontWeight: token.fontWeightStrong,
  },
  taskMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: token.marginXXS,
    marginBlockEnd: token.marginSM,
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
  },
  empty: {
    display: 'block',
    paddingBlock: token.padding,
    textAlign: 'center',
  },
}));
