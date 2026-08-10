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
    width: 300,
    maxWidth: '100%',
  },
  employeeId: {
    fontFamily: token.fontFamilyCode,
  },
  roles: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: token.marginXXS,
  },
}));
