import { createStyles } from 'antd-style';

export const useStyles = createStyles(({ token }) => ({
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: token.marginSM,
  },
  pageHeader: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: token.marginSM,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBlockEnd: token.marginXXS,
  },
  pageDescription: {
    margin: 0,
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
  },
  employeeNo: {
    color: token.colorTextSecondary,
    fontFamily: token.fontFamilyCode,
    fontSize: token.fontSizeSM,
  },
  userCell: {
    display: 'inline-flex',
    gap: token.marginXS,
    alignItems: 'center',
  },
  lastLogin: {
    color: token.colorTextSecondary,
    fontFamily: token.fontFamilyCode,
    fontSize: token.fontSizeSM,
  },
  pageNote: {
    margin: 0,
    color: token.colorTextTertiary,
    fontSize: token.fontSizeSM,
  },
  credential: {
    width: '100%',
  },
  credentialSecret: {
    display: 'block',
    padding: token.paddingSM,
    fontSize: token.fontSizeLG,
    wordBreak: 'break-all',
  },
}));
