import { createStyles } from 'antd-style';

export const useStyles = createStyles(({ token }) => ({
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: token.margin,
  },
  filter: {
    minWidth: 136,
  },
  search: {
    width: 280,
    maxWidth: '100%',
  },
  workspaceName: {
    display: 'flex',
    flexDirection: 'column',
    gap: token.marginXXS,
  },
  workspaceId: {
    color: token.colorTextSecondary,
    fontFamily: token.fontFamilyCode,
    fontSize: token.fontSizeSM,
  },
}));
