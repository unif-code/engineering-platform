import {
  PageContainer,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import { useLocation } from '@umijs/max';
import { Button, Empty, Input, Segmented, Space, Tooltip } from 'antd';
import { useEffect, useState } from 'react';
import { FilterToolbar } from '@/components/FilterToolbar';
import { useStyles } from './index.style';
import { TaskBoard } from './TaskBoard';

interface TaskTableRow {
  agent: string;
  id: string;
  owner: string;
  repository: string;
  status: string;
  team: string;
  title: string;
  updatedAt: string;
}

type TaskView = 'table' | 'board';
type TaskStatus = '全部' | '待处理' | '运行中' | '阻塞' | '已完成' | '已归档';

const taskRows: readonly TaskTableRow[] = [];

const columns: ProColumns<TaskTableRow>[] = [
  { dataIndex: 'id', title: '编号', width: 120 },
  { dataIndex: 'title', title: '任务标题', width: 220 },
  { dataIndex: 'team', title: 'Team', width: 90 },
  { dataIndex: 'repository', title: '仓库', width: 180 },
  { dataIndex: 'status', title: '状态', width: 110 },
  { dataIndex: 'owner', title: '责任人', width: 110 },
  { dataIndex: 'agent', title: 'Agent', width: 100 },
  { dataIndex: 'updatedAt', title: '更新', width: 110 },
  { title: '操作', valueType: 'option', width: 110 },
];

export function TaskListPage() {
  const { styles } = useStyles();
  const location = useLocation();
  const archived =
    new URLSearchParams(location.search).get('view') === 'archived';
  const [status, setStatus] = useState<TaskStatus>(
    archived ? '已归档' : '全部',
  );
  const [view, setView] = useState<TaskView>('table');

  useEffect(() => {
    setStatus(archived ? '已归档' : '全部');
  }, [archived]);

  return (
    <PageContainer ghost pageHeaderRender={false}>
      <div className={styles.page}>
        <h1 className={styles.pageTitle}>{archived ? '归档任务' : '任务'}</h1>
        <FilterToolbar
          actions={
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
              <Tooltip title="当前版本暂未接入">
                <span>
                  <Button disabled type="primary">
                    创建任务
                  </Button>
                </span>
              </Tooltip>
            </Space>
          }
          ariaLabel="任务筛选与操作"
          filters={
            <Segmented<TaskStatus>
              aria-label="任务状态"
              onChange={setStatus}
              options={['全部', '待处理', '运行中', '阻塞', '已完成', '已归档']}
              shape="round"
              size="small"
              value={status}
            />
          }
          search={
            <Tooltip title="当前版本暂未接入">
              <span className={styles.searchHint}>
                <Input.Search
                  allowClear
                  aria-label="搜索任务：当前版本暂未接入"
                  className={styles.search}
                  disabled
                  placeholder="搜索标题 / 编号"
                  title="当前版本暂未接入"
                />
              </span>
            </Tooltip>
          }
        />

        {view === 'table' ? (
          <ProTable<TaskTableRow>
            columns={columns}
            dataSource={[...taskRows]}
            locale={{
              emptyText: (
                <Empty
                  description={
                    archived ? '暂无真实归档任务数据' : '暂无真实任务数据'
                  }
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              ),
            }}
            options={false}
            pagination={false}
            rowKey="id"
            scroll={{ x: 1200 }}
            search={false}
            size="small"
            toolBarRender={false}
          />
        ) : (
          <TaskBoard rows={taskRows} />
        )}
      </div>
    </PageContainer>
  );
}
