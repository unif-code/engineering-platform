import {
  PageContainer,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import { Link } from '@umijs/max';
import { Button, Input, Segmented, Space, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { FilterToolbar } from '@/components/FilterToolbar';
import { SemanticTag } from '@/components/SemanticTag';
import { AssignTaskSteps } from './AssignTaskSteps';
import { CreateTaskModal } from './CreateTaskModal';
import { TASK_STATUS_META, TASK_STATUS_OPTIONS } from './constant';
import { useStyles } from './index.style';
import { TaskBoard } from './TaskBoard';
import type {
  TaskListMode,
  TaskQueryParams,
  TaskRow,
  TaskStatus,
  TaskView,
} from './type';
import { queryTaskRows, selectTaskRows } from './util';

export interface TaskListPageProps {
  mode: TaskListMode;
}

export function TaskListPage({ mode }: TaskListPageProps) {
  const { styles } = useStyles();
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<TaskStatus | 'all'>('all');
  const [view, setView] = useState<TaskView>('table');
  const [createOpen, setCreateOpen] = useState(false);
  const [assigningTask, setAssigningTask] = useState<TaskRow>();
  const visibleRows = selectTaskRows({ keyword, mode, status });

  const columns = useMemo<ProColumns<TaskRow>[]>(
    () => [
      {
        dataIndex: 'id',
        render: (_, row) => (
          <Link className={styles.code} to={`/tasks/${row.id}`}>
            {row.id}
          </Link>
        ),
        title: '编号',
        width: 120,
      },
      {
        dataIndex: 'title',
        render: (_, row) => (
          <Link className={styles.titleLink} to={`/tasks/${row.id}`}>
            {row.title}
          </Link>
        ),
        title: '任务标题',
        width: 220,
      },
      { dataIndex: 'team', title: 'Team', width: 90 },
      {
        dataIndex: 'repository',
        render: (_, row) => (
          <span className={styles.code}>{row.repository}</span>
        ),
        title: '仓库',
        width: 180,
      },
      {
        dataIndex: 'status',
        render: (_, row) => {
          const meta = TASK_STATUS_META[row.status];
          return <SemanticTag label={meta.label} tone={meta.tone} />;
        },
        title: '状态',
        width: 110,
      },
      { dataIndex: 'owner', title: '责任人', width: 110 },
      { dataIndex: 'agent', title: 'Agent', width: 100 },
      {
        dataIndex: 'updatedAt',
        render: (_, row) => row.updatedAt.slice(5, 16).replace('T', ' '),
        sorter: true,
        title: '更新',
        width: 110,
      },
      {
        fixed: 'right',
        render: (_, row) => (
          <Space size="small">
            <Link to={`/tasks/${row.id}`}>详情</Link>
            {mode === 'active' ? (
              <Button
                aria-label="分配任务"
                onClick={() => setAssigningTask(row)}
                type="link"
              >
                分配
              </Button>
            ) : (
              <Typography.Text type="secondary">留存</Typography.Text>
            )}
          </Space>
        ),
        title: '操作',
        valueType: 'option',
        width: 110,
      },
    ],
    [mode, styles.code, styles.titleLink],
  );

  const queryParams: TaskQueryParams = { keyword, mode, status };

  return (
    <PageContainer ghost pageHeaderRender={false}>
      <div className={styles.page}>
        <FilterToolbar
          actions={
            mode === 'active' ? (
              <Space wrap>
                <Segmented<TaskView>
                  aria-label="任务视图"
                  onChange={setView}
                  options={[
                    { label: '列表', value: 'table' },
                    { label: '看板', value: 'board' },
                  ]}
                  size="small"
                  value={view}
                />
                <Button onClick={() => setCreateOpen(true)} type="primary">
                  创建任务
                </Button>
              </Space>
            ) : null
          }
          ariaLabel="任务筛选与操作"
          filters={
            mode === 'active' ? (
              <Segmented<TaskStatus | 'all'>
                aria-label="任务状态"
                onChange={setStatus}
                options={TASK_STATUS_OPTIONS.map((option) => ({ ...option }))}
                shape="round"
                size="small"
                value={status}
              />
            ) : (
              <Space size="small">
                <SemanticTag label="只读" tone="neutral" />
                <Typography.Text type="secondary">
                  已归档任务 · 只读留存，业务事实与 Audit 保留
                </Typography.Text>
              </Space>
            )
          }
          search={
            <Input.Search
              allowClear
              aria-label="搜索任务"
              className={styles.search}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="搜索标题 / 编号"
              value={keyword}
            />
          }
        />

        {view === 'table' ? (
          <ProTable<TaskRow, TaskQueryParams>
            columns={columns}
            options={false}
            pagination={{ pageSize: 10, showSizeChanger: false }}
            params={queryParams}
            request={queryTaskRows}
            rowKey="id"
            scroll={{ x: 1200 }}
            search={false}
            size="small"
            toolBarRender={false}
          />
        ) : (
          <TaskBoard rows={visibleRows} />
        )}

        {createOpen ? (
          <CreateTaskModal onClose={() => setCreateOpen(false)} open />
        ) : null}
        {assigningTask ? (
          <AssignTaskSteps
            onClose={() => setAssigningTask(undefined)}
            open
            task={assigningTask}
          />
        ) : null}
      </div>
    </PageContainer>
  );
}
