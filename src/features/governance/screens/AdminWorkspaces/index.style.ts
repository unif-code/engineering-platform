import { createStyles } from 'antd-style';

export const useStyles = createStyles(({ token }) => ({
  page: {
    display: 'flex',
    width: '100%',
    maxWidth: 1080,
    flexDirection: 'column',
    gap: token.marginSM,
  },
  pageHeader: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: token.marginSM,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pageDescription: {
    margin: 0,
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
  },
  workspaceName: {
    height: 'auto',
    padding: 0,
    fontWeight: token.fontWeightStrong,
  },
  owner: {
    display: 'inline-flex',
    gap: token.marginXXS,
    alignItems: 'baseline',
  },
  ownerRole: {
    color: token.colorTextTertiary,
    fontSize: token.fontSizeSM,
  },
  team: {
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
  },
  pageNote: {
    margin: 0,
    color: token.colorTextTertiary,
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
