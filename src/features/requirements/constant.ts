import type { SemanticTone } from '@/types/presentation';
import type { RequirementState, RequirementType } from './type';

interface RequirementMeta {
  label: string;
  tone: SemanticTone;
}

export const REQUIREMENT_TYPE_META: Record<RequirementType, RequirementMeta> = {
  chore: { label: '工程事务', tone: 'neutral' },
  feat: { label: '功能', tone: 'brand' },
  fix: { label: '缺陷修复', tone: 'danger' },
  refactor: { label: '重构', tone: 'purple' },
};

export const REQUIREMENT_STATE_META: Record<RequirementState, RequirementMeta> =
  {
    AWAITING_CONFIRMATION: { label: '待确认', tone: 'warning' },
    CANCELED: { label: '已取消', tone: 'neutral' },
    CREATED: { label: '已创建', tone: 'info' },
    IN_PROGRESS: { label: '进行中', tone: 'brand' },
    PREPARING: { label: '准备中', tone: 'info' },
    READY: { label: '已就绪', tone: 'success' },
    VERIFYING: { label: '验证中', tone: 'purple' },
  };

export const REQUIREMENT_PAGE_SIZE = 20;
