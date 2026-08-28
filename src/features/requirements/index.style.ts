import { createStyles } from 'antd-style';

export const useStyles = createStyles(({ token }) => ({
  page: {
    display: 'flex',
    width: '100%',
    maxWidth: 1200,
    flexDirection: 'column',
    gap: token.margin,
  },
  pageHeader: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: token.margin,
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  heading: {
    display: 'flex',
    flexDirection: 'column',
    gap: token.marginXXS,
  },
  title: {
    margin: 0,
  },
  description: {
    margin: 0,
    color: token.colorTextSecondary,
  },
  workspaceField: {
    display: 'flex',
    minWidth: 240,
    flexDirection: 'column',
    gap: token.marginXXS,
  },
  headerActions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: token.marginSM,
    alignItems: 'flex-end',
  },
  workspaceLabel: {
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
  },
  workspaceSelect: {
    width: '100%',
  },
  requirementId: {
    height: 'auto',
    padding: 0,
    fontFamily: token.fontFamilyCode,
  },
  pagination: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: token.marginSM,
  },
  pageNumber: {
    minWidth: 56,
    color: token.colorTextSecondary,
    textAlign: 'center',
  },
  emptyWorkspace: {
    paddingBlock: token.paddingXL,
  },
  criteriaHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: token.marginXS,
  },
  criterionRow: {
    display: 'flex',
    gap: token.marginXS,
    alignItems: 'center',
  },
  criterionItem: {
    minWidth: 0,
    flex: 1,
  },
  formFooter: {
    display: 'flex',
    gap: token.marginSM,
    justifyContent: 'flex-end',
    marginTop: token.margin,
  },
}));
