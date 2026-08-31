import { render, screen } from '@testing-library/react';
import { ConfigProvider } from 'antd';
import { describe, expect, it } from 'vitest';
import { RouteSnapshotPanel } from './RouteSnapshotPanel';
import type { Requirement } from './type';

const requirement: Requirement = {
  acceptanceCriteria: ['完成闭环'],
  createdAt: '2026-08-31T08:00:00Z',
  createdBy: 'account-creator',
  currentSddBaselineId: null,
  description: 'V0.4 Requirement',
  id: 'requirement-1',
  initialRepositoryId: 'repository-1',
  recordState: 'ACTIVE',
  requiredWorkItemSetHash: 'server-work-item-set-hash',
  requiredWorkItemSetVersion: 3,
  requirementVersion: 4,
  revision: 7,
  routeSnapshot: {
    requirementType: 'feat',
    requiredCapabilities: ['code.change'],
    steps: ['brainstorming', 'writing-plans'],
    version: 2,
  },
  routeSnapshotHash: 'server-route-hash',
  routeSnapshotVersion: 2,
  state: 'PREPARING',
  title: 'V0.4 flow',
  type: 'feat',
  updatedAt: '2026-08-31T08:01:00Z',
  workspaceId: 'workspace-1',
};

describe('RouteSnapshotPanel', () => {
  it('原样展示服务端 Route 与交付语义版本事实', () => {
    render(
      <ConfigProvider>
        <RouteSnapshotPanel requirement={requirement} />
      </ConfigProvider>,
    );

    expect(screen.getByText('server-route-hash')).toBeVisible();
    expect(screen.getByText('server-work-item-set-hash')).toBeVisible();
    expect(screen.getByText('code.change')).toBeVisible();
    expect(screen.getByLabelText('冻结 Route Snapshot')).toHaveTextContent(
      'writing-plans',
    );
  });

  it('Route 未声明 Capability 时展示空事实而不猜测', () => {
    render(
      <ConfigProvider>
        <RouteSnapshotPanel
          requirement={{
            ...requirement,
            routeSnapshot: { requirementType: 'feat', version: 3 },
          }}
        />
      </ConfigProvider>,
    );

    expect(screen.getByText('Route Capabilities')).toBeVisible();
    expect(screen.getByText('—')).toBeVisible();
  });
});
