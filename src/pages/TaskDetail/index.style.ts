import { theme } from 'antd';
import { createStyles } from 'antd-style';

const previewToken = theme.getDesignToken();

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
  detailRepository: {
    color: token.colorTextTertiary,
    fontFamily: token.fontFamilyCode,
    fontSize: token.fontSizeSM,
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
    flex: 1,
    minWidth: 0,
    borderInlineEnd: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`,
  },
  conversationBody: {
    display: 'flex',
    height: '100%',
    flexDirection: 'column',
  },
  conversationScroll: {
    flex: 1,
    minHeight: 420,
    overflowY: 'auto',
    padding: token.paddingLG,
  },
  senderArea: {
    padding: `${token.paddingSM}px ${token.paddingLG}px`,
    borderBlockStart: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`,
  },
  senderHint: {
    display: 'block',
    marginBlockEnd: token.marginXS,
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
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
  panelStack: {
    display: 'flex',
    flexDirection: 'column',
    gap: token.marginSM,
  },
  panelHeading: {
    margin: 0,
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'auto minmax(0, 1fr)',
    gap: `${token.marginXS}px ${token.marginSM}px`,
    margin: 0,

    '& dt': {
      color: token.colorTextSecondary,
    },

    '& dd': {
      minWidth: 0,
      margin: 0,
      color: token.colorText,
      overflowWrap: 'anywhere',
    },
  },
  itemList: {
    display: 'flex',
    flexDirection: 'column',
    margin: 0,
    padding: 0,
    listStyle: 'none',
  },
  itemListEntry: {
    display: 'flex',
    flexDirection: 'column',
    gap: token.marginXXS,
    paddingBlock: token.paddingSM,
    borderBlockEnd: `${token.lineWidth}px ${token.lineType} ${token.colorSplit}`,

    '&:last-child': {
      borderBlockEnd: 0,
    },
  },
  codeText: {
    fontFamily: token.fontFamilyCode,
  },
  previewFrame: {
    overflow: 'hidden',
    border: `${token.lineWidth}px ${token.lineType} ${previewToken.colorBorderSecondary}`,
    borderRadius: token.borderRadiusLG,
    backgroundColor: previewToken.colorBgLayout,
    color: previewToken.colorText,
  },
  previewToolbar: {
    display: 'flex',
    gap: token.marginXS,
    alignItems: 'center',
    padding: `${token.paddingXS}px ${token.paddingSM}px`,
    borderBlockEnd: `${token.lineWidth}px ${token.lineType} ${previewToken.colorBorderSecondary}`,
    backgroundColor: previewToken.colorBgContainer,
    color: previewToken.colorTextSecondary,
    fontSize: token.fontSizeSM,
  },
  previewDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    backgroundColor: previewToken.colorBorder,
  },
  previewCanvas: {
    padding: token.padding,
  },
  previewHero: {
    padding: token.padding,
    border: `${token.lineWidth}px ${token.lineType} ${previewToken.colorBorderSecondary}`,
    borderRadius: token.borderRadius,
    backgroundColor: previewToken.colorBgContainer,
  },
  previewEyebrow: {
    marginBlockEnd: token.marginXS,
    color: previewToken.colorPrimary,
    fontSize: token.fontSizeSM,
    fontWeight: token.fontWeightStrong,
  },
  previewTitle: {
    margin: 0,
    color: previewToken.colorText,
    fontSize: token.fontSizeHeading4,
  },
  previewDescription: {
    marginBlock: `${token.marginXS}px 0`,
    color: previewToken.colorTextSecondary,
  },
  diffCard: {
    borderColor: token.colorBorderSecondary,
  },
  diffList: {
    margin: 0,
    padding: 0,
    listStyle: 'none',
  },
  diffListItem: {
    paddingBlock: token.padding,
    borderBlockEnd: `${token.lineWidth}px ${token.lineType} ${token.colorSplit}`,

    '&:first-child': {
      paddingBlockStart: 0,
    },

    '&:last-child': {
      paddingBlockEnd: 0,
      borderBlockEnd: 0,
    },
  },
  diffFile: {
    width: '100%',
    minWidth: 0,
  },
  diffFileHeader: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: token.marginXS,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBlockEnd: token.marginXS,
  },
  diffCode: {
    overflowX: 'auto',
    margin: 0,
    padding: token.paddingSM,
    borderRadius: token.borderRadius,
    backgroundColor: token.colorFillQuaternary,
    color: token.colorText,
    fontFamily: token.fontFamilyCode,
    fontSize: token.fontSizeSM,
    lineHeight: token.lineHeight,
  },
  diffLine: {
    display: 'block',
    minWidth: 'max-content',
    paddingInline: token.paddingXS,
    whiteSpace: 'pre',
  },
  diffAddition: {
    backgroundColor: token.colorSuccessBg,
    color: token.colorSuccessText,
  },
  diffRemoval: {
    backgroundColor: token.colorErrorBg,
    color: token.colorErrorText,
  },
  diffContext: {
    color: token.colorTextSecondary,
  },
}));
