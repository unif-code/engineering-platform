import { PageContainer } from '@ant-design/pro-components';
import { useMutation, useQuery } from '@umijs/max';
import {
  Alert,
  App,
  Button,
  Spin,
  Tree,
  type TreeDataNode,
  Typography,
} from 'antd';
import { useMemo, useState } from 'react';
import { SemanticTag } from '@/components/SemanticTag';
import {
  formatGovernanceError,
  getOrganizationTree,
  setOrganizationSuperior,
} from '@/features/administration';
import { ORGANIZATION_KIND_META } from './constant';
import { useStyles } from './index.style';
import { SuperiorModal } from './SuperiorModal';
import type {
  OrganizationTreeNode,
  SuperiorFormValues,
  SuperiorTarget,
} from './type';

const flattenOrganization = (
  nodes: readonly OrganizationTreeNode[],
): OrganizationTreeNode[] =>
  nodes.flatMap((node) => [node, ...flattenOrganization(node.children)]);

type OrganizationDataNode = TreeDataNode & { 'aria-level': number };

export default function AdminOrganizationPage() {
  const { message } = App.useApp();
  const { styles } = useStyles();
  const [editingAccount, setEditingAccount] = useState<OrganizationTreeNode>();
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

  const allAccounts = useMemo(
    () => flattenOrganization(organizationQuery.data?.items ?? []),
    [organizationQuery.data?.items],
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

  const treeData = useMemo(() => {
    const toTreeNode = (
      node: OrganizationTreeNode,
      level: number,
    ): OrganizationDataNode => ({
      'aria-level': level,
      children: node.children.map((child) => toTreeNode(child, level + 1)),
      key: node.id,
      title: (
        // biome-ignore lint/a11y/useSemanticElements: Tree title is phrasing content; fieldset would create invalid span nesting.
        <span
          aria-label={`${node.displayName} 组织节点`}
          className={styles.node}
          role="group"
        >
          <Typography.Text strong>{node.displayName}</Typography.Text>
          <span className={styles.nodeMeta}>{node.employeeNo}</span>
          <SemanticTag {...ORGANIZATION_KIND_META[node.kind]} />
          {node.kind === 'MANAGER' ? null : (
            <Button onClick={() => setEditingAccount(node)} size="small">
              调整归属
            </Button>
          )}
        </span>
      ),
    });
    return (organizationQuery.data?.items ?? []).map((node) =>
      toTreeNode(node, 1),
    );
  }, [organizationQuery.data?.items, styles.node, styles.nodeMeta]);

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

  return (
    <PageContainer
      ghost
      subTitle="维护经理、Leader 与普通员工的合法组织归属"
      title="组织管理"
    >
      <div className={styles.page}>
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
        ) : (
          <section aria-label="组织关系" className={styles.treeCard}>
            <Spin spinning={organizationQuery.isLoading}>
              <Tree
                aria-label="组织关系树"
                expandedKeys={allAccounts.map(({ id }) => id)}
                selectable={false}
                showLine
                treeData={treeData}
              />
            </Spin>
          </section>
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
    </PageContainer>
  );
}
