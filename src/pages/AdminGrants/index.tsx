import { PlusOutlined } from '@ant-design/icons';
import {
  type ActionType,
  PageContainer,
  type ProColumns,
  ProTable,
  type ProTableProps,
} from '@ant-design/pro-components';
import { useMutation, useQuery } from '@umijs/max';
import { App, Button, Segmented, Typography } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SemanticTag } from '@/components/SemanticTag';
import {
  createGrant,
  formatGovernanceError,
  listAccounts,
  listGrants,
  listWorkspaces,
  revokeGrant,
} from '@/features/administration';
import {
  GRANT_CAPABILITY_LABELS,
  GRANT_FILTER_OPTIONS,
  GRANT_PRINCIPAL_META,
  INHERITED_GRANT_ROWS,
  toGrantRow,
} from './constant';
import { GrantModal } from './GrantModal';
import { useStyles } from './index.style';
import { RevokeGrantModal } from './RevokeGrantModal';
import type {
  GrantPrincipalOption,
  GrantQueryParams,
  GrantRow,
  GrantScopeOption,
  GrantSubmitInput,
  GrantViewFilter,
} from './type';

export default function AdminGrantsPage() {
  const { message } = App.useApp();
  const { styles } = useStyles();
  const actionRef = useRef<ActionType | undefined>(undefined);
  const requestSequenceRef = useRef(0);
  const [viewFilter, setViewFilter] = useState<GrantViewFilter>('all');
  const [allGrants, setAllGrants] = useState<GrantRow[]>([]);
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
    () => ({ filter: viewFilter }),
    [viewFilter],
  );

  const requestGrants = useCallback<
    NonNullable<ProTableProps<GrantRow, GrantQueryParams>['request']>
  >(
    async (requestParams) => {
      const requestSequence = ++requestSequenceRef.current;
      try {
        const page = await listGrants({
          page: 1,
          pageSize: 100,
        });
        if (requestSequence !== requestSequenceRef.current) {
          return { data: [], success: false, total: 0 };
        }
        const rows = [...page.items.map(toGrantRow), ...INHERITED_GRANT_ROWS];
        setAllGrants(rows);
        const data = rows.filter((grant) => {
          if (requestParams.filter === 'high-risk') {
            return grant.risk === 'HIGH';
          }
          if (requestParams.filter === 'temporary') {
            return grant.validTo !== null;
          }
          if (requestParams.filter === 'inherited') {
            return grant.source === 'INHERITED';
          }
          return true;
        });
        return { data, success: true, total: data.length };
      } catch (error) {
        if (requestSequence !== requestSequenceRef.current) {
          return { data: [], success: false, total: 0 };
        }
        setAllGrants([]);
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

  const principalOptions = useMemo<GrantPrincipalOption[]>(
    () => [
      ...(accountsQuery.data?.items ?? []).map(
        ({ displayName, employeeNo, id }) => ({
          label: `${employeeNo} · ${displayName}`,
          type: 'ACCOUNT' as const,
          value: id,
        }),
      ),
      { label: '管理员', type: 'ROLE', value: 'role-administrator' },
      {
        label: '开发Leader',
        type: 'ROLE',
        value: 'role-development-leader',
      },
      {
        label: 'svc-agent-runner',
        type: 'SERVICE_ACCOUNT',
        value: 'service-agent-runner',
      },
    ],
    [accountsQuery.data?.items],
  );
  const scopeOptions = useMemo<GrantScopeOption[]>(
    () => [
      { label: '全平台', type: 'PLATFORM', value: 'PLATFORM' },
      ...(workspacesQuery.data?.items ?? []).map(({ id, name }) => ({
        label: name,
        type: 'WORKSPACE' as const,
        value: id,
      })),
      ...['营销部门', '交易部门', '中台部门'].map((label) => ({
        label,
        type: 'DEPARTMENT' as const,
        value: `department-${label}`,
      })),
    ],
    [workspacesQuery.data?.items],
  );

  const grantStats = useMemo(
    () => [
      {
        label: '生效中授权',
        value: allGrants.filter(({ status }) => status === 'ACTIVE').length,
      },
      {
        label: '临时授权',
        value: allGrants.filter(({ validTo }) => validTo !== null).length,
      },
      {
        label: '高危能力授权',
        value: allGrants.filter(({ risk }) => risk === 'HIGH').length,
      },
      {
        label: '角色继承',
        value: allGrants.filter(({ source }) => source === 'INHERITED').length,
      },
    ],
    [allGrants],
  );

  const columns = useMemo<ProColumns<GrantRow>[]>(
    () => [
      {
        dataIndex: ['principal', 'displayName'],
        render: (_, row) => (
          <span className={styles.principal}>
            <SemanticTag {...GRANT_PRINCIPAL_META[row.principal.type]} />
            <span>{row.principal.displayName}</span>
          </span>
        ),
        title: '主体',
        width: 170,
      },
      {
        dataIndex: 'capability',
        render: (_, row) => (
          <span className={styles.capability}>
            <span>
              {GRANT_CAPABILITY_LABELS[row.capability] ?? row.capability}
            </span>
            <span className={styles.code}>{row.capability}</span>
          </span>
        ),
        title: '能力',
        width: 150,
      },
      {
        dataIndex: ['scope', 'label'],
        title: '范围',
        width: 130,
      },
      {
        dataIndex: 'source',
        render: (_, row) => (row.source === 'DIRECT' ? '直接' : '继承'),
        title: '来源',
        width: 80,
      },
      {
        key: 'validity',
        render: (_, row) => (
          <Typography.Text type="secondary">
            {row.validFrom?.slice(0, 10) ?? '立即'} 起 · 至{' '}
            {row.validTo?.slice(0, 10) ?? '长期'}
          </Typography.Text>
        ),
        title: '生效期',
        width: 170,
      },
      {
        dataIndex: 'grantedBy',
        title: '授予人',
        width: 100,
      },
      {
        fixed: 'right',
        render: (_, row) =>
          row.status === 'REVOKED' ? (
            <Typography.Text type="secondary">已撤销</Typography.Text>
          ) : row.source === 'INHERITED' ? (
            <Typography.Text type="secondary">继承</Typography.Text>
          ) : (
            <Button danger onClick={() => setRevokingGrant(row)} type="link">
              撤销
            </Button>
          ),
        title: '操作',
        valueType: 'option',
        width: 70,
      },
    ],
    [styles.capability, styles.code, styles.principal],
  );

  const submitGrant = async (input: GrantSubmitInput) => {
    await createMutation.mutateAsync(input);
    await reloadGrants();
  };

  return (
    <PageContainer ghost pageHeaderRender={false}>
      <div className={styles.page}>
        <div className={styles.toolbar}>
          <Typography.Text type="secondary">
            一条授权 = 主体 × 能力 ×
            范围。菜单可见性只是体验，最终判定始终由服务端做
          </Typography.Text>
          <Button
            aria-expanded={grantOpen}
            aria-haspopup="dialog"
            icon={<PlusOutlined aria-hidden="true" />}
            onClick={() => setGrantOpen(true)}
            type="primary"
          >
            新增授权
          </Button>
        </div>

        <section aria-label="Grant 统计" className={styles.stats}>
          {grantStats.map(({ label, value }) => (
            <div key={label}>
              <strong>{value}</strong>
              <Typography.Text type="secondary">{label}</Typography.Text>
            </div>
          ))}
        </section>

        <Segmented<GrantViewFilter>
          aria-label="Grant 分类"
          className={styles.segmented}
          name="grant-category"
          onChange={(nextFilter) => {
            invalidatePendingRequests();
            setViewFilter(nextFilter);
          }}
          options={GRANT_FILTER_OPTIONS.map((option) => ({ ...option }))}
          size="small"
          value={viewFilter}
        />

        <ProTable<GrantRow, GrantQueryParams>
          actionRef={actionRef}
          columns={columns}
          key={viewFilter}
          options={false}
          pagination={false}
          params={params}
          request={requestGrants}
          rowKey="id"
          scroll={{ x: 870 }}
          search={false}
          size="small"
          toolBarRender={false}
        />

        {grantOpen ? (
          <GrantModal
            onClose={() => setGrantOpen(false)}
            onSubmit={submitGrant}
            open
            principalOptions={principalOptions}
            scopeOptions={scopeOptions}
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
