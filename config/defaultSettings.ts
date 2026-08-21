import { PLATFORM_NAME } from '../src/constants/brand';
import { BRAND_ORANGE } from '../src/constants/theme';

/** ProLayout 默认布局设置 */
const defaultSettings = {
  colorPrimary: BRAND_ORANGE,
  layout: 'mix',
  contentWidth: 'Fluid',
  fixedHeader: true,
  fixSiderbar: true,
  navTheme: 'realDark',
  siderWidth: 208,
  title: PLATFORM_NAME,
} as const;

export default defaultSettings;
