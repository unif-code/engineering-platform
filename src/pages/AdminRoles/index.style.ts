import { createStyles } from 'antd-style';

export const useStyles = createStyles(({ token }) => ({
  page: {
    display: 'flex',
    minWidth: 0,
    flexDirection: 'column',
    gap: token.margin,
  },
  masterDetail: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: token.margin,
    alignItems: 'start',
  },
  roleList: {
    flex: '0 1 292px',
  },
  matrix: {
    flex: '1 1 520px',
    minWidth: 0,
  },
  card: {
    borderColor: token.colorBorderSecondary,
    boxShadow: token.boxShadowTertiary,
  },
  selectorTitle: {
    display: 'flex',
    flexDirection: 'column',
    gap: token.marginXXS,
  },
  selectorHeading: {
    margin: 0,
    color: token.colorText,
    fontSize: token.fontSizeLG,
    fontWeight: token.fontWeightStrong,
  },
  selectorHint: {
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
  },
  roleButton: {
    width: '100%',
    height: 'auto',
    marginBlockEnd: token.marginXS,
    padding: token.paddingSM,
    border: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadiusLG,
    textAlign: 'start',
    whiteSpace: 'normal',

    '&:hover': {
      borderColor: token.colorPrimaryBorder,
      background: token.colorPrimaryBg,
    },

    '&:focus-visible': {
      outline: `${token.lineWidthFocus}px solid ${token.colorPrimaryBorder}`,
      outlineOffset: token.marginXXS,
    },
  },
  roleButtonActive: {
    borderColor: token.colorPrimary,
    background: token.colorPrimaryBg,
  },
  roleButtonContent: {
    display: 'flex',
    width: '100%',
    minWidth: 0,
    flexDirection: 'column',
    gap: token.marginXXS,
  },
  roleTitleRow: {
    display: 'flex',
    width: '100%',
    gap: token.marginXS,
    alignItems: 'center',
  },
  roleName: {
    flex: 1,
    minWidth: 0,
    color: token.colorText,
    fontWeight: token.fontWeightStrong,
  },
  roleDescription: {
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
    lineHeight: token.lineHeightSM,
  },
  matrixHeader: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: token.marginSM,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBlockEnd: token.margin,
  },
  matrixTitleBlock: {
    display: 'flex',
    minWidth: 0,
    flexDirection: 'column',
    gap: token.marginXXS,
  },
  matrixTitle: {
    margin: 0,
    color: token.colorText,
    fontSize: token.fontSizeHeading3,
    lineHeight: token.lineHeightHeading3,
  },
  matrixDescription: {
    margin: 0,
    color: token.colorTextSecondary,
  },
  matrixTags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: token.marginXS,
  },
  capabilityGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: token.margin,
  },
  capabilityGroup: {
    minWidth: 0,
    margin: 0,
    padding: token.padding,
    border: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadiusLG,
    background: token.colorBgContainer,
  },
  capabilityLegend: {
    paddingInline: token.paddingXS,
    color: token.colorText,
    fontWeight: token.fontWeightStrong,
  },
  capabilityDescription: {
    marginBlock: `0 ${token.marginSM}px`,
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
  },
  checkboxGroup: {
    display: 'flex',
    width: '100%',
    flexDirection: 'column',
    gap: token.marginXS,
  },
  checkboxOption: {
    display: 'flex',
    alignItems: 'flex-start',
  },
  optionBody: {
    display: 'inline-flex',
    minWidth: 0,
    flexDirection: 'column',
    gap: token.marginXXS,
  },
  optionLabel: {
    color: token.colorText,
  },
  capabilityCode: {
    color: token.colorTextSecondary,
    fontFamily: token.fontFamilyCode,
    fontSize: token.fontSizeSM,
  },
  matrixFooter: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: token.marginSM,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBlockStart: token.marginLG,
    paddingBlockStart: token.padding,
    borderBlockStart: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`,
  },
  boundaryNote: {
    maxWidth: 580,
    margin: 0,
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
  },
}));
