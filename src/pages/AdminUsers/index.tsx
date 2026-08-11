import {
  type ActionType,
  PageContainer,
  type ProColumns,
  ProTable,
  type ProTableProps,
} from '@ant-design/pro-components';
import { App, Button, Input, Select, Space, Typography } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FilterToolbar } from '@/components/FilterToolbar';
import { SemanticTag } from '@/components/SemanticTag';
import {
  disableAccount,
  enableAccount,
  resetAccountPassword,
  resetAccountTotp,
} from '@/features/administration';
import { AccountActionModal } from './AccountActionModal';
import { CredentialModal } from './CredentialModal';
import {
  USER_ACTION_META,
  USER_PROFESSION_OPTIONS,
  USER_STATUS_META,
  USER_STATUS_OPTIONS,
} from './constant';
import { useStyles } from './index.style';
import type {
  CredentialReceipt,
  UserAction,
  UserQueryParams,
  UserRow,
} from './type';
import { UserModal } from './UserModal';
import { formatAccountError, queryUserRows } from './util';

interface ActionState {
  action: UserAction;
  account: UserRow;
}

interface CredentialState {
  kind: 'create' | 'reset';
  receipt: CredentialReceipt;
}

export default function AdminUsersPage() {
  const { message } = App.useApp();
  const { styles } = useStyles();
  const actionRef = useRef<ActionType | undefined>(undefined);
  const requestSequenceRef = useRef(0);
  const [employeeNoInput, setEmployeeNoInput] = useState('');
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [employeeNo, setEmployeeNo] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [status, setStatus] =
    useState<NonNullable<UserQueryParams['status']>>('all');
  const [profession, setProfession] =
    useState<NonNullable<UserQueryParams['profession']>>('all');
  const [total, setTotal] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [actionState, setActionState] = useState<ActionState>();
  const [credentialState, setCredentialState] = useState<CredentialState>();

  const invalidatePendingRequests = useCallback(() => {
    requestSequenceRef.current += 1;
  }, []);

  useEffect(
    () => () => {
      invalidatePendingRequests();
    },
    [invalidatePendingRequests],
  );

  const queryParams = useMemo<UserQueryParams>(
    () => ({ displayName, employeeNo, profession, status }),
    [displayName, employeeNo, profession, status],
  );

  const requestAccounts = useCallback<
    NonNullable<ProTableProps<UserRow, UserQueryParams>['request']>
  >(
    async (params, sort, filter) => {
      const requestSequence = ++requestSequenceRef.current;
      try {
        const result = await queryUserRows(params, sort, filter);
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
        message.error(formatAccountError(error, '账号列表加载失败'));
        return { data: [], success: true, total: 0 };
      }
    },
    [message],
  );

  const reloadAccounts = useCallback(async () => {
    invalidatePendingRequests();
    await actionRef.current?.reload();
  }, [invalidatePendingRequests]);

  const columns = useMemo<ProColumns<UserRow>[]>(
    () => [
      {
        dataIndex: 'employeeNo',
        render: (_, row) => (
          <span className={styles.employeeNo}>{row.employeeNo}</span>
        ),
        sorter: true,
        title: '员工编号',
        width: 140,
      },
      {
        dataIndex: 'displayName',
        sorter: true,
        title: '姓名',
        width: 160,
      },
      {
        dataIndex: 'profession',
        render: (_, row) => row.profession ?? '未分类',
        sorter: true,
        title: '专业分类',
        width: 140,
      },
      {
        dataIndex: 'status',
        render: (_, row) => <SemanticTag {...USER_STATUS_META[row.status]} />,
        sorter: true,
        title: '状态',
        width: 120,
      },
      {
        fixed: 'right',
        render: (_, row) => {
          const statusAction: UserAction =
            row.status === 'ENABLED' ? 'disable' : 'enable';
          return (
            <Space size={0} wrap>
              <Button
                danger={statusAction === 'disable'}
                onClick={() =>
                  setActionState({ action: statusAction, account: row })
                }
                type="link"
              >
                {statusAction === 'disable' ? '停用' : '启用'}
              </Button>
              <Button
                onClick={() =>
                  setActionState({ action: 'resetPassword', account: row })
                }
                type="link"
              >
                重置密码
              </Button>
              <Button
                onClick={() =>
                  setActionState({ action: 'resetTotp', account: row })
                }
                type="link"
              >
                重置 TOTP
              </Button>
            </Space>
          );
        },
        title: '操作',
        valueType: 'option',
        width: 360,
      },
    ],
    [styles.employeeNo],
  );

  const confirmAction = async (state: ActionState, reason: string) => {
    let receipt: CredentialReceipt | undefined;
    if (state.action === 'enable') {
      await enableAccount(state.account.id, { reason });
    } else if (state.action === 'disable') {
      await disableAccount(state.account.id, { reason });
    } else if (state.action === 'resetPassword') {
      receipt = await resetAccountPassword(state.account.id, { reason });
    } else {
      await resetAccountTotp(state.account.id, { reason });
    }

    setActionState(undefined);
    if (receipt !== undefined) {
      setCredentialState({ kind: 'reset', receipt });
    }
    message.success(USER_ACTION_META[state.action].successText);
    await reloadAccounts();
  };

  return (
    <PageContainer
      ghost
      subTitle="管理平台账号、初始化状态与凭据治理操作"
      title="账号管理"
    >
      <div className={styles.page}>
        <FilterToolbar
          actions={
            <Button
              aria-expanded={createOpen}
              aria-haspopup="dialog"
              onClick={() => setCreateOpen(true)}
              type="primary"
            >
              新增账号
            </Button>
          }
          ariaLabel="账号筛选与操作"
          filters={
            <span className={styles.filters}>
              <Select<NonNullable<UserQueryParams['status']>>
                aria-label="账号状态"
                className={styles.filter}
                id="admin-account-status-filter"
                onChange={(nextStatus) => {
                  if (nextStatus !== status) {
                    invalidatePendingRequests();
                    setStatus(nextStatus);
                  }
                }}
                options={USER_STATUS_OPTIONS.map((option) => ({ ...option }))}
                value={status}
                virtual={false}
              />
              <Select<NonNullable<UserQueryParams['profession']>>
                aria-label="专业分类"
                className={styles.filter}
                id="admin-account-profession-filter"
                onChange={(nextProfession) => {
                  if (nextProfession !== profession) {
                    invalidatePendingRequests();
                    setProfession(nextProfession);
                  }
                }}
                options={USER_PROFESSION_OPTIONS.map((option) => ({
                  ...option,
                }))}
                value={profession}
                virtual={false}
              />
              <Typography.Text type="secondary">
                共 {total} 个账号
              </Typography.Text>
            </span>
          }
          search={
            <span className={styles.searchFields}>
              <Input.Search
                allowClear
                aria-label="搜索员工编号"
                className={styles.search}
                inputMode="numeric"
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setEmployeeNoInput(nextValue);
                  if (nextValue === '' && employeeNo !== '') {
                    invalidatePendingRequests();
                    setEmployeeNo('');
                  }
                }}
                onSearch={(nextEmployeeNo) => {
                  if (nextEmployeeNo !== employeeNo) {
                    invalidatePendingRequests();
                    setEmployeeNo(nextEmployeeNo);
                  }
                }}
                placeholder="员工编号"
                value={employeeNoInput}
              />
              <Input.Search
                allowClear
                aria-label="搜索姓名"
                className={styles.search}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setDisplayNameInput(nextValue);
                  if (nextValue === '' && displayName !== '') {
                    invalidatePendingRequests();
                    setDisplayName('');
                  }
                }}
                onSearch={(nextDisplayName) => {
                  if (nextDisplayName !== displayName) {
                    invalidatePendingRequests();
                    setDisplayName(nextDisplayName);
                  }
                }}
                placeholder="姓名"
                value={displayNameInput}
              />
            </span>
          }
        />

        <ProTable<UserRow, UserQueryParams>
          actionRef={actionRef}
          columns={columns}
          onChange={invalidatePendingRequests}
          options={false}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          params={queryParams}
          request={requestAccounts}
          rowKey="id"
          scroll={{ x: 1120 }}
          search={false}
          toolBarRender={false}
        />

        {createOpen ? (
          <UserModal
            onClose={() => setCreateOpen(false)}
            onCreated={(receipt) => {
              setCredentialState({ kind: 'create', receipt });
              void reloadAccounts();
            }}
            open
          />
        ) : null}

        {actionState ? (
          <AccountActionModal
            account={actionState.account}
            action={actionState.action}
            onClose={() => setActionState(undefined)}
            onConfirm={(reason) => confirmAction(actionState, reason)}
            open
          />
        ) : null}

        {credentialState ? (
          <CredentialModal
            kind={credentialState.kind}
            onClose={() => setCredentialState(undefined)}
            open
            receipt={credentialState.receipt}
          />
        ) : null}
      </div>
    </PageContainer>
  );
}
