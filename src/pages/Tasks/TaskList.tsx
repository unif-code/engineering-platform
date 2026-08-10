import {
  PageContainer,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import { Button, Input, Segmented, Select, Space, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { FilterToolbar } from '@/components/FilterToolbar';
import { MetricCard } from '@/components/MetricCard';
import { SemanticTag } from '@/components/SemanticTag';
import { AssignTaskSteps } from './AssignTaskSteps';
import { CreateTaskModal } from './CreateTaskModal';
import {
  ARCHIVED_TASK_ROWS,
  TASK_ROWS,
  TASK_STATUS_META,
  TASK_STATUS_OPTIONS,
} from './constant';
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
  const rows = mode === 'archived' ? ARCHIVED_TASK_ROWS : TASK_ROWS;
  const visibleRows = selectTaskRows({ keyword, mode, status });
  const metrics = [
    {
      description: mode === 'archived' ? '只读留存记录' : '当前筛选范围',
      title: mode === 'archived' ? '留存总数' : '活跃任务',
      tone: 'neutral' as const,
      value: rows.length,
    },
    {
      description: '正在推进',
      title: '运行中',
      tone: 'brand' as const,
      value: rows.filter((row) => row.status === 'running').length,
    },
    {
      description: '需要人工关注',
      title: '阻塞',
      tone: 'danger' as const,
      value: rows.filter((row) => row.status === 'blocked').length,
    },
    {
      description: mode === 'archived' ? '均保留 Audit 事实' : '已完成交付',
      title: '已完成',
      tone: 'success' as const,
      value: rows.filter((row) => row.status === 'completed').length,
    },
  ];

  const columns = useMemo<ProColumns<TaskRow>[]>(
    () => [
      {
        dataIndex: 'id',
        render: (_, row) => <span className={styles.code}>{row.id}</span>,
        title: '编号',
        width: 150,
      },
      { dataIndex: 'title', title: '任务标题', width: 240 },
      { dataIndex: 'workspace', title: 'Workspace', width: 180 },
      {
        dataIndex: 'stage',
        render: (_, row) => (
          <SemanticTag label={row.stage} monospace tone="neutral" />
        ),
        title: '阶段',
        width: 150,
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
      {
        dataIndex: 'updatedAt',
        sorter: true,
        title: '更新时间',
        width: 190,
      },
      {
        fixed: 'right',
        render: (_, row) =>
          mode === 'active' ? (
            <Button onClick={() => setAssigningTask(row)} type="link">
              分配任务
            </Button>
          ) : (
            <Typography.Text type="secondary">留存</Typography.Text>
          ),
        title: '操作',
        valueType: 'option',
        width: 110,
      },
    ],
    [mode, styles.code],
  );

  const queryParams: TaskQueryParams = { keyword, mode, status };

  return (
    <PageContainer
      ghost
      subTitle={
        mode === 'archived'
          ? '只读留存，业务事实与 Audit 保持可追溯'
          : '集中查看任务阶段、责任人和交付状态'
      }
      title={mode === 'archived' ? '归档任务' : '任务'}
    >
      <div className={styles.page}>
        <section aria-label="任务指标" className={styles.metricsGrid}>
          {metrics.map((metric) => (
            <MetricCard key={metric.title} {...metric} />
          ))}
        </section>

        <FilterToolbar
          actions={
            <Space wrap>
              <Segmented
                aria-label="任务视图"
                onChange={(nextView) => setView(nextView as TaskView)}
                options={[
                  { label: '列表', value: 'table' },
                  { label: '看板', value: 'board' },
                ]}
                value={view}
              />
              {mode === 'active' ? (
                <>
                  <Button href="/tasks/archived">查看归档</Button>
                  <Button onClick={() => setCreateOpen(true)} type="primary">
                    创建任务
                  </Button>
                </>
              ) : null}
            </Space>
          }
          ariaLabel="任务筛选与操作"
          filters={
            <Select<TaskStatus | 'all'>
              aria-label="任务状态"
              onChange={setStatus}
              options={TASK_STATUS_OPTIONS.map((option) => ({ ...option }))}
              value={status}
            />
          }
          search={
            <Input.Search
              allowClear
              aria-label="搜索任务"
              className={styles.search}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="搜索标题 / 编号 / Workspace"
              value={keyword}
            />
          }
          summary={
            mode === 'archived' ? (
              <Space size="small">
                <SemanticTag label="只读" tone="neutral" />
                <Typography.Text type="secondary">
                  共 {visibleRows.length} 项
                </Typography.Text>
              </Space>
            ) : (
              <Typography.Text type="secondary">
                共 {visibleRows.length} 项
              </Typography.Text>
            )
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
            scroll={{ x: 1100 }}
            search={false}
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
