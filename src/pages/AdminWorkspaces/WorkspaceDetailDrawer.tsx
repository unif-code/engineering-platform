import type { ProDescriptionsProps } from '@ant-design/pro-components';
import { Alert, Button, Empty, Space, Table, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { DetailDrawer } from '@/components/DetailDrawer';
import { SemanticTag } from '@/components/SemanticTag';
import {
  formatGovernanceError,
  type WorkspaceAccountRef,
  type WorkspaceMember,
} from '@/features/administration';
import {
  WORKSPACE_MEMBER_SOURCE_META,
  WORKSPACE_STATUS_META,
} from './constant';
import { useStyles } from './index.style';
import type {
  WorkspaceActionFormValues,
  WorkspaceActionState,
  WorkspaceRow,
} from './type';
import { WorkspaceActionModal } from './WorkspaceActionModal';

interface WorkspaceDetailDrawerProps {
  allLeaders: readonly WorkspaceAccountRef[];
  members?: readonly WorkspaceMember[];
  membersError?: unknown;
  membersLoading: boolean;
  onClose: () => void;
  onInvite: (accountId: string, reason: string) => Promise<void>;
  onMembersRetry: () => void;
  onRemove: (accountId: string, reason: string) => Promise<void>;
  onTransfer: (accountId: string, reason: string) => Promise<void>;
  open: boolean;
  workspace: WorkspaceRow;
}

export function WorkspaceDetailDrawer({
  allLeaders,
  members,
  membersError,
  membersLoading,
  onClose,
  onInvite,
  onMembersRetry,
  onRemove,
  onTransfer,
  open,
  workspace,
}: WorkspaceDetailDrawerProps) {
  const { styles } = useStyles();
  const [actionState, setActionState] = useState<WorkspaceActionState>();

  const descriptionColumns = useMemo<
    NonNullable<ProDescriptionsProps<WorkspaceRow>['columns']>
  >(
    () => [
      { dataIndex: 'id', label: '工作区 ID', copyable: true },
      { dataIndex: 'name', label: '名称' },
      {
        dataIndex: ['owner', 'displayName'],
        label: 'Owner',
        render: () => workspace.owner.displayName,
      },
      {
        dataIndex: 'status',
        label: '状态',
        render: () => (
          <SemanticTag {...WORKSPACE_STATUS_META[workspace.status]} />
        ),
      },
      {
        dataIndex: 'memberCount',
        label: '成员数',
        render: () => members?.length ?? '—',
      },
      { dataIndex: 'version', label: '版本' },
    ],
    [members?.length, workspace],
  );

  const invitedLeaderIds = useMemo(
    () => new Set(workspace.leaders.map(({ id }) => id)),
    [workspace.leaders],
  );
  const inviteCandidates = allLeaders.filter(
    ({ id }) => !invitedLeaderIds.has(id),
  );
  const transferCandidates = workspace.leaders.filter(
    ({ id }) => id !== workspace.owner.id,
  );

  const confirmAction = async (values: WorkspaceActionFormValues) => {
    if (actionState === undefined) {
      return;
    }
    const accountId = actionState.leader?.id ?? values.accountId;
    if (accountId === undefined) {
      throw new Error('请选择目标账号');
    }
    if (actionState.action === 'invite') {
      await onInvite(accountId, values.reason);
    } else if (actionState.action === 'remove') {
      await onRemove(accountId, values.reason);
    } else {
      await onTransfer(accountId, values.reason);
    }
    setActionState(undefined);
  };

  return (
    <DetailDrawer<WorkspaceRow>
      columns={descriptionColumns}
      dataSource={workspace}
      extra={
        <Space wrap>
          <Button onClick={() => setActionState({ action: 'invite' })}>
            邀请 Leader
          </Button>
          <Button
            disabled={transferCandidates.length === 0}
            onClick={() => setActionState({ action: 'transfer' })}
          >
            转让 Owner
          </Button>
        </Space>
      }
      onClose={onClose}
      open={open}
      size="large"
      title={`工作区详情：${workspace.name}`}
    >
      <Typography.Title level={5}>Leader 名单</Typography.Title>
      {workspace.leaders.length === 0 ? (
        <Empty description="暂无 Leader" />
      ) : (
        <ul aria-label="Leader 名单" className={styles.leaderList}>
          {workspace.leaders.map((leader) => {
            const isOwner = leader.id === workspace.owner.id;
            return (
              <li
                aria-label={`${leader.displayName} Leader`}
                className={styles.leader}
                key={leader.id}
              >
                <span className={styles.leaderIdentity}>
                  <Typography.Text strong>{leader.displayName}</Typography.Text>
                  <Typography.Text type="secondary">
                    {leader.employeeNo}
                  </Typography.Text>
                  {isOwner ? <SemanticTag label="Owner" tone="purple" /> : null}
                </span>
                {isOwner ? (
                  <span title="请先转让 Owner">
                    <Button
                      aria-label={`移除 Leader ${leader.displayName}`}
                      disabled
                      size="small"
                    >
                      移除
                    </Button>
                  </span>
                ) : (
                  <Button
                    aria-label={`移除 Leader ${leader.displayName}`}
                    danger
                    onClick={() => setActionState({ action: 'remove', leader })}
                    size="small"
                    type="link"
                  >
                    移除
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Typography.Title level={5}>成员投影（只读）</Typography.Title>
      <Typography.Paragraph type="secondary">
        成员来源：Owner / Leader / 直属
      </Typography.Paragraph>
      {membersError ? (
        <Alert
          action={<Button onClick={onMembersRetry}>重试</Button>}
          title={formatGovernanceError(membersError, '成员投影加载失败')}
          showIcon
          type="error"
        />
      ) : (
        <Table<WorkspaceMember>
          columns={[
            { dataIndex: 'employeeNo', title: '员工编号', width: 120 },
            { dataIndex: 'displayName', title: '姓名' },
            {
              dataIndex: 'source',
              render: (source: WorkspaceMember['source']) => (
                <SemanticTag {...WORKSPACE_MEMBER_SOURCE_META[source]} />
              ),
              title: '来源',
              width: 120,
            },
          ]}
          dataSource={[...(members ?? [])]}
          loading={membersLoading}
          pagination={false}
          rowKey="accountId"
          size="small"
        />
      )}

      {actionState ? (
        <WorkspaceActionModal
          action={actionState.action}
          candidates={
            actionState.action === 'transfer'
              ? transferCandidates
              : inviteCandidates
          }
          leader={actionState.leader}
          onClose={() => setActionState(undefined)}
          onConfirm={confirmAction}
          open
          workspace={workspace}
        />
      ) : null}
    </DetailDrawer>
  );
}
