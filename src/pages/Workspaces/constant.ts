import type { WorkspaceFixture } from './type';

export const WORKSPACE_FIXTURES = [
  {
    id: 'platform-core',
    name: 'Platform Core',
    description: '平台入口、Control Plane 与共享研发体验',
    members: [
      { employeeId: 'E0000', name: '周天', role: 'Owner · 超级管理员' },
      { employeeId: 'E0001', name: '孙杰', role: '平台管理员' },
      { employeeId: 'E0102', name: '林澈', role: '平台工程师' },
    ],
    repositories: [
      {
        name: 'engineering-platform',
        defaultBranch: 'main',
        status: '受保护',
      },
      {
        name: 'engineering-platform-backend',
        defaultBranch: 'main',
        status: '受保护',
      },
      {
        name: 'engineering-platform-docs',
        defaultBranch: 'main',
        status: '只读关联',
      },
    ],
  },
  {
    id: 'agent-runtime',
    name: 'Agent Runtime',
    description: 'Agent 编排、Model Route 与执行边界',
    members: [
      { employeeId: 'E0201', name: '方舟', role: 'Owner · Runtime Leader' },
      { employeeId: 'E0202', name: '宁安', role: 'Agent 工程师' },
    ],
    repositories: [
      {
        name: 'platform-orchestrator',
        defaultBranch: 'main',
        status: '受保护',
      },
      {
        name: 'model-gateway',
        defaultBranch: 'main',
        status: '受保护',
      },
    ],
  },
] as const satisfies readonly WorkspaceFixture[];

export const MEMBER_CANDIDATE_OPTIONS = [
  { label: '林一 · 平台工程师', value: 'E0108' },
  { label: '宋佳 · 前端工程师', value: 'E2004' },
  { label: '丁一 · 后端工程师', value: 'E2005' },
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

export const WORKSPACE_POLICY_ITEMS = [
  '默认分支 main 禁止直接 push',
  '合并必须通过确定性检查与人工 Review',
  'Agent 仅可写入任务分支，不继承人员凭据',
] as const;
