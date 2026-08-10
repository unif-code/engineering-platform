import { createStyles } from 'antd-style';

export const useStyles = createStyles(({ token }) => ({
  figure: {
    width: '100%',
    margin: 0,
  },
  bar: {
    display: 'flex',
    minInlineSize: 0,
    width: '100%',
    height: token.controlHeightSM,
    margin: 0,
    overflow: 'hidden',
    padding: 0,
    border: 0,
    borderRadius: token.borderRadius,
    backgroundColor: token.colorFillQuaternary,
  },
  segment: {
    appearance: 'none',
    minWidth: 0,
    flexBasis: 0,
    border: 0,
    borderInlineEnd: `${token.lineWidth}px ${token.lineType} ${token.colorBgContainer}`,
    transition: `flex-grow ${token.motionDurationMid} ${token.motionEaseInOut}`,

    '&::-webkit-meter-bar': {
      backgroundColor: 'transparent',
    },

    '&::-webkit-meter-optimum-value': {
      backgroundColor: 'transparent',
    },

    '&::-moz-meter-bar': {
      backgroundColor: 'transparent',
    },

    '&:last-child': {
      borderInlineEnd: 0,
    },

    '@media (prefers-reduced-motion: reduce)': {
      transition: 'none',
    },
  },
  legend: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(112px, 1fr))',
    gap: token.marginXS,
    margin: `${token.marginSM}px 0 0`,
    padding: 0,
    listStyle: 'none',
  },
  legendItem: {
    display: 'flex',
    minWidth: 0,
    gap: token.marginXS,
    alignItems: 'center',
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
  },
  marker: {
    width: token.fontSizeSM,
    height: token.fontSizeSM,
    flexShrink: 0,
    borderRadius: token.borderRadiusXS,
  },
  legendLabel: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  legendValue: {
    marginInlineStart: 'auto',
    color: token.colorText,
  },
  neutral: {
    backgroundColor: token.colorTextSecondary,
  },
  brand: {
    backgroundColor: token.colorPrimary,
  },
  info: {
    backgroundColor: token.colorInfo,
  },
  success: {
    backgroundColor: token.colorSuccess,
  },
  warning: {
    backgroundColor: token.colorWarning,
  },
  danger: {
    backgroundColor: token.colorError,
  },
  purple: {
    backgroundColor: token.purple6,
  },
}));
