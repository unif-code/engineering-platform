import { createStyles } from 'antd-style';

export const useStyles = createStyles(({ token }) => ({
  masterDetail: {
    display: 'grid',
    gridTemplateColumns: 'minmax(240px, 300px) minmax(0, 1fr)',
    gap: token.margin,

    [`@media (max-width: ${token.screenMD}px)`]: {
      gridTemplateColumns: 'minmax(0, 1fr)',
    },
  },
  selectorCard: {
    minHeight: 520,
    padding: token.padding,
    border: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadiusLG,
    background: token.colorBgContainer,
  },
  selectorHeader: {
    display: 'flex',
    gap: token.marginXS,
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  selectorTitle: {
    margin: 0,
    color: token.colorText,
    fontSize: token.fontSizeHeading4,
    lineHeight: token.lineHeightHeading4,
  },
  secondaryText: {
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
  },
  selectorEmpty: {
    display: 'grid',
    minHeight: 420,
    placeItems: 'center',
  },
  detailCard: {
    minWidth: 0,
    minHeight: 520,
    padding: token.padding,
    border: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadiusLG,
    background: token.colorBgContainer,
  },
  detailHeader: {
    marginBlockEnd: token.marginSM,
  },
  detailTitle: {
    margin: 0,
    color: token.colorText,
    fontSize: token.fontSizeHeading4,
    lineHeight: token.lineHeightHeading4,
  },
  detailDescription: {
    margin: `${token.marginXXS}px 0 0`,
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
  },
}));
