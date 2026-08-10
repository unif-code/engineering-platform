import {
  PageContainer,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import { Button, Select, Space, Switch, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { FilterToolbar } from '@/components/FilterToolbar';
import { SemanticTag } from '@/components/SemanticTag';
import { useStaticPrototypeAction } from '@/hooks/useStaticPrototypeAction';
import {
  MENU_GROUP_META,
  MENU_GROUP_OPTIONS,
  MENU_VISIBILITY_OPTIONS,
} from './constant';
import { useStyles } from './index.style';
import { MenuModal } from './MenuModal';
import type { MenuQueryParams, MenuRow } from './type';
import { queryMenuRows, selectMenuRows } from './util';

type MenuModalState =
  | { mode: 'create' }
  | { mode: 'edit'; menu: MenuRow }
  | null;

export default function AdminMenusPage() {
  const { styles } = useStyles();
  const showStaticAction = useStaticPrototypeAction();
  const [group, setGroup] =
    useState<NonNullable<MenuQueryParams['group']>>('all');
  const [visible, setVisible] =
    useState<NonNullable<MenuQueryParams['visible']>>('all');
  const [modalState, setModalState] = useState<MenuModalState>(null);

  const queryParams = useMemo<MenuQueryParams>(
    () => ({ group, visible }),
    [group, visible],
  );
  const visibleCount = selectMenuRows(queryParams).length;

  const columns = useMemo<ProColumns<MenuRow>[]>(
    () => [
      {
        dataIndex: 'name',
        title: '菜单名称',
        width: 160,
      },
      {
        dataIndex: 'key',
        render: (_, row) => <span className={styles.code}>{row.key}</span>,
        title: 'Route Key',
        width: 140,
      },
      {
        dataIndex: 'path',
        render: (_, row) => <span className={styles.code}>{row.path}</span>,
        title: '路径',
        width: 200,
      },
      {
        dataIndex: 'group',
        render: (_, row) => <SemanticTag {...MENU_GROUP_META[row.group]} />,
        title: '分组',
        width: 100,
      },
      {
        dataIndex: 'order',
        defaultSortOrder: 'ascend',
        sorter: true,
        title: '顺序',
        width: 80,
      },
      {
        dataIndex: 'visible',
        render: (_, row) => (
          <Switch
            aria-label={`${row.name}显示状态`}
            checked={row.visible}
            onChange={() =>
              showStaticAction(
                `${row.visible ? '隐藏' : '显示'}菜单 ${row.key}`,
              )
            }
          />
        ),
        title: '显示',
        width: 100,
      },
      {
        fixed: 'right',
        render: (_, row) => (
          <Space size={0}>
            <Button
              aria-label={`上移 ${row.name}`}
              onClick={() => showStaticAction(`上移菜单 ${row.key}`)}
              type="link"
            >
              上移
            </Button>
            <Button
              aria-label={`下移 ${row.name}`}
              onClick={() => showStaticAction(`下移菜单 ${row.key}`)}
              type="link"
            >
              下移
            </Button>
            <Button
              aria-label={`编辑 ${row.name}`}
              onClick={() => setModalState({ mode: 'edit', menu: row })}
              type="link"
            >
              编辑
            </Button>
          </Space>
        ),
        title: '操作',
        valueType: 'option',
        width: 270,
      },
    ],
    [showStaticAction, styles.code],
  );

  return (
    <PageContainer
      ghost
      subTitle="维护静态 Route Registry 的菜单展示副本；当前操作不会保存"
      title="菜单管理"
    >
      <div className={styles.page}>
        <FilterToolbar
          actions={
            <Button
              onClick={() => setModalState({ mode: 'create' })}
              type="primary"
            >
              新增菜单
            </Button>
          }
          ariaLabel="菜单筛选与操作"
          filters={
            <span className={styles.filters}>
              <Select<NonNullable<MenuQueryParams['group']>>
                aria-label="菜单分组"
                className={styles.filter}
                id="admin-menu-group-filter"
                onChange={setGroup}
                options={MENU_GROUP_OPTIONS.map((option) => ({ ...option }))}
                value={group}
                virtual={false}
              />
              <Select<NonNullable<MenuQueryParams['visible']>>
                aria-label="菜单显示状态"
                className={styles.filter}
                id="admin-menu-visible-filter"
                onChange={setVisible}
                options={MENU_VISIBILITY_OPTIONS.map((option) => ({
                  ...option,
                }))}
                value={visible}
                virtual={false}
              />
            </span>
          }
          summary={
            <Typography.Text type="secondary">
              共 {visibleCount} 个菜单
            </Typography.Text>
          }
        />

        <ProTable<MenuRow, MenuQueryParams>
          columns={columns}
          options={false}
          pagination={{ pageSize: 20, showSizeChanger: false }}
          params={queryParams}
          request={queryMenuRows}
          rowKey="key"
          scroll={{ x: 1050 }}
          search={false}
          toolBarRender={false}
        />

        {modalState ? (
          <MenuModal
            menu={modalState.mode === 'edit' ? modalState.menu : undefined}
            onClose={() => setModalState(null)}
            open
          />
        ) : null}
      </div>
    </PageContainer>
  );
}
