import type { ProDescriptionsProps } from '@ant-design/pro-components';
import type { BubbleItemType } from '@ant-design/x';
import type {
  ArtifactRecord,
  DiffFile,
  InspectorTabKey,
  TaskDetailFixture,
} from './type';

export const TASK_DETAIL_FIXTURE: TaskDetailFixture = Object.freeze({
  id: 'REQ-2026-0142',
  title: '统一任务创建链路',
  status: '运行中',
  stage: 'Implementation',
  owner: '陈晓',
  workspace: '平台工作区',
  repository: 'engineering-platform',
  branch: 'feat/prototype-ui',
});

export const ARTIFACT_RECORD: ArtifactRecord = Object.freeze({
  name: '需求说明.md',
  kind: 'Requirement',
  path: 'docs/artifacts/REQ-2026-0142/需求说明.md',
  version: 'v3',
  author: '产品 Agent',
  updatedAt: '2026-08-09 16:12',
});

export const artifactColumns: NonNullable<
  ProDescriptionsProps<ArtifactRecord>['columns']
> = [
  {
    copyable: true,
    dataIndex: 'name',
    title: '名称',
    valueType: 'text',
  },
  { dataIndex: 'kind', title: '类型', valueType: 'text' },
  {
    copyable: true,
    dataIndex: 'path',
    title: '路径',
    valueType: 'text',
  },
  { dataIndex: 'version', title: '版本', valueType: 'text' },
  { dataIndex: 'author', title: '生成者', valueType: 'text' },
  { dataIndex: 'updatedAt', title: '更新时间', valueType: 'text' },
];

export const CONVERSATION_ITEMS: BubbleItemType[] = [
  {
    content: 'Clarification · 需求澄清',
    dividerProps: { plain: true },
    key: 'clarification-divider',
    role: 'divider',
  },
  {
    content: '请将任务创建、分配和审计证据串成统一入口。',
    header: '陈晓 · 需求方',
    key: 'clarification-user',
    role: 'user',
  },
  {
    content: '已确认静态原型边界：只展示流程，不写入业务数据。',
    header: '产品 Agent',
    key: 'clarification-agent',
    role: 'ai',
  },
  {
    content: 'Implementation · 实现',
    dividerProps: { plain: true },
    key: 'implementation-divider',
    role: 'divider',
  },
  {
    content: '已完成任务详情页面结构拆分。',
    header: '前端 Agent',
    key: 'implementation-agent',
    role: 'ai',
  },
  {
    content: '等待人工检查 Artifact 与完整 Diff。',
    header: 'Review Gate',
    key: 'review-gate',
    role: 'ai',
  },
];

export const INSPECTOR_TABS: readonly {
  key: InspectorTabKey;
  label: string;
}[] = [
  { key: 'overview', label: '总览' },
  { key: 'documents', label: '文档' },
  { key: 'code', label: '代码' },
  { key: 'execution', label: '执行' },
  { key: 'preview', label: '预览' },
];

export const DIFF_FILES: readonly DiffFile[] = [
  {
    path: 'src/pages/TaskDetail/index.tsx',
    summary: '+86 / -12',
    lines: [
      {
        content: '  export default function TaskDetailPage() {',
        key: 'detail-context',
        kind: 'context',
      },
      {
        content: '+ 增加任务详情页',
        key: 'detail-addition',
        kind: 'addition',
      },
      {
        content: '- 移除旧占位内容',
        key: 'detail-removal',
        kind: 'removal',
      },
    ],
  },
  {
    path: 'src/components/DetailDrawer/index.tsx',
    summary: '+52 / -0',
    lines: [
      {
        content: '+ export function DetailDrawer<TRecord>() {',
        key: 'drawer-addition',
        kind: 'addition',
      },
      {
        content: '    return <Drawer destroyOnHidden />;',
        key: 'drawer-context',
        kind: 'context',
      },
    ],
  },
];
