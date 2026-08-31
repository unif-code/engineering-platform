import type { DescriptionsProps } from 'antd';
import { Descriptions, Tag, Typography } from 'antd';
import { useWorkflowStyles } from './index.style';
import type { Requirement } from './type';

export interface RouteSnapshotPanelProps {
  requirement: Requirement;
}

function requiredCapabilities(
  snapshot: Requirement['routeSnapshot'],
): string[] {
  const value = snapshot.requiredCapabilities;
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

export function RouteSnapshotPanel({ requirement }: RouteSnapshotPanelProps) {
  const { styles } = useWorkflowStyles();
  const capabilities = requiredCapabilities(requirement.routeSnapshot);
  const items: DescriptionsProps['items'] = [
    {
      children: requirement.routeSnapshotVersion,
      key: 'routeSnapshotVersion',
      label: 'Route Snapshot Version',
    },
    {
      children: (
        <code className={styles.code}>{requirement.routeSnapshotHash}</code>
      ),
      key: 'routeSnapshotHash',
      label: 'Route Snapshot Hash',
    },
    {
      children: requirement.requirementVersion,
      key: 'requirementVersion',
      label: 'Requirement Version',
    },
    {
      children: requirement.requiredWorkItemSetVersion,
      key: 'requiredWorkItemSetVersion',
      label: 'WorkItem Set Version',
    },
    {
      children: (
        <code className={styles.code}>
          {requirement.requiredWorkItemSetHash}
        </code>
      ),
      key: 'requiredWorkItemSetHash',
      label: 'WorkItem Set Hash',
    },
    {
      children:
        capabilities.length > 0
          ? capabilities.map((capability) => (
              <Tag key={capability}>{capability}</Tag>
            ))
          : '—',
      key: 'requiredCapabilities',
      label: 'Route Capabilities',
    },
  ];

  return (
    <section aria-labelledby="route-snapshot-title" className={styles.panel}>
      <Typography.Title
        className={styles.panelTitle}
        id="route-snapshot-title"
        level={3}
      >
        Route 与交付版本
      </Typography.Title>
      <Descriptions bordered column={2} items={items} size="small" />
      <section aria-label="冻结 Route Snapshot">
        <pre className={styles.json}>
          {JSON.stringify(requirement.routeSnapshot, null, 2)}
        </pre>
      </section>
    </section>
  );
}
