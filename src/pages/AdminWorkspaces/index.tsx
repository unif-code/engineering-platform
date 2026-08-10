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
import { WORKSPACE_STATUS_META, WORKSPACE_STATUS_OPTIONS } from './constant';
import { useStyles } from './index.style';
import type { WorkspaceQueryParams, WorkspaceRow } from './type';
import { queryWorkspaceRows, selectWorkspaceRows } from './util';
import { WorkspaceModal } from './WorkspaceModal';

export default function AdminWorkspacesPage() {
  const { styles } = useStyles();
  const showStaticAction = useStaticPrototypeAction();
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] =
    useState<NonNullable<WorkspaceQueryParams['status']>>('all');
  const [modalOpen, setModalOpen] = useState(false);

  const queryParams = useMemo<WorkspaceQueryParams>(
    () => ({ keyword, status }),
    [keyword, status],
  );
  const visibleCount = selectWorkspaceRows(queryParams).length;

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
        width: 240,
      },
      { dataIndex: 'owner', title: 'Owner', width: 140 },
      {
        dataIndex: 'memberCount',
        title: '成员数',
        width: 110,
      },
      {
        dataIndex: 'repositoryCount',
        title: '仓库数',
        width: 110,
      },
      {
        dataIndex: 'status',
        render: (_, row) => (
          <SemanticTag {...WORKSPACE_STATUS_META[row.status]} />
        ),
        title: '状态',
        width: 110,
      },
      {
        dataIndex: 'updatedAt',
        title: '更新时间',
        valueType: 'dateTime',
        width: 180,
      },
      {
        fixed: 'right',
        render: (_, row) => (
          <Space size={0}>
            <Button
              onClick={() => showStaticAction(`查看工作区 ${row.name}`)}
              type="link"
            >
              查看
            </Button>
            <Button
              onClick={() => showStaticAction(`编辑工作区 ${row.name}`)}
              type="link"
            >
              编辑
            </Button>
          </Space>
        ),
        title: '操作',
        valueType: 'option',
        width: 160,
      },
    ],
    [showStaticAction, styles.workspaceId, styles.workspaceName],
  );

  return (
    <PageContainer
      ghost
      subTitle="管理工作区成员与仓库容量；当前页面为静态数据投影"
      title="工作区管理"
    >
      <div className={styles.page}>
        <FilterToolbar
          actions={
            <Button onClick={() => setModalOpen(true)} type="primary">
              创建工作区
            </Button>
          }
          ariaLabel="工作区筛选与操作"
          filters={
            <Select<NonNullable<WorkspaceQueryParams['status']>>
              aria-label="工作区状态"
              className={styles.filter}
              id="admin-workspace-status-filter"
              onChange={setStatus}
              options={WORKSPACE_STATUS_OPTIONS.map((option) => ({
                ...option,
              }))}
              value={status}
              virtual={false}
            />
          }
          search={
            <Input.Search
              allowClear
              aria-label="搜索工作区"
              className={styles.search}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="名称 / Owner / 工作区 ID"
              value={keyword}
            />
          }
          summary={
            <Typography.Text type="secondary">
              共 {visibleCount} 个工作区
            </Typography.Text>
          }
        />

        <ProTable<WorkspaceRow, WorkspaceQueryParams>
          columns={columns}
          options={false}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          params={queryParams}
          request={queryWorkspaceRows}
          rowKey="id"
          scroll={{ x: 1050 }}
          search={false}
          toolBarRender={false}
        />

        {modalOpen ? (
          <WorkspaceModal onClose={() => setModalOpen(false)} open />
        ) : null}
      </div>
    </PageContainer>
  );
}
