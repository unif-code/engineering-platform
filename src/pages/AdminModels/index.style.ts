import { createStyles } from 'antd-style';

export const useStyles = createStyles(({ token }) => ({
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: token.margin,
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: token.marginSM,
  },
  toolbar: {
    display: 'flex',
    gap: token.marginSM,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  note: {
    fontSize: token.fontSizeSM,
  },
  usagePage: {
    display: 'flex',
    flexDirection: 'column',
    gap: token.margin,
  },
  usageGrid: {
    display: 'grid',
    gridTemplateColumns: '1.4fr 1fr',
    gap: token.margin,
  },
  usagePrimary: {
    display: 'grid',
    gridTemplateRows: '1fr 1fr',
    gap: token.margin,
  },
  usageSecondary: {
    display: 'grid',
    gridTemplateRows: '1fr 1fr',
    gap: token.margin,
  },
  emptyRegion: {
    minHeight: 150,
    padding: token.padding,
    border: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadiusLG,
    background: token.colorBgContainer,
  },
  sectionTitle: {
    margin: `0 0 ${token.marginSM}px`,
    color: token.colorText,
    fontSize: token.fontSize,
    lineHeight: token.lineHeight,
  },
  evidence: {
    display: 'flex',
    flexDirection: 'column',
  },
  evidenceTitle: {
    borderEndStartRadius: 0,
    borderEndEndRadius: 0,
    borderColor: token.colorBorderSecondary,
  },
}));
