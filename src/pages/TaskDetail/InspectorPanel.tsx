import { Tabs, Typography } from 'antd';
import { SemanticTag } from '@/components/SemanticTag';
import { INSPECTOR_TABS, TASK_DETAIL_FIXTURE } from './constant';
import { useStyles } from './index.style';
import { PreviewFrame } from './PreviewFrame';
import type { InspectorTabKey } from './type';

export interface InspectorPanelProps {
  activeKey: InspectorTabKey;
  onChange: (key: InspectorTabKey) => void;
}

export function parseInspectorTabKey(key: string): InspectorTabKey | undefined {
  return INSPECTOR_TABS.find((tab) => tab.key === key)?.key;
}

export function applyInspectorTabChange(
  key: string,
  onChange: (key: InspectorTabKey) => void,
): void {
  const nextKey = parseInspectorTabKey(key);
  if (nextKey) {
    onChange(nextKey);
  }
}

export function InspectorPanel({ activeKey, onChange }: InspectorPanelProps) {
  const { styles } = useStyles();
  const panels: Record<InspectorTabKey, React.ReactNode> = {
    overview: (
      <section aria-label="任务状态摘要" className={styles.panelStack}>
        <Typography.Title className={styles.panelHeading} level={5}>
          任务进度
        </Typography.Title>
        <SemanticTag label={TASK_DETAIL_FIXTURE.status} tone="brand" />
        <dl className={styles.summaryGrid}>
          <dt>阶段</dt>
          <dd className={styles.codeText}>{TASK_DETAIL_FIXTURE.stage}</dd>
          <dt>责任人</dt>
          <dd>{TASK_DETAIL_FIXTURE.owner}</dd>
          <dt>Workspace</dt>
          <dd>{TASK_DETAIL_FIXTURE.workspace}</dd>
        </dl>
      </section>
    ),
    delivery: (
      <section aria-label="交付信息" className={styles.panelStack}>
        <Typography.Title className={styles.panelHeading} level={5}>
          文档 / Artifact
        </Typography.Title>
        <ul className={styles.itemList}>
          {[
            {
              description: 'Requirement · v3 · 产品 Agent',
              title: '需求说明.md',
            },
            {
              description: 'Plan · v2 · Planning Agent',
              title: 'implementation-plan.md',
            },
          ].map((item) => (
            <li className={styles.itemListEntry} key={item.title}>
              <Typography.Text strong>{item.title}</Typography.Text>
              <Typography.Text type="secondary">
                {item.description}
              </Typography.Text>
            </li>
          ))}
        </ul>
        <Typography.Title className={styles.panelHeading} level={5}>
          代码与执行
        </Typography.Title>
        <Typography.Text strong>
          {TASK_DETAIL_FIXTURE.repository}
        </Typography.Text>
        <Typography.Text className={styles.codeText}>
          {TASK_DETAIL_FIXTURE.branch}
        </Typography.Text>
        <Typography.Text type="secondary">
          2 个文件变更 · +138 / -12
        </Typography.Text>
        <SemanticTag label="已通过" tone="success" />
        <Typography.Text type="secondary">
          最近执行 · prototype-ui · 02:14 · 2026-08-09 16:20
        </Typography.Text>
      </section>
    ),
    preview: <PreviewFrame />,
  };

  return (
    <aside aria-label="任务 Inspector" className={styles.inspector}>
      <Tabs
        activeKey={activeKey}
        className={styles.inspectorTabs}
        destroyOnHidden
        items={INSPECTOR_TABS.map((tab) => ({
          children: panels[tab.key],
          key: tab.key,
          label: tab.label,
        }))}
        onChange={(key) => applyInspectorTabChange(key, onChange)}
        size="small"
      />
    </aside>
  );
}
