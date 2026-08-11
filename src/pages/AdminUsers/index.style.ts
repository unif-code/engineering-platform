import { createStyles } from 'antd-style';

export const useStyles = createStyles(({ token }) => ({
  page: {
    display: 'flex',
    minWidth: 0,
    flexDirection: 'column',
    gap: token.margin,
  },
  filters: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: token.marginSM,
  },
  filter: {
    minWidth: 144,
  },
  search: {
    width: 180,
    maxWidth: '100%',
  },
  searchFields: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: token.marginSM,
  },
  employeeNo: {
    fontFamily: token.fontFamilyCode,
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
