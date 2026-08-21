import { createStyles } from 'antd-style';

export const useStyles = createStyles(({ token }) => ({
  capability: {
    display: 'flex',
    flexDirection: 'column',
    gap: token.marginXXS,
  },
  code: {
    color: token.colorTextSecondary,
    fontFamily: token.fontFamilyCode,
    fontSize: token.fontSizeSM,
  },
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: token.margin,
    maxWidth: 1180,
  },
  principal: {
    alignItems: 'center',
    display: 'inline-flex',
    gap: token.marginXS,
  },
  segmented: {
    alignSelf: 'flex-start',
  },
  stats: {
    borderBottom: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`,
    display: 'flex',
    gap: token.marginXXL,
    padding: `0 ${token.paddingXXS}px ${token.paddingLG}px`,
    '& > div': {
      display: 'flex',
      flexDirection: 'column',
      gap: token.marginXXS,
    },
    '& strong': {
      fontSize: token.fontSizeHeading2,
      lineHeight: 1,
    },
  },
  toolbar: {
    alignItems: 'center',
    display: 'flex',
    gap: token.margin,
    justifyContent: 'space-between',
  },
}));
