import { createStyles } from 'antd-style';

export const useStyles = createStyles(({ token }) => ({
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: token.margin,
  },
  toolbar: {
    display: 'flex',
    gap: token.marginSM,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  masterDetail: {
    display: 'flex',
    gap: token.margin,
    alignItems: 'flex-start',
  },
  catalog: {
    display: 'flex',
    width: 248,
    minHeight: 420,
    flex: '0 0 248px',
    flexDirection: 'column',
    gap: token.margin,
    padding: token.paddingSM,
    border: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadiusLG,
    background: token.colorBgContainer,
  },
  detail: {
    display: 'flex',
    flex: 1,
    minWidth: 0,
    flexDirection: 'column',
    gap: token.margin,
  },
  detailHeader: {
    borderColor: token.colorBorderSecondary,
  },
  contentGrid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) 272px',
    gap: token.margin,
    alignItems: 'stretch',
  },
  sourceCard: {
    minHeight: 320,
    padding: token.padding,
    border: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadiusLG,
    background: token.colorBgContainer,
  },
  historyCard: {
    minHeight: 320,
    padding: token.paddingSM,
    border: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadiusLG,
    background: token.colorBgContainer,
  },
  sectionTitle: {
    margin: 0,
    color: token.colorText,
    fontSize: token.fontSize,
    lineHeight: token.lineHeight,
  },
}));
