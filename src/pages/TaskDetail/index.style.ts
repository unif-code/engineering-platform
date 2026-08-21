import { createStyles } from 'antd-style';

export const useStyles = createStyles(({ token }) => ({
  detailShell: {
    overflow: 'hidden',
    border: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadiusLG,
    background: token.colorBgContainer,
  },
  detailHeader: {
    display: 'flex',
    gap: token.marginSM,
    alignItems: 'center',
    padding: `${token.paddingSM}px ${token.padding}px`,
    borderBlockEnd: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`,
  },
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    color: token.colorTextTertiary,
  },
  detailCode: {
    color: token.colorTextTertiary,
    fontFamily: token.fontFamilyCode,
    fontSize: token.fontSizeSM,
  },
  detailTitle: {
    margin: 0,
    color: token.colorText,
    fontSize: token.fontSizeLG,
    fontWeight: token.fontWeightStrong,
    lineHeight: token.lineHeightLG,
  },
  detailActions: {
    marginInlineStart: 'auto',
  },
  detailGrid: {
    display: 'flex',
    minHeight: 560,
    alignItems: 'stretch',
  },
  conversationPane: {
    display: 'flex',
    flex: 1,
    minWidth: 0,
    flexDirection: 'column',
    gap: token.margin,
    padding: token.paddingLG,
    borderInlineEnd: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`,
  },
  panelTitle: {
    margin: 0,
    color: token.colorText,
    fontSize: token.fontSizeLG,
    lineHeight: token.lineHeightLG,
  },
  conversationBody: {
    display: 'grid',
    flex: 1,
    minHeight: 360,
    placeItems: 'center',
  },
  inspector: {
    flex: '0 0 344px',
    minWidth: 0,
    padding: `${token.paddingSM}px ${token.paddingSM}px ${token.padding}px`,
    background: token.colorFillQuaternary,
  },
  inspectorTabs: {
    height: '100%',
  },
}));
