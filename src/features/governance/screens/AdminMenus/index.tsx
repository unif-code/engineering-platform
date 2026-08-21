import {
  PageContainer,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import { useModel } from '@umijs/max';
import { Button, Empty, Tooltip, Typography } from 'antd';
import { useMemo } from 'react';
import { SemanticTag } from '@/components/SemanticTag';
import { useStyles } from './index.style';
import type { MenuRow } from './type';
import { projectNavigationToMenuRows } from './util';

const EMPTY_DESCRIPTION = '当前没有真实数据';
const UNAVAILABLE_TITLE = '当前版本暂未接入';
const GROUP_META = {
  user: { label: '用户端', tone: 'brand' },
  admin: { label: '管理端', tone: 'neutral' },
} as const;

export default function AdminMenusPage() {
  const { styles } = useStyles();
  const { initialState } = useModel('@@initialState');
  const rows = useMemo(
    () => projectNavigationToMenuRows(initialState?.navigation ?? []),
    [initialState?.navigation],
  );

  const columns: ProColumns<MenuRow>[] = [
    {
      render: (_, row) => <span className={styles.icon}>{row.icon}</span>,
      title: '',
      width: 40,
    },
    { dataIndex: 'name', title: '菜单', width: 150 },
    {
      render: (_, row) => <SemanticTag {...GROUP_META[row.group]} />,
      title: '分组',
      width: 90,
    },
    {
      render: () => <Typography.Text type="secondary">—</Typography.Text>,
      title: '可见条件',
      width: 410,
    },
    {
      render: () => <SemanticTag label="当前可见" tone="success" />,
      title: '状态',
      width: 120,
    },
    {
      render: () => <Typography.Text type="secondary">—</Typography.Text>,
      title: '操作',
      width: 170,
    },
  ];

  return (
    <PageContainer ghost pageHeaderRender={false}>
      <main className={styles.page}>
        <header className={styles.pageHeader}>
          <Typography.Text type="secondary">
            菜单按登录人能力动态渲染；可见性只改善体验，不构成授权边界（服务端始终校验）
          </Typography.Text>
          <Tooltip title={UNAVAILABLE_TITLE}>
            <Button
              aria-label="新增菜单"
              disabled
              title={UNAVAILABLE_TITLE}
              type="primary"
            >
              ＋ 新增菜单
            </Button>
          </Tooltip>
        </header>

        <ProTable<MenuRow>
          columns={columns}
          dataSource={rows}
          locale={{
            emptyText: <Empty description={EMPTY_DESCRIPTION} />,
          }}
          options={false}
          pagination={false}
          rowKey="key"
          scroll={{ x: 980 }}
          search={false}
          size="small"
          toolBarRender={false}
        />
      </main>
    </PageContainer>
  );
}
