import { createStyles } from 'antd-style';

export const useStyles = createStyles(({ token }) => ({
  node: {
    alignItems: 'center',
    display: 'inline-flex',
    flexWrap: 'wrap',
    gap: token.marginXS,
    minHeight: token.controlHeight,
  },
  nodeMeta: {
    color: token.colorTextSecondary,
    fontFamily: token.fontFamilyCode,
    fontSize: token.fontSizeSM,
  },
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: token.margin,
  },
  treeCard: {
    background: token.colorBgContainer,
    border: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadiusLG,
    padding: token.paddingLG,
  },
}));
