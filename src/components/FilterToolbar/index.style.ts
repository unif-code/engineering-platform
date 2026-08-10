import { createStyles } from 'antd-style';

export const useStyles = createStyles(({ token }) => ({
  toolbar: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: token.marginSM,
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: token.paddingSM,
    border: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadiusLG,
    background: token.colorBgContainer,
    boxShadow: token.boxShadowTertiary,

    '@media (max-width: 1280px)': {
      alignItems: 'stretch',
    },
  },
  context: {
    display: 'flex',
    flex: '1 1 360px',
    flexWrap: 'wrap',
    gap: token.marginSM,
    alignItems: 'center',
    minWidth: 0,
  },
  controls: {
    display: 'flex',
    flex: '0 1 auto',
    flexWrap: 'wrap',
    gap: token.marginSM,
    alignItems: 'center',
    justifyContent: 'flex-end',
    minWidth: 0,

    '@media (max-width: 1280px)': {
      flex: '1 1 100%',
      justifyContent: 'flex-start',
    },
  },
}));
