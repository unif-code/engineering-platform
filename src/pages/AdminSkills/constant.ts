import type { SkillItem } from './type';

export const SKILL_ITEMS = Object.freeze([
  Object.freeze({
    key: 'requirement-clarifier',
    name: '需求澄清',
    version: '1.4.0',
    description: '把模糊需求整理为可验证的目标、范围与约束。',
    status: 'active',
    owner: 'Platform Product',
    updatedAt: '2026-08-10 09:30',
  }),
  Object.freeze({
    key: 'implementation-planner',
    name: '实施规划',
    version: '2.1.0',
    description: '把已确认方案拆分为可执行、可验证的交付步骤。',
    status: 'active',
    owner: 'Delivery Governance',
    updatedAt: '2026-08-09 16:20',
  }),
  Object.freeze({
    key: 'code-reviewer',
    name: '代码审查',
    version: '1.8.3',
    description: '依据变更目标审查正确性、边界与回归风险。',
    status: 'deprecated',
    owner: 'Engineering Enablement',
    updatedAt: '2026-08-06 11:45',
  }),
] as const satisfies readonly SkillItem[]);

export const SKILL_STATUS_META = {
  active: { label: 'active', tone: 'success' },
  deprecated: { label: 'deprecated', tone: 'warning' },
} as const;
