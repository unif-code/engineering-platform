import { createStyles } from 'antd-style';

export const useStyles = createStyles(({ token }) => ({
  departmentCard: {
    alignItems: 'stretch',
    background: token.colorBgContainer,
    border: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadiusLG,
    display: 'flex',
    flexDirection: 'column',
    gap: token.marginSM,
    height: 'auto',
    padding: token.padding,
    textAlign: 'start',
    whiteSpace: 'normal',
  },
  departmentCardSelected: {
    background: token.colorPrimaryBg,
    borderColor: token.colorPrimary,
  },
  departmentGrid: {
    display: 'grid',
    gap: token.marginSM,
    gridTemplateColumns: 'repeat(auto-fill, minmax(268px, 1fr))',
  },
  disabledAction: {
    alignItems: 'center',
    display: 'inline-flex',
    gap: token.marginXS,
  },
  departmentHeading: {
    alignItems: 'center',
    display: 'flex',
    gap: token.marginSM,
    justifyContent: 'space-between',
  },
  departmentTitle: {
    display: 'flex',
    flexDirection: 'column',
    gap: token.marginXXS,
  },
  legend: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: token.marginSM,
    '& > span': {
      alignItems: 'center',
      color: token.colorTextSecondary,
      display: 'inline-flex',
      fontSize: token.fontSizeSM,
      gap: token.marginXXS,
    },
    '& > span > span': {
      borderRadius: token.borderRadiusSM,
      height: 6,
      width: 6,
    },
  },
  memberButton: {
    alignItems: 'center',
    color: token.colorText,
    display: 'inline-flex',
    gap: token.marginXS,
    height: 'auto',
    padding: 0,
  },
  emptyOverview: {
    background: token.colorBgContainer,
    border: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadiusLG,
    gridColumn: '1 / -1',
    padding: token.paddingXL,
  },
  memberCard: {
    background: token.colorBgContainer,
    border: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadiusLG,
    overflow: 'hidden',
  },
  memberCount: {
    alignItems: 'baseline',
    display: 'flex',
    gap: token.marginXXS,
    '& strong': {
      fontSize: token.fontSizeHeading2,
      lineHeight: 1,
    },
  },
  memberHeader: {
    alignItems: 'center',
    background: token.colorFillQuaternary,
    display: 'flex',
    gap: token.marginSM,
    padding: `${token.paddingSM}px ${token.paddingLG}px`,
  },
  memberIdentity: {
    alignItems: 'center',
    display: 'inline-flex',
    gap: token.marginXS,
  },
  mix0: {
    background: token.colorPrimary,
  },
  mix1: {
    background: token.colorPrimaryHover,
  },
  mix2: {
    background: token.colorPrimaryBorder,
  },
  mix3: {
    background: token.colorFillSecondary,
  },
  mixBar: {
    borderRadius: token.borderRadiusSM,
    display: 'flex',
    gap: 2,
    height: 6,
    overflow: 'hidden',
  },
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: token.margin,
    maxWidth: 1180,
  },
  subgroups: {
    borderTop: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`,
    display: 'flex',
    flexWrap: 'wrap',
    gap: token.marginXS,
    paddingTop: token.paddingSM,
    '& > span': {
      background: token.colorFillQuaternary,
      borderRadius: token.borderRadiusSM,
      color: token.colorTextSecondary,
      fontSize: token.fontSizeSM,
      padding: `2px ${token.paddingXS}px`,
    },
  },
  toolbar: {
    alignItems: 'center',
    display: 'flex',
    gap: token.margin,
    justifyContent: 'space-between',
  },
}));
