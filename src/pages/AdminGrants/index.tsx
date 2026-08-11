import {
  type ActionType,
  PageContainer,
  type ProColumns,
  ProTable,
  type ProTableProps,
} from '@ant-design/pro-components';
import { useMutation, useQuery } from '@umijs/max';
import { App, Button, Select, Space, Typography } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FilterToolbar } from '@/components/FilterToolbar';
import { SemanticTag } from '@/components/SemanticTag';
import {
  createGrant,
  formatGovernanceError,
  listAccounts,
  listGrants,
  listWorkspaces,
  revokeGrant,
} from '@/features/administration';
import { GRANT_CAPABILITY_OPTIONS, GRANT_STATUS_META } from './constant';
import { GrantModal } from './GrantModal';
import { useStyles } from './index.style';
import { RevokeGrantModal } from './RevokeGrantModal';
import type { GrantQueryParams, GrantRow, GrantSubmitInput } from './type';

const positiveInteger = (value: number | undefined, fallback: number) =>
  value !== undefined && Number.isSafeInteger(value) && value > 0
    ? value
    : fallback;

export default function AdminGrantsPage() {
  const { message } = App.useApp();
  const { styles } = useStyles();
  const actionRef = useRef<ActionType | undefined>(undefined);
  const requestSequenceRef = useRef(0);
  const [principalId, setPrincipalId] = useState<string>('all');
  const [capability, setCapability] = useState<string>('all');
  const [total, setTotal] = useState(0);
  const [grantOpen, setGrantOpen] = useState(false);
  const [revokingGrant, setRevokingGrant] = useState<GrantRow>();

  const accountsQuery = useQuery({
    queryFn: () =>
      listAccounts({
        page: 1,
        pageSize: 100,
        sortBy: 'employeeNo',
        sortOrder: 'asc',
        status: 'ENABLED',
      }),
    queryKey: ['admin-grant-principals'],
    retry: false,
  });
  const workspacesQuery = useQuery({
    queryFn: () => listWorkspaces({ page: 1, pageSize: 100, status: 'ACTIVE' }),
    queryKey: ['admin-grant-workspaces'],
    retry: false,
  });
  const createMutation = useMutation({ mutationFn: createGrant });
  const revokeMutation = useMutation({
    mutationFn: ({ grantId, reason }: { grantId: string; reason: string }) =>
      revokeGrant(grantId, { reason }),
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

  const params = useMemo<GrantQueryParams>(
    () => ({ capability, principalId }),
    [capability, principalId],
  );

  const requestGrants = useCallback<
    NonNullable<ProTableProps<GrantRow, GrantQueryParams>['request']>
  >(
    async (requestParams) => {
      const requestSequence = ++requestSequenceRef.current;
      try {
        const page = await listGrants({
          page: positiveInteger(requestParams.current, 1),
          pageSize: positiveInteger(requestParams.pageSize, 10),
          ...(requestParams.principalId && requestParams.principalId !== 'all'
            ? { principalId: requestParams.principalId }
            : {}),
          ...(requestParams.capability && requestParams.capability !== 'all'
            ? { capability: requestParams.capability }
            : {}),
        });
        if (requestSequence !== requestSequenceRef.current) {
          return { data: [], success: false, total: 0 };
        }
        setTotal(page.total);
        return { data: page.items, success: true, total: page.total };
      } catch (error) {
        if (requestSequence !== requestSequenceRef.current) {
          return { data: [], success: false, total: 0 };
        }
        setTotal(0);
        message.error(formatGovernanceError(error, 'Grant 列表加载失败'));
        return { data: [], success: true, total: 0 };
      }
    },
    [message],
  );

  const reloadGrants = useCallback(async () => {
    invalidatePendingRequests();
    await actionRef.current?.reload();
  }, [invalidatePendingRequests]);

  const principalOptions = useMemo(
    () =>
      (accountsQuery.data?.items ?? []).map(
        ({ displayName, employeeNo, id }) => ({
          label: `${employeeNo} · ${displayName}`,
          value: id,
        }),
      ),
    [accountsQuery.data?.items],
  );
  const workspaceOptions = useMemo(
    () =>
      (workspacesQuery.data?.items ?? []).map(({ id, name }) => ({
        label: name,
        value: id,
      })),
    [workspacesQuery.data?.items],
  );

  const columns = useMemo<ProColumns<GrantRow>[]>(
    () => [
      {
        dataIndex: ['principal', 'displayName'],
        render: (_, row) => (
          <span className={styles.principal}>
            <strong>{row.principal.displayName}</strong>
            <span className={styles.secondary}>{row.principal.employeeNo}</span>
          </span>
        ),
        title: 'Principal',
        width: 180,
      },
      {
        dataIndex: 'capability',
        render: (_, row) => (
          <span className={styles.code}>{row.capability}</span>
        ),
        title: 'Capability',
        width: 240,
      },
      {
        dataIndex: ['scope', 'label'],
        render: (_, row) => (
          <Space size="small">
            <SemanticTag
              label={row.scope.type === 'PLATFORM' ? 'Platform' : 'Workspace'}
              tone={row.scope.type === 'PLATFORM' ? 'purple' : 'info'}
            />
            <span>{row.scope.label}</span>
          </Space>
        ),
        title: 'Scope',
        width: 220,
      },
      {
        dataIndex: 'status',
        render: (_, row) => <SemanticTag {...GRANT_STATUS_META[row.status]} />,
        title: '状态',
        width: 110,
      },
      {
        dataIndex: 'validFrom',
        title: '生效时间',
        valueType: 'dateTime',
        width: 180,
      },
      { dataIndex: 'version', title: '版本', width: 80 },
      {
        fixed: 'right',
        render: (_, row) =>
          row.status === 'ACTIVE' ? (
            <Button danger onClick={() => setRevokingGrant(row)} type="link">
              撤销
            </Button>
          ) : (
            <Typography.Text type="secondary">已撤销</Typography.Text>
          ),
        title: '操作',
        valueType: 'option',
        width: 100,
      },
    ],
    [styles.code, styles.principal, styles.secondary],
  );

  const submitGrant = async (input: GrantSubmitInput) => {
    await createMutation.mutateAsync(input);
    await reloadGrants();
  };

  return (
    <PageContainer
      ghost
      subTitle="按 Principal × Capability × Scope 管理直接授权"
      title="Grant 管理"
    >
      <div className={styles.page}>
        <FilterToolbar
          actions={
            <Button
              aria-expanded={grantOpen}
              aria-haspopup="dialog"
              onClick={() => setGrantOpen(true)}
              type="primary"
            >
              授予能力
            </Button>
          }
          ariaLabel="Grant 筛选与操作"
          filters={
            <Space wrap>
              <Select
                aria-label="按 Principal 筛选"
                className={styles.filter}
                id="admin-grant-principal-filter"
                onChange={(nextPrincipalId) => {
                  invalidatePendingRequests();
                  setPrincipalId(nextPrincipalId);
                }}
                options={[
                  { label: '全部 Principal', value: 'all' },
                  ...principalOptions,
                ]}
                value={principalId}
                virtual={false}
              />
              <Select
                aria-label="按 Capability 筛选"
                className={styles.filter}
                id="admin-grant-capability-filter"
                onChange={(nextCapability) => {
                  invalidatePendingRequests();
                  setCapability(nextCapability);
                }}
                options={[
                  { label: '全部 Capability', value: 'all' },
                  ...GRANT_CAPABILITY_OPTIONS.map((option) => ({ ...option })),
                ]}
                value={capability}
                virtual={false}
              />
              <Typography.Text type="secondary">
                共 {total} 条 Grant
              </Typography.Text>
            </Space>
          }
        />

        <ProTable<GrantRow, GrantQueryParams>
          actionRef={actionRef}
          columns={columns}
          onChange={invalidatePendingRequests}
          options={false}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          params={params}
          request={requestGrants}
          rowKey="id"
          scroll={{ x: 1110 }}
          search={false}
          toolBarRender={false}
        />

        {grantOpen ? (
          <GrantModal
            onClose={() => setGrantOpen(false)}
            onSubmit={submitGrant}
            open
            principalOptions={principalOptions}
            workspaceOptions={workspaceOptions}
          />
        ) : null}

        {revokingGrant ? (
          <RevokeGrantModal
            grant={revokingGrant}
            onClose={() => setRevokingGrant(undefined)}
            onConfirm={async (reason) => {
              await revokeMutation.mutateAsync({
                grantId: revokingGrant.id,
                reason,
              });
              await reloadGrants();
            }}
            open
          />
        ) : null}
      </div>
    </PageContainer>
  );
}
