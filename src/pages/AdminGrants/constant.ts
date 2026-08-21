export const GRANT_FILTER_OPTIONS = [
  { label: '全部', value: 'all' },
  {
    disabled: true,
    label: '高危能力',
    tooltip: '当前版本暂未接入',
    value: 'high-risk',
  },
  { label: '临时授权', value: 'temporary' },
  { label: '角色继承', value: 'inherited' },
] as const;

export const GRANT_PRINCIPAL_TYPE_OPTIONS = [
  { label: '用户', value: 'ACCOUNT' },
] as const;

export const GRANT_VALIDITY_OPTIONS = [
  { label: '长期', value: 'LONG_TERM' },
  {
    disabled: true,
    label: '30 天临时（当前版本暂未接入）',
    value: 'TEMPORARY_30',
  },
  {
    disabled: true,
    label: '90 天临时（当前版本暂未接入）',
    value: 'TEMPORARY_90',
  },
] as const;
