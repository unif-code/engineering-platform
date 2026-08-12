import { PlusOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { useMutation, useQuery } from '@umijs/max';
import {
  Alert,
  App,
  Avatar,
  Button,
  Empty,
  Spin,
  Table,
  type TableColumnsType,
  Typography,
} from 'antd';
import { useMemo, useState } from 'react';
import { SemanticTag } from '@/components/SemanticTag';
import {
  formatGovernanceError,
  getOrganizationTree,
  type OrganizationNode,
  setOrganizationSuperior,
} from '@/features/administration';
import {
  ORGANIZATION_DEPARTMENTS,
  ORGANIZATION_MEMBER_META,
  ORGANIZATION_ROLE_MIX,
  ORGANIZATION_ROOT_DEPARTMENTS,
} from './constant';
import { DepartmentModal } from './DepartmentModal';
import { useStyles } from './index.style';
import { SuperiorModal } from './SuperiorModal';
import type {
  DepartmentFormValues,
  OrganizationTreeNode,
  SuperiorFormValues,
  SuperiorTarget,
} from './type';

const toPresentationNode = (
  node: OrganizationNode,
  departmentKey: string,
): OrganizationTreeNode => {
  const metadata = ORGANIZATION_MEMBER_META[node.id] ?? {
    lastLoginAt: '—',
    roles: [
      node.kind === 'MANAGER'
        ? '经理'
        : node.kind === 'LEADER'
          ? 'Leader'
          : '成员',
    ],
    status: 'ACTIVE' as const,
  };
  return {
    ...node,
    ...metadata,
    children: node.children.map((child) =>
      toPresentationNode(child, departmentKey),
    ),
    departmentKey,
  };
};

const flattenOrganization = (
  nodes: readonly OrganizationTreeNode[],
): OrganizationTreeNode[] =>
  nodes.flatMap((node) => [node, ...flattenOrganization(node.children)]);

export default function AdminOrganizationPage() {
  const { message } = App.useApp();
  const { styles } = useStyles();
  const mixClasses = [styles.mix0, styles.mix1, styles.mix2, styles.mix3];
  const [departmentOpen, setDepartmentOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<OrganizationTreeNode>();
  const [selectedDepartmentKey, setSelectedDepartmentKey] =
    useState('marketing');
  const organizationQuery = useQuery({
    queryFn: getOrganizationTree,
    queryKey: ['admin-organization'],
    retry: false,
  });
  const superiorMutation = useMutation({
    mutationFn: ({
      accountId,
      values,
    }: {
      accountId: string;
      values: SuperiorFormValues;
    }) => setOrganizationSuperior(accountId, values),
  });

  const organizationItems = useMemo(
    () =>
      (organizationQuery.data?.items ?? []).map((node) =>
        toPresentationNode(
          node,
          ORGANIZATION_ROOT_DEPARTMENTS[node.id] ?? 'operations',
        ),
      ),
    [organizationQuery.data?.items],
  );
  const allAccounts = useMemo(
    () => flattenOrganization(organizationItems),
    [organizationItems],
  );
  const superiorTargets = useMemo<SuperiorTarget[]>(() => {
    if (editingAccount === undefined) {
      return [];
    }
    const targetKind = editingAccount.kind === 'MEMBER' ? 'LEADER' : 'MANAGER';
    return allAccounts
      .filter(({ kind }) => kind === targetKind)
      .map(({ displayName, id }) => ({ label: displayName, value: id }));
  }, [allAccounts, editingAccount]);

  const departments = ORGANIZATION_DEPARTMENTS;
  const selectedDepartment =
    departments.find(({ key }) => key === selectedDepartmentKey) ??
    departments[0];
  const departmentMembers = useMemo(
    () =>
      selectedDepartment === undefined
        ? []
        : allAccounts.filter(
            ({ departmentKey }) => departmentKey === selectedDepartment.key,
          ),
    [allAccounts, selectedDepartment],
  );
  const memberColumns = useMemo<TableColumnsType<OrganizationTreeNode>>(
    () => [
      {
        key: 'member',
        render: (_, account) =>
          account.kind === 'MANAGER' ? (
            <span className={styles.memberIdentity}>
              <Avatar size={26}>{account.displayName.slice(0, 1)}</Avatar>
              {account.displayName}
            </span>
          ) : (
            <Button
              aria-label={`调整归属 ${account.displayName}`}
              className={styles.memberButton}
              onClick={() => setEditingAccount(account)}
              type="text"
            >
              <Avatar size={26}>{account.displayName.slice(0, 1)}</Avatar>
              {account.displayName}
            </Button>
          ),
        title: '成员',
        width: 180,
      },
      {
        dataIndex: 'employeeNo',
        key: 'employeeNo',
        title: '工号',
        width: 110,
      },
      {
        key: 'roles',
        render: (_, account) => account.roles.join(' · '),
        title: '角色',
      },
      {
        key: 'status',
        render: (_, account) => (
          <SemanticTag
            label={account.status === 'ACTIVE' ? '在职' : '已停用'}
            tone={account.status === 'ACTIVE' ? 'success' : 'neutral'}
          />
        ),
        title: '状态',
        width: 90,
      },
      {
        dataIndex: 'lastLoginAt',
        key: 'lastLoginAt',
        title: '最近登录',
        width: 130,
      },
    ],
    [styles.memberButton, styles.memberIdentity],
  );

  const confirmSuperior = async (values: SuperiorFormValues) => {
    if (editingAccount === undefined) {
      return;
    }
    await superiorMutation.mutateAsync({
      accountId: editingAccount.id,
      values,
    });
    await organizationQuery.refetch();
    setEditingAccount(undefined);
    message.success('组织归属已调整');
  };

  const submitDepartment = async (_values: DepartmentFormValues) => {
    setDepartmentOpen(false);
    message.info('静态原型：部门写契约尚未冻结');
  };

  return (
    <PageContainer ghost pageHeaderRender={false}>
      <div className={styles.page}>
        <div className={styles.toolbar}>
          <Typography.Text type="secondary">
            部门决定人员归属与默认可见范围；工作区成员由 Owner
            另行配置，两者不互相覆盖
          </Typography.Text>
          <Button
            aria-expanded={departmentOpen}
            aria-haspopup="dialog"
            icon={<PlusOutlined aria-hidden="true" />}
            onClick={() => setDepartmentOpen(true)}
            type="primary"
          >
            新建部门
          </Button>
        </div>
        {organizationQuery.isError ? (
          <Alert
            action={
              <Button onClick={() => void organizationQuery.refetch()}>
                重试
              </Button>
            }
            title={formatGovernanceError(
              organizationQuery.error,
              '组织关系加载失败',
            )}
            showIcon
            type="error"
          />
        ) : organizationQuery.isLoading ? (
          <Spin />
        ) : (
          <>
            <section aria-label="部门概览" className={styles.departmentGrid}>
              {departments.map((department) => {
                const total = Math.max(
                  Object.values(department.roleMix).reduce(
                    (sum, value) => sum + value,
                    0,
                  ),
                  1,
                );
                const selected = department.key === selectedDepartment?.key;
                return (
                  <Button
                    aria-pressed={selected}
                    className={`${styles.departmentCard} ${
                      selected ? styles.departmentCardSelected : ''
                    }`}
                    key={department.key}
                    onClick={() => setSelectedDepartmentKey(department.key)}
                    type="text"
                  >
                    <span className={styles.departmentHeading}>
                      <span className={styles.departmentTitle}>
                        <Typography.Text strong>
                          {department.name}
                        </Typography.Text>
                        <Typography.Text type="secondary">
                          负责人 {department.lead} · {department.workspaceCount}{' '}
                          个工作区
                        </Typography.Text>
                      </span>
                      <span className={styles.memberCount}>
                        <strong>{department.memberCount}</strong>
                        <Typography.Text type="secondary">人</Typography.Text>
                      </span>
                    </span>
                    <span className={styles.mixBar}>
                      {ORGANIZATION_ROLE_MIX.map(({ key }, index) => (
                        <span
                          className={mixClasses[index]}
                          key={key}
                          style={{
                            width: `${(department.roleMix[key] / total) * 100}%`,
                          }}
                        />
                      ))}
                    </span>
                    <span className={styles.legend}>
                      {ORGANIZATION_ROLE_MIX.map(({ key, label }, index) => (
                        <span key={key}>
                          <span className={mixClasses[index]} />
                          {label} {department.roleMix[key]}
                        </span>
                      ))}
                    </span>
                    <span className={styles.subgroups}>
                      {department.subgroups.map((subgroup) => (
                        <span key={subgroup}>{subgroup}</span>
                      ))}
                    </span>
                  </Button>
                );
              })}
            </section>
            {selectedDepartment ? (
              <section
                aria-label={`${selectedDepartment.name}成员`}
                className={styles.memberCard}
              >
                <div className={styles.memberHeader}>
                  <Typography.Text strong>
                    {selectedDepartment.name}
                  </Typography.Text>
                  <Typography.Text type="secondary">
                    负责人 {selectedDepartment.lead} · 在册{' '}
                    {departmentMembers.length} 人
                  </Typography.Text>
                </div>
                <Table<OrganizationTreeNode>
                  columns={memberColumns}
                  dataSource={departmentMembers}
                  locale={{
                    emptyText: <Empty description="该部门暂无在册成员" />,
                  }}
                  pagination={false}
                  rowKey="id"
                  scroll={{ x: 680 }}
                  size="small"
                />
              </section>
            ) : null}
          </>
        )}
      </div>

      {editingAccount ? (
        <SuperiorModal
          account={editingAccount}
          onClose={() => setEditingAccount(undefined)}
          onConfirm={confirmSuperior}
          open
          targets={superiorTargets}
        />
      ) : null}
      {departmentOpen ? (
        <DepartmentModal
          onClose={() => setDepartmentOpen(false)}
          onSubmit={submitDepartment}
          open
        />
      ) : null}
    </PageContainer>
  );
}
