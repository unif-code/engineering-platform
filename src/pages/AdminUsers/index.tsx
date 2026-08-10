import {
  PageContainer,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import { Button, Input, Select, Space, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { FilterToolbar } from '@/components/FilterToolbar';
import { SemanticTag } from '@/components/SemanticTag';
import { useStaticPrototypeAction } from '@/hooks/useStaticPrototypeAction';
import {
  USER_ROLE_OPTIONS,
  USER_STATUS_META,
  USER_STATUS_OPTIONS,
} from './constant';
import { useStyles } from './index.style';
import type { UserQueryParams, UserRow } from './type';
import { UserModal } from './UserModal';
import { queryUserRows, selectUserRows } from './util';

type UserModalState =
  | { mode: 'create' }
  | { mode: 'edit'; user: UserRow }
  | null;

export default function AdminUsersPage() {
  const { styles } = useStyles();
  const showStaticAction = useStaticPrototypeAction();
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] =
    useState<NonNullable<UserQueryParams['status']>>('all');
  const [role, setRole] = useState<NonNullable<UserQueryParams['role']>>('all');
  const [modalState, setModalState] = useState<UserModalState>(null);

  const queryParams = useMemo<UserQueryParams>(
    () => ({ keyword, role, status }),
    [keyword, role, status],
  );
  const visibleCount = selectUserRows(queryParams).length;

  const columns = useMemo<ProColumns<UserRow>[]>(
    () => [
      {
        dataIndex: 'employeeId',
        render: (_, row) => (
          <span className={styles.employeeId}>{row.employeeId}</span>
        ),
        sorter: true,
        title: '员工编号',
        width: 130,
      },
      {
        dataIndex: 'name',
        sorter: true,
        title: '姓名',
        width: 140,
      },
      {
        dataIndex: 'email',
        sorter: true,
        title: '邮箱',
        width: 220,
      },
      {
        dataIndex: 'roles',
        render: (_, row) => (
          <span className={styles.roles}>
            {row.roles.map((userRole) => (
              <SemanticTag key={userRole} label={userRole} tone="neutral" />
            ))}
          </span>
        ),
        title: '角色',
        width: 250,
      },
      {
        dataIndex: 'status',
        render: (_, row) => <SemanticTag {...USER_STATUS_META[row.status]} />,
        title: '状态',
        width: 110,
      },
      {
        dataIndex: 'lastActiveAt',
        sorter: true,
        title: '最后活跃时间',
        valueType: 'dateTime',
        width: 180,
      },
      {
        fixed: 'right',
        render: (_, row) => (
          <Space size={0}>
            <Button
              onClick={() => setModalState({ mode: 'edit', user: row })}
              type="link"
            >
              编辑
            </Button>
            <Button
              danger
              onClick={() => showStaticAction(`禁用用户 ${row.employeeId}`)}
              type="link"
            >
              禁用
            </Button>
            <Button
              onClick={() => showStaticAction(`重置用户凭据 ${row.employeeId}`)}
              type="link"
            >
              重置凭据
            </Button>
          </Space>
        ),
        title: '操作',
        valueType: 'option',
        width: 240,
      },
    ],
    [showStaticAction, styles.employeeId, styles.roles],
  );

  return (
    <PageContainer
      ghost
      subTitle="管理平台用户的 Role 与访问状态；当前页面为静态数据投影"
      title="用户管理"
    >
      <div className={styles.page}>
        <FilterToolbar
          actions={
            <Button
              onClick={() => setModalState({ mode: 'create' })}
              type="primary"
            >
              新增用户
            </Button>
          }
          ariaLabel="用户筛选与操作"
          filters={
            <span className={styles.filters}>
              <Select<NonNullable<UserQueryParams['status']>>
                aria-label="用户状态"
                className={styles.filter}
                id="admin-user-status-filter"
                onChange={setStatus}
                options={USER_STATUS_OPTIONS.map((option) => ({ ...option }))}
                value={status}
                virtual={false}
              />
              <Select<NonNullable<UserQueryParams['role']>>
                aria-label="用户角色"
                className={styles.filter}
                id="admin-user-role-filter"
                onChange={setRole}
                options={USER_ROLE_OPTIONS.map((option) => ({ ...option }))}
                value={role}
                virtual={false}
              />
            </span>
          }
          search={
            <Input.Search
              allowClear
              aria-label="搜索用户"
              className={styles.search}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="员工编号 / 姓名 / 邮箱"
              value={keyword}
            />
          }
          summary={
            <Typography.Text type="secondary">
              共 {visibleCount} 名用户
            </Typography.Text>
          }
        />

        <ProTable<UserRow, UserQueryParams>
          columns={columns}
          options={false}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          params={queryParams}
          request={queryUserRows}
          rowKey="employeeId"
          scroll={{ x: 1120 }}
          search={false}
          toolBarRender={false}
        />

        {modalState ? (
          <UserModal
            onClose={() => setModalState(null)}
            open
            user={modalState.mode === 'edit' ? modalState.user : undefined}
          />
        ) : null}
      </div>
    </PageContainer>
  );
}
