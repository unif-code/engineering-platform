import {
  type ActionType,
  PageContainer,
  type ProColumns,
  ProTable,
  type ProTableProps,
} from '@ant-design/pro-components';
import { useMutation, useQuery } from '@umijs/max';
import { App, Button, Input, Select, Space, Typography } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FilterToolbar } from '@/components/FilterToolbar';
import { SemanticTag } from '@/components/SemanticTag';
import {
  createWorkspace,
  formatGovernanceError,
  getOrganizationTree,
  inviteWorkspaceLeader,
  listWorkspaceMembers,
  removeWorkspaceLeader,
  transferWorkspaceOwner,
  type WorkspaceSummary,
} from '@/features/administration';
import { WORKSPACE_STATUS_META, WORKSPACE_STATUS_OPTIONS } from './constant';
import { useStyles } from './index.style';
import type {
  WorkspaceFormValues,
  WorkspaceQueryParams,
  WorkspaceRow,
} from './type';
import { flattenLeaders, queryWorkspaceRows } from './util';
import { WorkspaceDetailDrawer } from './WorkspaceDetailDrawer';
import { WorkspaceModal } from './WorkspaceModal';

export default function AdminWorkspacesPage() {
  const { message } = App.useApp();
  const { styles } = useStyles();
  const actionRef = useRef<ActionType | undefined>(undefined);
  const requestSequenceRef = useRef(0);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] =
    useState<NonNullable<WorkspaceQueryParams['status']>>('all');
  const [total, setTotal] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<WorkspaceRow>();

  const organizationQuery = useQuery({
    queryFn: getOrganizationTree,
    queryKey: ['admin-organization'],
    retry: false,
  });
  const membersQuery = useQuery({
    enabled: selectedWorkspace !== undefined,
    queryFn: () => listWorkspaceMembers(selectedWorkspace?.id ?? ''),
    queryKey: ['admin-workspace-members', selectedWorkspace?.id],
    retry: false,
  });
  const createMutation = useMutation({ mutationFn: createWorkspace });
  const inviteMutation = useMutation({
    mutationFn: ({
      accountId,
      reason,
      workspaceId,
    }: {
      accountId: string;
      reason: string;
      workspaceId: string;
    }) => inviteWorkspaceLeader(workspaceId, { accountId, reason }),
  });
  const removeMutation = useMutation({
    mutationFn: ({
      accountId,
      reason,
      workspaceId,
    }: {
      accountId: string;
      reason: string;
      workspaceId: string;
    }) => removeWorkspaceLeader(workspaceId, accountId, { reason }),
  });
  const transferMutation = useMutation({
    mutationFn: ({
      accountId,
      reason,
      workspaceId,
    }: {
      accountId: string;
      reason: string;
      workspaceId: string;
    }) => transferWorkspaceOwner(workspaceId, { accountId, reason }),
  });

  const invalidatePendingRequests = useCallback(() => {
    requestSequenceRef.current += 1;
  }, []);

  useEffect(
    () => () => {
      invalidatePendingRequests();
    },
    [invalidatePendingRequests],
  );

  const queryParams = useMemo<WorkspaceQueryParams>(
    () => ({ keyword, status }),
    [keyword, status],
  );
  const allLeaders = useMemo(
    () => flattenLeaders(organizationQuery.data?.items ?? []),
    [organizationQuery.data?.items],
  );

  const requestWorkspaces = useCallback<
    NonNullable<ProTableProps<WorkspaceRow, WorkspaceQueryParams>['request']>
  >(
    async (params, sort, filter) => {
      const requestSequence = ++requestSequenceRef.current;
      try {
        const result = await queryWorkspaceRows(params, sort, filter);
        if (requestSequence !== requestSequenceRef.current) {
          return { data: [], success: false, total: 0 };
        }
        setTotal(result.total ?? 0);
        return result;
      } catch (error) {
        if (requestSequence !== requestSequenceRef.current) {
          return { data: [], success: false, total: 0 };
        }
        setTotal(0);
        message.error(formatGovernanceError(error, '工作区列表加载失败'));
        return { data: [], success: true, total: 0 };
      }
    },
    [message],
  );

  const reloadWorkspaces = useCallback(async () => {
    invalidatePendingRequests();
    await actionRef.current?.reload();
  }, [invalidatePendingRequests]);

  const applyWorkspaceChange = useCallback(
    async (change: Promise<WorkspaceSummary>) => {
      const workspace = await change;
      setSelectedWorkspace(workspace);
      await Promise.all([reloadWorkspaces(), membersQuery.refetch()]);
    },
    [membersQuery.refetch, reloadWorkspaces],
  );

  const columns = useMemo<ProColumns<WorkspaceRow>[]>(
    () => [
      {
        dataIndex: 'name',
        render: (_, row) => (
          <span className={styles.workspaceName}>
            <strong>{row.name}</strong>
            <span className={styles.workspaceId}>{row.id}</span>
          </span>
        ),
        title: '工作区',
        width: 260,
      },
      {
        dataIndex: ['owner', 'displayName'],
        render: (_, row) => row.owner.displayName,
        title: 'Owner',
        width: 160,
      },
      { dataIndex: 'memberCount', title: '成员数', width: 110 },
      {
        dataIndex: 'leaders',
        render: (_, row) => row.leaders.length,
        title: 'Leader 数',
        width: 110,
      },
      {
        dataIndex: 'status',
        render: (_, row) => (
          <SemanticTag {...WORKSPACE_STATUS_META[row.status]} />
        ),
        title: '状态',
        width: 120,
      },
      { dataIndex: 'version', title: '版本', width: 100 },
      {
        fixed: 'right',
        render: (_, row) => (
          <Space size={0}>
            <Button onClick={() => setSelectedWorkspace(row)} type="link">
              查看
            </Button>
          </Space>
        ),
        title: '操作',
        valueType: 'option',
        width: 190,
      },
    ],
    [styles.workspaceId, styles.workspaceName],
  );

  const createNewWorkspace = (values: WorkspaceFormValues) =>
    createMutation.mutateAsync(values);

  const requireSelectedWorkspace = () => {
    if (selectedWorkspace === undefined) {
      throw new Error('工作区详情已关闭');
    }
    return selectedWorkspace;
  };

  return (
    <PageContainer
      ghost
      subTitle="管理工作区 Owner、Leader 与只读成员投影"
      title="工作区管理"
    >
      <div className={styles.page}>
        <FilterToolbar
          actions={
            <Button
              aria-expanded={modalOpen}
              aria-haspopup="dialog"
              onClick={() => setModalOpen(true)}
              type="primary"
            >
              创建工作区
            </Button>
          }
          ariaLabel="工作区筛选与操作"
          filters={
            <Space wrap>
              <Select<NonNullable<WorkspaceQueryParams['status']>>
                aria-label="工作区状态"
                className={styles.filter}
                id="admin-workspace-status-filter"
                onChange={(nextStatus) => {
                  if (nextStatus !== status) {
                    invalidatePendingRequests();
                    setStatus(nextStatus);
                  }
                }}
                options={WORKSPACE_STATUS_OPTIONS.map((option) => ({
                  ...option,
                }))}
                value={status}
                virtual={false}
              />
              <Typography.Text type="secondary">
                共 {total} 个工作区
              </Typography.Text>
            </Space>
          }
          search={
            <Input.Search
              allowClear
              aria-label="搜索工作区"
              className={styles.search}
              onChange={(event) => {
                const nextKeyword = event.target.value;
                if (nextKeyword !== keyword) {
                  invalidatePendingRequests();
                  setKeyword(nextKeyword);
                }
              }}
              placeholder="名称 / Owner / 工作区 ID"
              value={keyword}
            />
          }
        />

        <ProTable<WorkspaceRow, WorkspaceQueryParams>
          actionRef={actionRef}
          columns={columns}
          key={JSON.stringify(queryParams)}
          onChange={invalidatePendingRequests}
          options={false}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          params={queryParams}
          request={requestWorkspaces}
          rowKey="id"
          scroll={{ x: 1050 }}
          search={false}
          toolBarRender={false}
        />

        {modalOpen ? (
          <WorkspaceModal
            leaderOptions={allLeaders}
            onClose={() => setModalOpen(false)}
            onCreated={() => void reloadWorkspaces()}
            onSubmit={createNewWorkspace}
            open
          />
        ) : null}

        {selectedWorkspace ? (
          <WorkspaceDetailDrawer
            allLeaders={allLeaders}
            members={membersQuery.data?.items}
            membersError={membersQuery.error}
            membersLoading={membersQuery.isLoading}
            onClose={() => setSelectedWorkspace(undefined)}
            onInvite={(accountId, reason) => {
              const workspace = requireSelectedWorkspace();
              return applyWorkspaceChange(
                inviteMutation.mutateAsync({
                  accountId,
                  reason,
                  workspaceId: workspace.id,
                }),
              );
            }}
            onMembersRetry={() => void membersQuery.refetch()}
            onRemove={(accountId, reason) => {
              const workspace = requireSelectedWorkspace();
              return applyWorkspaceChange(
                removeMutation.mutateAsync({
                  accountId,
                  reason,
                  workspaceId: workspace.id,
                }),
              );
            }}
            onTransfer={(accountId, reason) => {
              const workspace = requireSelectedWorkspace();
              return applyWorkspaceChange(
                transferMutation.mutateAsync({
                  accountId,
                  reason,
                  workspaceId: workspace.id,
                }),
              );
            }}
            open
            workspace={selectedWorkspace}
          />
        ) : null}
      </div>
    </PageContainer>
  );
}
