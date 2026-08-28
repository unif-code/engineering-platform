import { createStyles } from 'antd-style';

export const useDetailStyles = createStyles(({ token }) => ({
  page: {
    display: 'flex',
    width: '100%',
    maxWidth: 1120,
    flexDirection: 'column',
    gap: token.margin,
  },
  pageHeader: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: token.marginSM,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  heading: {
    display: 'flex',
    minWidth: 0,
    flexDirection: 'column',
    gap: token.marginXXS,
  },
  pageTitle: {
    margin: 0,
  },
  requirementId: {
    color: token.colorTextSecondary,
    fontFamily: token.fontFamilyCode,
    overflowWrap: 'anywhere',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: token.marginSM,
  },
  sectionTitle: {
    margin: 0,
  },
  description: {
    margin: 0,
    whiteSpace: 'pre-wrap',
  },
  criteria: {
    display: 'flex',
    flexDirection: 'column',
    gap: token.marginXS,
    margin: 0,
    paddingInlineStart: token.paddingLG,
  },
  workItems: {
    display: 'flex',
    flexDirection: 'column',
    gap: token.margin,
  },
  loading: {
    paddingBlock: token.paddingLG,
  },
  binding: {
    display: 'flex',
    flexDirection: 'column',
    gap: token.marginSM,
    padding: token.padding,
    border: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadiusLG,
  },
  bindingHeading: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: token.marginSM,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bindingTitle: {
    margin: 0,
  },
  copyRow: {
    display: 'flex',
    minWidth: 0,
    flexWrap: 'wrap',
    gap: token.marginXS,
    alignItems: 'center',
  },
  code: {
    maxWidth: '100%',
    overflowWrap: 'anywhere',
    fontFamily: token.fontFamilyCode,
  },
  copyFeedback: {
    minHeight: token.controlHeightSM,
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
  },
}));
