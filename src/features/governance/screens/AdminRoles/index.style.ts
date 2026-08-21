import { createStyles } from 'antd-style';

export const useStyles = createStyles(({ token }) => ({
  masterDetail: {
    display: 'grid',
    gridTemplateColumns: '270px minmax(0, 1fr)',
    gap: token.margin,
    alignItems: 'start',
  },
  roleList: {
    display: 'flex',
    minHeight: 520,
    flexDirection: 'column',
    gap: token.marginSM,
  },
  selectorHeadingRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectorHeading: {
    margin: 0,
    color: token.colorText,
    fontSize: token.fontSize,
    lineHeight: token.lineHeight,
  },
  roleNote: {
    margin: 0,
    fontSize: token.fontSizeSM,
    lineHeight: token.lineHeight,
  },
  matrix: {
    minHeight: 520,
    padding: token.paddingLG,
    border: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadiusLG,
    background: token.colorBgContainer,
  },
  matrixTitle: {
    margin: 0,
    color: token.colorText,
    fontSize: token.fontSizeLG,
    lineHeight: token.lineHeightLG,
  },
  capabilitySections: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: token.marginSM,
  },
  capabilityRegion: {
    minHeight: 150,
    padding: token.paddingSM,
    border: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadius,
    '&:last-child': {
      gridColumn: '1 / -1',
    },
  },
  sectionTitle: {
    margin: 0,
    color: token.colorTextSecondary,
    fontSize: token.fontSize,
    lineHeight: token.lineHeight,
  },
}));
