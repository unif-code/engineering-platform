import { createStyles } from 'antd-style';

export const useStyles = createStyles(({ token }) => ({
  changeHint: {
    color: token.colorWarningText,
    fontSize: token.fontSizeSM,
  },
  changeItem: {
    background: token.colorWarningBg,
    borderRadius: token.borderRadius,
    display: 'flex',
    flexDirection: 'column',
    gap: token.marginXXS,
    padding: `${token.paddingXS}px ${token.paddingSM}px`,
  },
  changeList: {
    display: 'flex',
    flexDirection: 'column',
    gap: token.marginXS,
    maxHeight: 236,
    overflowY: 'auto',
  },
  changedValue: {
    color: token.colorPrimary,
  },
  code: {
    fontFamily: token.fontFamilyCode,
    fontSize: token.fontSizeSM,
  },
  draftSummary: {
    background: token.colorBgContainer,
    border: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadiusLG,
    display: 'flex',
    flex: '0 0 330px',
    flexDirection: 'column',
    gap: token.marginSM,
    padding: token.padding,
    position: 'sticky',
    top: token.margin,
    width: 330,
  },
  emptyHint: {
    paddingBlock: token.paddingXS,
  },
  fullWidth: {
    width: '100%',
  },
  groupSelector: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: token.marginSM,
  },
  publishButton: {
    gridColumn: '1 / -1',
    width: '100%',
  },
  sectionHeader: {
    background: token.colorFillAlter,
    padding: `${token.paddingSM}px ${token.paddingLG}px`,
  },
  sectionTitle: {
    margin: 0,
  },
  settingControl: {
    display: 'flex',
    flex: '0 0 250px',
    flexDirection: 'column',
    gap: token.marginXXS,
    width: 250,
  },
  settingInfo: {
    display: 'flex',
    flex: '1 1 auto',
    flexDirection: 'column',
    gap: token.marginXXS,
  },
  settingList: {
    display: 'flex',
    flexDirection: 'column',
  },
  settingRow: {
    '& + &': {
      borderTop: `${token.lineWidth}px ${token.lineType} ${token.colorSplit}`,
    },
    alignItems: 'center',
    display: 'flex',
    gap: token.margin,
    padding: `${token.padding}px ${token.paddingLG}px`,
  },
  settingsPanel: {
    background: token.colorBgContainer,
    border: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadiusLG,
    flex: '1 1 auto',
    minWidth: 0,
    overflow: 'hidden',
  },
  summaryActions: {
    display: 'grid',
    gap: token.marginXS,
    gridTemplateColumns: '1fr 1fr',
  },
  summaryHeader: {
    alignItems: 'baseline',
    display: 'flex',
    gap: token.marginXS,
    '& > button': {
      marginLeft: 'auto',
      paddingInline: 0,
    },
  },
  settingFormItem: {
    marginBottom: 0,
  },
  allVersionsButton: {
    marginInlineStart: 'auto',
    paddingInline: 0,
  },
  versionCard: {
    border: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadiusLG,
    display: 'flex',
    flex: '0 0 236px',
    flexDirection: 'column',
    gap: token.marginXXS,
    padding: `${token.paddingSM}px ${token.padding}px`,
    width: 236,
  },
  versionHeader: {
    alignItems: 'baseline',
    display: 'flex',
    gap: token.marginXS,
  },
  versionHeading: {
    alignItems: 'center',
    display: 'flex',
    gap: token.marginXS,
    justifyContent: 'space-between',
  },
  versionHistory: {
    background: token.colorBgContainer,
    border: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadiusLG,
    display: 'flex',
    flexDirection: 'column',
    gap: token.marginSM,
    padding: token.padding,
  },
  versionList: {
    display: 'flex',
    gap: token.marginSM,
    overflowX: 'auto',
    paddingBottom: token.paddingXXS,
  },
  versionDrawerItem: {
    borderBottom: `${token.lineWidth}px ${token.lineType} ${token.colorSplit}`,
    display: 'flex',
    flexDirection: 'column',
    gap: token.marginXXS,
    paddingBottom: token.paddingSM,
  },
  versionDrawerList: {
    display: 'flex',
    flexDirection: 'column',
    gap: token.margin,
  },
  versionDrawerSummary: {
    marginBlockEnd: token.margin,
  },
  workspace: {
    alignItems: 'flex-start',
    display: 'flex',
    gap: token.margin,
  },
}));
