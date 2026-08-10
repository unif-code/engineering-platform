import { BRAND_ORANGE } from '../src/constants/theme';

/** ProLayout 默认布局设置 */
const defaultSettings = {
  colorPrimary: BRAND_ORANGE,
  layout: 'mix',
  contentWidth: 'Fluid',
  fixedHeader: true,
  fixSiderbar: true,
  title: '内部研发平台',
} as const;

export default defaultSettings;
