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
  Tooltip,
  Typography,
} from 'antd';
import { useMemo, useState } from 'react';
import {
  formatGovernanceError,
  getOrganizationTree,
  type OrganizationNode,
  setOrganizationSuperior,
} from '@/features/administration';
import { useStyles } from './index.style';
import { SuperiorModal } from './SuperiorModal';
import type { SuperiorFormValues, SuperiorTarget } from './type';

interface OrganizationMemberRow extends OrganizationNode {
  levelLabel: string;
  superiorName: string;
}

const levelLabel = (kind: OrganizationNode['kind']) => {
  if (kind === 'MANAGER') {
    return '负责人';
  }
  if (kind === 'LEADER') {
    return 'Leader';
  }
  return '成员';
};

const flattenOrganization = (
  nodes: readonly OrganizationNode[],
  superiorName = '—',
): OrganizationMemberRow[] =>
  nodes.flatMap((node) => [
    { ...node, levelLabel: levelLabel(node.kind), superiorName },
    ...flattenOrganization(node.children, node.displayName),
  ]);

export default function AdminOrganizationPage() {
  const { message } = App.useApp();
  const { styles } = useStyles();
  const [editingAccount, setEditingAccount] = useState<OrganizationNode>();
  const [selectedManagerId, setSelectedManagerId] = useState<string>();
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

  const managers = organizationQuery.data?.items ?? [];
  const allAccounts = useMemo(() => flattenOrganization(managers), [managers]);
  const selectedManager =
    managers.find(({ id }) => id === selectedManagerId) ?? managers[0];
  const selectedMembers = useMemo(
    () => (selectedManager ? flattenOrganization([selectedManager]) : []),
    [selectedManager],
  );
  const superiorTargets = useMemo<SuperiorTarget[]>(() => {
    if (editingAccount === undefined) {
      return [];
    }
    const targetKind = editingAccount.kind === 'MEMBER' ? 'LEADER' : 'MANAGER';
    return allAccounts
      .filter(({ id, kind }) => id !== editingAccount.id && kind === targetKind)
      .map(({ displayName, id }) => ({ label: displayName, value: id }));
  }, [allAccounts, editingAccount]);

  const memberColumns = useMemo<TableColumnsType<OrganizationMemberRow>>(
    () => [
      {
        key: 'member',
        render: (_, account) => (
          <span className={styles.memberIdentity}>
            <Avatar size={26}>{account.displayName.slice(0, 1)}</Avatar>
            {account.displayName}
          </span>
        ),
        title: '成员',
        width: 180,
      },
      { dataIndex: 'employeeNo', key: 'employeeNo', title: '工号', width: 140 },
      {
        dataIndex: 'levelLabel',
        key: 'levelLabel',
        title: '组织层级',
        width: 110,
      },
      { dataIndex: 'superiorName', key: 'superiorName', title: '直属上级' },
      {
        key: 'action',
        render: (_, account) =>
          account.kind === 'MANAGER' ? (
            '—'
          ) : (
            <Button
              aria-label={`调整归属 ${account.displayName}`}
              onClick={() => setEditingAccount(account)}
              size="small"
              type="link"
            >
              调整归属
            </Button>
          ),
        title: '操作',
        width: 110,
      },
    ],
    [styles.memberIdentity],
  );

  const confirmSuperior = async (
    account: OrganizationNode,
    values: SuperiorFormValues,
  ) => {
    await superiorMutation.mutateAsync({ accountId: account.id, values });
    await organizationQuery.refetch();
    setEditingAccount(undefined);
    message.success('组织归属已调整');
  };

  return (
    <PageContainer ghost pageHeaderRender={false}>
      <div className={styles.page}>
        <div className={styles.toolbar}>
          <Typography.Text type="secondary">
            部门决定人员归属与默认可见范围；工作区成员由 Owner
            另行配置，两者不互相覆盖
          </Typography.Text>
          <Tooltip title="当前版本暂未接入">
            <span className={styles.disabledAction}>
              <Button
                disabled
                icon={<PlusOutlined aria-hidden="true" />}
                title="当前版本暂未接入"
                type="primary"
              >
                新建部门
              </Button>
            </span>
          </Tooltip>
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
            <section aria-label="负责人概览" className={styles.departmentGrid}>
              {managers.length === 0 ? (
                <div className={styles.emptyOverview}>
                  <Empty description="暂无真实组织关系" />
                </div>
              ) : (
                managers.map((manager) => {
                  const memberCount = flattenOrganization([manager]).length;
                  const selected = manager.id === selectedManager?.id;
                  return (
                    <Button
                      aria-pressed={selected}
                      className={`${styles.departmentCard} ${
                        selected ? styles.departmentCardSelected : ''
                      }`}
                      key={manager.id}
                      onClick={() => setSelectedManagerId(manager.id)}
                      type="text"
                    >
                      <span className={styles.departmentHeading}>
                        <span className={styles.departmentTitle}>
                          <Typography.Text strong>
                            {manager.displayName}负责范围
                          </Typography.Text>
                          <Typography.Text type="secondary">
                            负责人 {manager.displayName} ·{' '}
                            {manager.children.length} 个 Leader
                          </Typography.Text>
                        </span>
                        <span className={styles.memberCount}>
                          <strong>{memberCount}</strong>
                          <Typography.Text type="secondary">人</Typography.Text>
                        </span>
                      </span>
                    </Button>
                  );
                })
              )}
            </section>

            {selectedManager ? (
              <section
                aria-label={`${selectedManager.displayName}负责范围成员`}
                className={styles.memberCard}
              >
                <div className={styles.memberHeader}>
                  <Typography.Text strong>
                    {selectedManager.displayName}负责范围
                  </Typography.Text>
                  <Typography.Text type="secondary">
                    负责人 {selectedManager.displayName} · 在册{' '}
                    {selectedMembers.length} 人
                  </Typography.Text>
                </div>
                <Table<OrganizationMemberRow>
                  columns={memberColumns}
                  dataSource={selectedMembers}
                  locale={{
                    emptyText: <Empty description="暂无真实组织关系" />,
                  }}
                  pagination={false}
                  rowKey="id"
                  scroll={{ x: 720 }}
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
          onConfirm={(values) => confirmSuperior(editingAccount, values)}
          open
          targets={superiorTargets}
        />
      ) : null}
    </PageContainer>
  );
}
