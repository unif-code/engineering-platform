import { createStyles } from 'antd-style';

const statisticTone = (color: string) => ({
  '& .ant-statistic-content': {
    color,
  },
});

export const useStyles = createStyles(({ token }) => ({
  card: {
    height: '100%',
    borderColor: token.colorBorderSecondary,
    boxShadow: token.boxShadowTertiary,
  },
  neutral: statisticTone(token.colorText),
  brand: statisticTone(token.colorPrimary),
  info: statisticTone(token.colorInfo),
  success: statisticTone(token.colorSuccess),
  warning: statisticTone(token.colorWarning),
  danger: statisticTone(token.colorError),
  purple: statisticTone(token.purple6),
}));
