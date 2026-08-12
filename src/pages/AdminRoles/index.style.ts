import { createStyles } from 'antd-style';

export const useStyles = createStyles(({ token }) => ({
  masterDetail: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 14,
    alignItems: 'flex-start',
  },
  roleList: {
    display: 'flex',
    flex: '0 1 270px',
    flexDirection: 'column',
    gap: token.marginXS,
  },
  selectorHeadingRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBlockEnd: 2,
  },
  selectorHeading: {
    margin: 0,
    color: token.colorText,
    fontSize: token.fontSize,
    fontWeight: token.fontWeightStrong,
  },
  roleButton: {
    height: 'auto',
    padding: '11px 14px',
    border: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadiusLG,
    background: token.colorBgContainer,
    textAlign: 'start',
    whiteSpace: 'normal',

    '&:hover': {
      borderColor: token.colorPrimaryBorder,
      background: token.colorPrimaryBg,
    },
  },
  roleButtonActive: {
    borderColor: token.colorPrimary,
    background: token.colorPrimaryBg,
  },
  roleButtonContent: {
    display: 'flex',
    width: '100%',
    gap: token.marginXS,
    alignItems: 'center',
  },
  roleName: {
    flex: 1,
    color: token.colorText,
    fontWeight: token.fontWeightStrong,
  },
  roleMeta: {
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
  },
  roleNote: {
    margin: 0,
    padding: '4px 2px',
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
    lineHeight: 1.7,
  },
  matrix: {
    flex: '1 1 600px',
    padding: '18px 22px',
    border: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadiusLG,
    background: token.colorBgContainer,
  },
  matrixHeader: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: token.marginXS,
    alignItems: 'center',
    marginBlockEnd: token.marginXXS,
  },
  matrixTitle: {
    margin: 0,
    color: token.colorText,
    fontSize: token.fontSizeLG,
    fontWeight: token.fontWeightStrong,
  },
  deleteButton: {
    marginInlineStart: 'auto',
  },
  matrixDescription: {
    marginBlock: `0 ${token.marginXXS}px`,
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
  },
  staticPreviewNote: {
    width: 'fit-content',
    marginBlock: `0 ${token.margin}px`,
    padding: `${token.paddingXXS}px ${token.paddingXS}px`,
    border: `${token.lineWidth}px ${token.lineType} ${token.colorPrimaryBorder}`,
    borderRadius: token.borderRadiusSM,
    background: token.colorPrimaryBg,
    color: token.colorPrimaryText,
    fontSize: token.fontSizeSM,
  },
  capabilitySections: {
    display: 'flex',
    flexDirection: 'column',
    gap: token.margin,
  },
  capabilityGroup: {
    margin: 0,
    padding: 0,
    border: 0,
  },
  capabilityLegend: {
    marginBlockEnd: token.marginXS,
    color: token.colorTextSecondary,
    fontSize: token.fontSize,
    fontWeight: token.fontWeightStrong,
  },
  checkboxGroup: {
    display: 'grid',
    width: '100%',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: token.marginXS,
  },
  checkboxOption: {
    display: 'flex',
    marginInlineStart: 0,
    padding: '10px 13px',
    border: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadius,
    alignItems: 'center',

    '&:hover': {
      borderColor: token.colorPrimary,
    },
  },
  optionBody: {
    display: 'flex',
    width: '100%',
    gap: token.marginXS,
    alignItems: 'center',
  },
  optionLabel: {
    flex: 1,
    color: token.colorText,
  },
  capabilityCode: {
    color: token.colorTextTertiary,
    fontFamily: token.fontFamilyCode,
    fontSize: token.fontSizeSM,
  },
}));
