import type { WorkspaceFixture } from './type';

export const WORKSPACE_FIXTURES = [
  {
    archived: false,
    canManage: true,
    foundRepositoryCount: 20,
    id: 'marketing',
    name: '营销工作区',
    membership: 'Owner',
    owner: '李强',
    members: [
      {
        employeeId: 'E1003',
        name: '李强',
        role: 'Owner · 开发Leader',
        tag: 'owner',
      },
      { employeeId: 'E1001', name: '王悦', role: '产品' },
      { employeeId: 'E1002', name: '吴桐', role: '产品Leader' },
      { employeeId: 'E1004', name: '陈晓', role: '前端开发' },
      { employeeId: 'E1005', name: '郑楠', role: '后端开发' },
      {
        employeeId: 'E1006',
        name: '徐蕾',
        role: '前端开发（账号已禁用）',
        tag: 'disabled',
      },
      { employeeId: 'E1008', name: '高扬', role: '后端开发' },
      {
        employeeId: 'E1007',
        name: '赵敏',
        role: '经理 · 临时协作至 09-30',
        tag: 'temporary',
      },
    ],
    repositories: [
      { name: 'mk-activity-h5', selected: true, stack: 'React' },
      { name: 'mk-miniapp', selected: true, stack: '原生小程序' },
      { name: 'mk-coupon-center', selected: true, stack: 'Vue' },
      { name: 'mk-member-app', selected: true, stack: 'RN' },
      { name: 'mk-share-sdk', selected: true, stack: 'React' },
      { name: 'mk-live-h5', selected: true, stack: 'React' },
      { name: 'mk-poster-gen', selected: true, stack: 'Java' },
      { name: 'mk-cms-admin', selected: true, stack: 'React' },
      { name: 'mk-uniapp-mall', selected: true, stack: 'uniapp' },
      { name: 'mk-data-report', selected: true, stack: 'Vue' },
      { name: 'mk-legacy-h5', selected: false, stack: 'jQuery' },
      { name: 'mk-lab-playground', selected: false, stack: 'React' },
    ],
    team: '营销',
  },
  {
    archived: true,
    canManage: true,
    foundRepositoryCount: 5,
    id: 'marketing-archive',
    name: '历史活动专区',
    membership: 'Owner',
    owner: '李强',
    members: [
      {
        employeeId: 'E1003',
        name: '李强',
        role: 'Owner · 开发Leader',
        tag: 'owner',
      },
      { employeeId: 'E1004', name: '陈晓', role: '前端开发' },
      { employeeId: 'E1001', name: '王悦', role: '产品' },
    ],
    repositories: [
      { name: 'mk-legacy-h5', selected: true, stack: 'jQuery' },
      { name: 'mk-2024-camp', selected: true, stack: 'React' },
    ],
    team: '营销',
  },
] as const satisfies readonly WorkspaceFixture[];

export const MEMBER_CANDIDATE_OPTIONS = [
  { label: '宋佳 · 前端开发 · 交易', value: 'E2004' },
  { label: '丁一 · 后端开发 · 交易', value: 'E2005' },
  { label: '白露 · 后端开发 · 中台', value: 'E3004' },
] as const;

export const COLLABORATION_TERM_OPTIONS = [
  { label: '正式成员', value: 'permanent' },
  { label: '临时协作 · 30 天', value: '30-days' },
  { label: '临时协作 · 90 天', value: '90-days' },
] as const;

export const GITLAB_CONNECTION = {
  url: 'https://git.corp.example.com',
  credentialReference: 'secrets/gitlab/workspaces',
  scope: 'read_repository / write_repository',
} as const;
