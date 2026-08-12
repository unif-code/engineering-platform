import { createStyles } from 'antd-style';

export const useStyles = createStyles(({ token }) => ({
  page: {
    display: 'flex',
    width: '100%',
    maxWidth: 980,
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
  icon: {
    color: token.colorTextSecondary,
    fontSize: token.fontSizeLG,
  },
  menuName: {
    display: 'inline-flex',
    gap: token.marginXS,
    alignItems: 'center',
  },
  capability: {
    color: token.colorTextSecondary,
  },
  visibility: {
    display: 'inline-flex',
    gap: token.marginXS,
    alignItems: 'center',
  },
}));
