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
    flex: '1 1 auto',
    flexWrap: 'wrap',
    gap: token.marginSM,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
}));
