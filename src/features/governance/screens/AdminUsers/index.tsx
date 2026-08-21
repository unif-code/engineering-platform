import {
  type ActionType,
  PageContainer,
  type ProColumns,
  ProTable,
  type ProTableProps,
} from '@ant-design/pro-components';
import { Alert, App, Avatar, Button, Empty, Space } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SemanticTag } from '@/components/SemanticTag';
import {
  disableAccount,
  enableAccount,
  formatGovernanceError,
  resetAccountPassword,
  resetAccountTotp,
} from '@/features/administration';
import { AccountActionModal } from './AccountActionModal';
import { CredentialModal } from './CredentialModal';
import { USER_ACTION_META, USER_STATUS_META } from './constant';
import { useStyles } from './index.style';
import type {
  CredentialReceipt,
  UserAction,
  UserQueryParams,
  UserRow,
} from './type';
import { UserModal } from './UserModal';
import { queryUserRows } from './util';

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
  const [createOpen, setCreateOpen] = useState(false);
  const [actionState, setActionState] = useState<ActionState>();
  const [accountRows, setAccountRows] = useState<UserRow[]>([]);
  const [credentialState, setCredentialState] = useState<CredentialState>();
  const [listError, setListError] = useState<string>();

  const invalidatePendingRequests = useCallback(() => {
    requestSequenceRef.current += 1;
  }, []);

  useEffect(
    () => () => {
      invalidatePendingRequests();
    },
    [invalidatePendingRequests],
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
        setListError(undefined);
        return result;
      } catch (error) {
        if (requestSequence !== requestSequenceRef.current) {
          return { data: [], success: false, total: 0 };
        }
        const detail = formatGovernanceError(error, '账号列表加载失败');
        setListError(detail);
        setAccountRows([]);
        message.error(detail);
        return { data: [], success: false, total: 0 };
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
        title: '工号',
        width: 90,
      },
      {
        dataIndex: 'displayName',
        render: (_, row) => (
          <span className={styles.userCell}>
            <Avatar size={26}>{row.displayName.slice(0, 1)}</Avatar>
            {row.displayName}
          </span>
        ),
        title: '姓名',
        width: 150,
      },
      {
        dataIndex: 'team',
        render: () => '—',
        title: 'Team',
        width: 100,
      },
      {
        dataIndex: 'roles',
        render: () => '—',
        title: '角色标签',
        width: 220,
      },
      {
        dataIndex: 'status',
        render: (_, row) => <SemanticTag {...USER_STATUS_META[row.status]} />,
        title: '状态',
        width: 100,
      },
      {
        dataIndex: 'lastLogin',
        render: () => <span className={styles.lastLogin}>—</span>,
        title: '最近登录',
        width: 140,
      },
      {
        fixed: 'right',
        render: (_, row) => {
          const statusAction: UserAction =
            row.status === 'ENABLED' ? 'disable' : 'enable';
          return (
            <Space size={0} wrap>
              <Button
                onClick={() =>
                  setActionState({ action: 'resetPassword', account: row })
                }
                size="small"
                type="link"
              >
                重置密码
              </Button>
              <Button
                onClick={() =>
                  setActionState({ action: 'resetTotp', account: row })
                }
                size="small"
                type="link"
              >
                重置 TOTP
              </Button>
              <Button
                danger={statusAction === 'disable'}
                onClick={() =>
                  setActionState({ action: statusAction, account: row })
                }
                size="small"
                type="link"
              >
                {statusAction === 'disable' ? '停用' : '启用'}
              </Button>
            </Space>
          );
        },
        title: '操作',
        valueType: 'option',
        width: 260,
      },
    ],
    [styles.employeeNo, styles.lastLogin, styles.userCell],
  );

  const confirmAction = async (state: ActionState, reason: string) => {
    if (state.action === 'resetPassword') {
      const receipt = await resetAccountPassword(
        state.account.id,
        { reason },
        state.account.etag,
      );
      setActionState(undefined);
      setCredentialState({ kind: 'reset', receipt });
      message.success(USER_ACTION_META.resetPassword.successText);
      await reloadAccounts();
      return;
    }
    if (state.action === 'enable') {
      await enableAccount(state.account.id, { reason }, state.account.etag);
    } else if (state.action === 'disable') {
      await disableAccount(state.account.id, { reason }, state.account.etag);
    } else {
      await resetAccountTotp(state.account.id, { reason }, state.account.etag);
    }

    setActionState(undefined);
    message.success(USER_ACTION_META[state.action].successText);
    await reloadAccounts();
  };

  return (
    <PageContainer ghost pageHeaderRender={false}>
      <div className={styles.page}>
        <header className={styles.pageHeader}>
          <p className={styles.pageDescription}>
            单一用户表，平台端 / 管理端不区分账号；菜单与操作按角色能力动态渲染
            · 本地账号 + TOTP 双因素
          </p>
          <Button
            aria-expanded={createOpen}
            aria-haspopup="dialog"
            aria-label="新增用户"
            onClick={() => setCreateOpen(true)}
            type="primary"
          >
            ＋ 新增用户
          </Button>
        </header>

        {listError ? (
          <Alert
            action={
              <Button
                aria-label="重试加载账号"
                onClick={() => void reloadAccounts()}
                size="small"
              >
                重试
              </Button>
            }
            showIcon
            title={listError}
            type="error"
          />
        ) : null}

        <ProTable<UserRow, UserQueryParams>
          actionRef={actionRef}
          columns={columns}
          dataSource={accountRows}
          locale={{ emptyText: <Empty description="暂无数据" /> }}
          onChange={invalidatePendingRequests}
          onLoad={setAccountRows}
          options={false}
          pagination={{ pageSize: 20, showSizeChanger: false }}
          request={requestAccounts}
          rowKey="id"
          scroll={{ x: 1120 }}
          search={false}
          size="small"
          toolBarRender={false}
        />

        <p className={styles.pageNote}>
          禁用即时失效 Session 与访问权；历史业务 actor 与 Audit 保留 ·
          超级管理员账号受平台保护
        </p>

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
