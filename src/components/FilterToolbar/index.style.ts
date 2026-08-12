import { createStyles } from 'antd-style';

export const useStyles = createStyles(({ token }) => ({
  toolbar: {
    display: 'flex',
    gap: token.marginSM,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  context: {
    display: 'flex',
    flex: 1,
    flexWrap: 'wrap',
    gap: token.marginSM,
    alignItems: 'center',
    minWidth: 0,
  },
  controls: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: token.marginSM,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
}));
