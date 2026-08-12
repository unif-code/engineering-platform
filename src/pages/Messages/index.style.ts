import { createStyles } from 'antd-style';

export const useStyles = createStyles(({ token }) => ({
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: token.margin,
  },
  card: {
    borderColor: token.colorBorderSecondary,
  },
  toolbar: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: token.margin,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: token.marginSM,
  },
  list: {
    margin: 0,
    padding: 0,
    listStyle: 'none',
  },
  listItem: {
    borderBlockEnd: `${token.lineWidth}px ${token.lineType} ${token.colorSplit}`,

    '&:last-child': {
      borderBlockEnd: 0,
    },
  },
  messageButton: {
    height: 'auto',
    paddingBlock: token.paddingSM,
    paddingInline: 0,
    textAlign: 'start',
    whiteSpace: 'normal',
  },
  messageBody: {
    flex: 1,
    minWidth: 0,
  },
  messageHeader: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: token.marginXS,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: token.colorText,
    fontWeight: token.fontWeightStrong,
  },
  description: {
    marginBlock: `${token.marginXXS}px 0`,
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
    lineHeight: token.lineHeightSM,
  },
  metadata: {
    display: 'flex',
    flexShrink: 0,
    flexWrap: 'wrap',
    gap: token.marginXS,
    alignItems: 'center',
  },
  time: {
    color: token.colorTextTertiary,
    fontSize: token.fontSizeSM,
  },
  empty: {
    paddingBlock: token.paddingXL,
  },
}));
