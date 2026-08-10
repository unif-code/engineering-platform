import { createStyles } from 'antd-style';

export const useStyles = createStyles(({ token }) => ({
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: token.margin,
  },
  card: {
    borderColor: token.colorBorderSecondary,
    boxShadow: token.boxShadowTertiary,
  },
  cardTitle: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: token.marginXS,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardBody: {
    display: 'flex',
    minHeight: 164,
    flexDirection: 'column',
    gap: token.marginSM,
  },
  description: {
    minHeight: '3em',
    margin: 0,
    color: token.colorTextSecondary,
  },
  metadata: {
    display: 'grid',
    gridTemplateColumns: 'max-content minmax(0, 1fr)',
    gap: `${token.marginXXS}px ${token.marginSM}px`,
    margin: 0,
  },
  metadataLabel: {
    color: token.colorTextTertiary,
  },
  metadataValue: {
    minWidth: 0,
    margin: 0,
    overflowWrap: 'anywhere',
    color: token.colorText,
  },
  code: {
    fontFamily: token.fontFamilyCode,
  },
}));
