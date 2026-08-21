import { createStyles } from 'antd-style';

export const useStyles = createStyles(({ token }) => ({
  page: {
    display: 'flex',
    maxWidth: 1080,
    flexDirection: 'column',
    gap: token.margin,
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: token.marginXXS,
  },
  title: {
    margin: 0,
    fontSize: token.fontSizeHeading4,
    lineHeight: token.lineHeightHeading4,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: token.marginSM,
  },
  card: {
    height: '100%',
    borderColor: token.colorBorderSecondary,
    boxShadow: token.boxShadowTertiary,
  },
}));
