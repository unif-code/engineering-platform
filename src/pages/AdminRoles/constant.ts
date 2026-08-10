import type { CapabilityGroup, RoleFixture } from './type';

export const CAPABILITY_GROUPS = Object.freeze([
  Object.freeze({
    key: 'requirement',
    title: 'Requirement Capability',
    description: '控制 Requirement 的读取、管理与审核动作。',
    capabilities: Object.freeze([
      Object.freeze({ id: 'requirement.read', label: 'View Requirement' }),
      Object.freeze({ id: 'requirement.manage', label: 'Manage Requirement' }),
      Object.freeze({ id: 'requirement.review', label: 'Review Requirement' }),
    ]),
  }),
  Object.freeze({
    key: 'artifact',
    title: 'Artifact Capability',
    description: '控制 Artifact 的读取、提交与验收动作。',
    capabilities: Object.freeze([
      Object.freeze({ id: 'artifact.read', label: 'View Artifact' }),
      Object.freeze({ id: 'artifact.submit', label: 'Submit Artifact' }),
      Object.freeze({ id: 'artifact.accept', label: 'Accept Artifact' }),
    ]),
  }),
  Object.freeze({
    key: 'execution',
    title: 'Execution Capability',
    description: '控制 Execution 的读取、启动与控制动作。',
    capabilities: Object.freeze([
      Object.freeze({ id: 'execution.read', label: 'View Execution' }),
      Object.freeze({ id: 'execution.start', label: 'Start Execution' }),
      Object.freeze({ id: 'execution.control', label: 'Control Execution' }),
    ]),
  }),
  Object.freeze({
    key: 'promotion',
    title: 'Promotion Capability',
    description: '控制 Promotion 的读取、发起与审批动作。',
    capabilities: Object.freeze([
      Object.freeze({ id: 'promotion.read', label: 'View Promotion' }),
      Object.freeze({ id: 'promotion.request', label: 'Request Promotion' }),
      Object.freeze({ id: 'promotion.approve', label: 'Approve Promotion' }),
    ]),
  }),
] as const satisfies readonly CapabilityGroup[]);

export const ROLE_FIXTURES = Object.freeze([
  Object.freeze({
    id: 'platform-admin',
    name: 'Platform Admin',
    description: '维护平台级 Role 模板与治理边界。',
    capabilities: Object.freeze([
      'requirement.read',
      'requirement.manage',
      'requirement.review',
      'artifact.read',
      'artifact.submit',
      'artifact.accept',
      'execution.read',
      'execution.start',
      'execution.control',
      'promotion.read',
      'promotion.request',
      'promotion.approve',
    ]),
    memberCount: 4,
  }),
  Object.freeze({
    id: 'workspace-admin',
    name: 'Workspace Admin',
    description: '管理 Workspace 内的 Requirement、Artifact 与执行协作。',
    capabilities: Object.freeze([
      'requirement.read',
      'requirement.manage',
      'requirement.review',
      'artifact.read',
      'artifact.submit',
      'artifact.accept',
      'execution.read',
      'execution.start',
      'execution.control',
      'promotion.read',
      'promotion.request',
    ]),
    memberCount: 8,
  }),
  Object.freeze({
    id: 'developer',
    name: 'Developer',
    description: '交付 Artifact，并发起受控 Execution 与 Promotion。',
    capabilities: Object.freeze([
      'requirement.read',
      'requirement.manage',
      'artifact.read',
      'artifact.submit',
      'execution.read',
      'execution.start',
      'execution.control',
      'promotion.read',
      'promotion.request',
    ]),
    memberCount: 26,
  }),
  Object.freeze({
    id: 'reviewer',
    name: 'Reviewer',
    description: '审核 Requirement、验收 Artifact 并审批 Promotion。',
    capabilities: Object.freeze([
      'requirement.read',
      'requirement.review',
      'artifact.read',
      'artifact.accept',
      'execution.read',
      'promotion.read',
      'promotion.approve',
    ]),
    memberCount: 11,
  }),
] as const satisfies readonly RoleFixture[]);
