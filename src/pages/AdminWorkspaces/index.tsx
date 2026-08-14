import {
  type ActionType,
  PageContainer,
  type ProColumns,
  ProTable,
  type ProTableProps,
} from '@ant-design/pro-components';
import { useMutation, useQuery } from '@umijs/max';
import { App, Button, Space } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SemanticTag } from '@/components/SemanticTag';
import {
  type CreateWorkspaceInput,
  createWorkspace,
  formatGovernanceError,
  getOrganizationTree,
  inviteWorkspaceLeader,
  listWorkspaceMembers,
  removeWorkspaceLeader,
  transferWorkspaceOwner,
  type WorkspaceSummary,
} from '@/features/administration';
import { useStaticPrototypeAction } from '@/hooks/useStaticPrototypeAction';
import { WORKSPACE_STATUS_META } from './constant';
import { useStyles } from './index.style';
import type { WorkspaceQueryParams, WorkspaceRow } from './type';
import {
  flattenLeaders,
  flattenOrganizationAccounts,
  queryWorkspaceRows,
} from './util';
import { WorkspaceDetailDrawer } from './WorkspaceDetailDrawer';
import { WorkspaceModal } from './WorkspaceModal';

export default function AdminWorkspacesPage() {
  const { message } = App.useApp();
  const { styles } = useStyles();
  const showStaticAction = useStaticPrototypeAction();
  const actionRef = useRef<ActionType | undefined>(undefined);
  const requestSequenceRef = useRef(0);
  const presentationOverridesRef = useRef(
    new Map<string, Partial<WorkspaceRow>>(),
  );
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
      version,
      workspaceId,
    }: {
      accountId: string;
      reason: string;
      version: number;
      workspaceId: string;
    }) => inviteWorkspaceLeader(workspaceId, { accountId, reason }, version),
  });
  const removeMutation = useMutation({
    mutationFn: ({
      accountId,
      reason,
      version,
      workspaceId,
    }: {
      accountId: string;
      reason: string;
      version: number;
      workspaceId: string;
    }) => removeWorkspaceLeader(workspaceId, accountId, { reason }, version),
  });
  const transferMutation = useMutation({
    mutationFn: ({
      accountId,
      reason,
      version,
      workspaceId,
    }: {
      accountId: string;
      reason: string;
      version: number;
      workspaceId: string;
    }) => transferWorkspaceOwner(workspaceId, { accountId, reason }, version),
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

  const allLeaders = useMemo(
    () => flattenLeaders(organizationQuery.data?.items ?? []),
    [organizationQuery.data?.items],
  );
  const accountsById = useMemo(
    () =>
      new Map(
        flattenOrganizationAccounts(organizationQuery.data?.items ?? []).map(
          (account) => [account.id, account],
        ),
      ),
    [organizationQuery.data?.items],
  );
  const resolvedMembers = useMemo(
    () =>
      membersQuery.data?.items.map((member) => {
        const account = accountsById.get(member.accountId);
        return account
          ? {
              ...member,
              displayName: account.displayName,
              employeeNo: account.employeeNo,
            }
          : member;
      }),
    [accountsById, membersQuery.data?.items],
  );
  const detailWorkspace = useMemo(() => {
    if (selectedWorkspace === undefined) {
      return undefined;
    }
    const leaders = (resolvedMembers ?? [])
      .filter(({ source }) => source === 'OWNER' || source === 'LEADER')
      .map((member) => ({
        displayName: member.displayName,
        employeeNo: member.employeeNo,
        id: member.accountId,
      }));
    return {
      ...selectedWorkspace,
      leaders,
      owner:
        accountsById.get(selectedWorkspace.owner.id) ?? selectedWorkspace.owner,
    };
  }, [accountsById, resolvedMembers, selectedWorkspace]);

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
        return {
          ...result,
          data: result.data?.map((row) => ({
            ...row,
            owner: accountsById.get(row.owner.id) ?? row.owner,
            ...presentationOverridesRef.current.get(row.id),
          })),
        };
      } catch (error) {
        if (requestSequence !== requestSequenceRef.current) {
          return { data: [], success: false, total: 0 };
        }
        message.error(formatGovernanceError(error, '工作区列表加载失败'));
        return { data: [], success: true, total: 0 };
      }
    },
    [accountsById, message],
  );

  useEffect(() => {
    if (accountsById.size > 0) {
      void actionRef.current?.reload();
    }
  }, [accountsById]);

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
          <Button
            aria-label={`查看工作区 ${row.name}`}
            className={styles.workspaceName}
            onClick={() => setSelectedWorkspace(row)}
            size="small"
            type="link"
          >
            {row.name}
          </Button>
        ),
        title: '工作区',
        width: 380,
      },
      {
        dataIndex: ['owner', 'displayName'],
        render: (_, row) => (
          <span className={styles.owner}>
            <span>{row.owner.displayName}</span>
            <span className={styles.ownerRole}>开发Leader</span>
          </span>
        ),
        title: 'Owner',
        width: 150,
      },
      {
        dataIndex: 'team',
        render: (_, row) => (
          <span className={styles.team}>● {row.team ?? '—'}</span>
        ),
        title: 'Team',
        width: 100,
      },
      {
        dataIndex: 'memberCount',
        render: (_, row) =>
          row.memberCount === undefined ? '—' : `${row.memberCount} 人`,
        title: '成员',
        width: 90,
      },
      {
        dataIndex: 'repositoryCount',
        render: (_, row) =>
          row.repositoryCount === undefined ? '—' : `${row.repositoryCount} 个`,
        title: '仓库',
        width: 90,
      },
      {
        dataIndex: 'status',
        render: (_, row) => (
          <SemanticTag {...WORKSPACE_STATUS_META[row.status]} />
        ),
        title: '状态',
        width: 90,
      },
      {
        fixed: 'right',
        render: (_, row) => (
          <Space size={0}>
            <Button
              aria-label={`查看配置 ${row.name}`}
              onClick={() => setSelectedWorkspace(row)}
              size="small"
              type="link"
            >
              查看配置
            </Button>
            <Button
              aria-label={`${row.status === 'ACTIVE' ? '归档' : '恢复'} ${row.name}`}
              onClick={() =>
                showStaticAction(
                  `${row.status === 'ACTIVE' ? '归档' : '恢复'}工作区 ${row.name}`,
                )
              }
              size="small"
              type="link"
            >
              {row.status === 'ACTIVE' ? '归档' : '恢复'}
            </Button>
          </Space>
        ),
        title: '操作',
        valueType: 'option',
        width: 150,
      },
    ],
    [
      showStaticAction,
      styles.owner,
      styles.ownerRole,
      styles.team,
      styles.workspaceName,
    ],
  );

  const createNewWorkspace = (values: CreateWorkspaceInput) =>
    createMutation.mutateAsync(values);

  const requireSelectedWorkspace = () => {
    if (selectedWorkspace === undefined) {
      throw new Error('工作区详情已关闭');
    }
    return selectedWorkspace;
  };

  return (
    <PageContainer ghost pageHeaderRender={false}>
      <div className={styles.page}>
        <header className={styles.pageHeader}>
          <p className={styles.pageDescription}>
            管理员创建工作区并指定 Owner（开发Leader）；成员与仓库由 Owner
            自行配置，管理端不代管
          </p>
          <Button
            aria-expanded={modalOpen}
            aria-haspopup="dialog"
            aria-label="创建工作区"
            onClick={() => setModalOpen(true)}
            type="primary"
          >
            ＋ 创建工作区
          </Button>
        </header>

        {organizationQuery.isLoading ? null : (
          <ProTable<WorkspaceRow, WorkspaceQueryParams>
            actionRef={actionRef}
            columns={columns}
            onChange={invalidatePendingRequests}
            options={false}
            pagination={{ pageSize: 10, showSizeChanger: false }}
            request={requestWorkspaces}
            rowKey="id"
            scroll={{ x: 1050 }}
            search={false}
            size="small"
            toolBarRender={false}
          />
        )}

        <p className={styles.pageNote}>
          每个工作区恰有一个 Owner；正式成员为动态投影（Owner + 受邀 Leader
          直属有效员工）；归档前须安全停止活动执行
        </p>

        {modalOpen ? (
          <WorkspaceModal
            leaderOptions={allLeaders}
            onClose={() => setModalOpen(false)}
            onCreated={(workspace, values) => {
              presentationOverridesRef.current.set(workspace.id, {
                repositoryCount: 0,
                team: values.team,
              });
              void reloadWorkspaces();
            }}
            onSubmit={createNewWorkspace}
            open
          />
        ) : null}

        {detailWorkspace ? (
          <WorkspaceDetailDrawer
            allLeaders={allLeaders}
            members={resolvedMembers}
            membersError={membersQuery.error}
            membersLoading={membersQuery.isLoading}
            onClose={() => setSelectedWorkspace(undefined)}
            onInvite={(accountId, reason) => {
              const workspace = requireSelectedWorkspace();
              return applyWorkspaceChange(
                inviteMutation.mutateAsync({
                  accountId,
                  reason,
                  version: workspace.version,
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
                  version: workspace.version,
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
                  version: workspace.version,
                  workspaceId: workspace.id,
                }),
              );
            }}
            open
            workspace={detailWorkspace}
          />
        ) : null}
      </div>
    </PageContainer>
  );
}
