import { createStyles } from 'antd-style';

export const useStyles = createStyles(({ token }) => ({
  code: {
    fontFamily: token.fontFamilyCode,
    fontSize: token.fontSizeSM,
  },
  editor: {
    background: token.colorBgContainer,
    border: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadiusLG,
    display: 'flex',
    flexDirection: 'column',
    gap: token.margin,
    minWidth: 0,
    padding: token.paddingLG,
  },
  editorFields: {
    display: 'grid',
    gap: token.marginSM,
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  },
  editorHeader: {
    alignItems: 'flex-start',
    display: 'flex',
    gap: token.margin,
    justifyContent: 'space-between',
  },
  fieldHint: {
    color: token.colorTextSecondary,
    display: 'block',
    fontSize: token.fontSizeSM,
    marginTop: token.marginXXS,
  },
  fullWidth: {
    width: '100%',
  },
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: token.margin,
  },
  preview: {
    background: token.colorBgContainer,
    border: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadiusLG,
    padding: token.paddingLG,
  },
  workspace: {
    display: 'grid',
    gap: token.margin,
    gridTemplateColumns: 'minmax(520px, 1.2fr) minmax(360px, 0.8fr)',
    minWidth: 0,
    '@media (max-width: 1200px)': {
      gridTemplateColumns: 'minmax(0, 1fr)',
    },
  },
}));
