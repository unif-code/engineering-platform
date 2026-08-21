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
  icon: {
    color: token.colorTextSecondary,
    fontSize: token.fontSizeLG,
  },
}));
