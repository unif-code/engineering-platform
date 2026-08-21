import { createStyles } from 'antd-style';

export const useStyles = createStyles(({ token }) => ({
  card: {
    height: '100%',
    borderColor: token.colorBorderSecondary,
  },
}));
