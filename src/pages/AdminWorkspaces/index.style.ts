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
  leader: {
    alignItems: 'center',
    borderBottom: `${token.lineWidth}px ${token.lineType} ${token.colorSplit}`,
    display: 'flex',
    gap: token.marginSM,
    justifyContent: 'space-between',
    padding: `${token.paddingSM}px ${token.padding}px`,
  },
  leaderIdentity: {
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    gap: token.marginXS,
  },
  leaderList: {
    border: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`,
    borderBottom: 0,
    borderRadius: token.borderRadius,
    listStyle: 'none',
    margin: 0,
    padding: 0,
  },
}));
