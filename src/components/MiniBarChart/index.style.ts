import { createStyles } from 'antd-style';

export const useStyles = createStyles(({ token }) => ({
  figure: {
    width: '100%',
    margin: 0,
  },
  chart: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(0, 1fr))',
    gap: token.marginXS,
    margin: 0,
    padding: 0,
    listStyle: 'none',
  },
  item: {
    display: 'grid',
    gridTemplateRows: 'auto minmax(0, 1fr) auto',
    gap: token.marginXXS,
    minWidth: 0,
    height: '100%',
    textAlign: 'center',
  },
  valueGroup: {
    display: 'flex',
    minHeight: token.controlHeightSM,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  highlightLabel: {
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
    lineHeight: token.lineHeightSM,
  },
  valueLabel: {
    overflow: 'hidden',
    color: token.colorText,
    fontSize: token.fontSizeSM,
    lineHeight: token.lineHeightSM,
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  bar: {
    appearance: 'none',
    width: 'min(100%, 28px)',
    minHeight: token.lineWidth,
    alignSelf: 'end',
    justifySelf: 'center',
    border: 0,
    borderRadius: `${token.borderRadiusSM}px ${token.borderRadiusSM}px 0 0`,
    transition: `height ${token.motionDurationMid} ${token.motionEaseInOut}`,

    '&::-webkit-meter-bar': {
      backgroundColor: 'transparent',
    },

    '&::-webkit-meter-optimum-value': {
      backgroundColor: 'transparent',
    },

    '&::-moz-meter-bar': {
      backgroundColor: 'transparent',
    },

    '@media (prefers-reduced-motion: reduce)': {
      transition: 'none',
    },
  },
  highlighted: {
    boxShadow: `0 0 0 ${token.lineWidth}px ${token.colorText}`,
  },
  label: {
    overflow: 'hidden',
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
    lineHeight: token.lineHeightSM,
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
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
