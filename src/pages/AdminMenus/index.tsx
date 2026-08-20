import {
  PageContainer,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import { Button, Space, Switch } from 'antd';
import { useMemo, useState } from 'react';
import { SemanticTag } from '@/components/SemanticTag';
import { useStaticPrototypeAction } from '@/hooks/useStaticPrototypeAction';
import { MENU_GROUP_META } from './constant';
import { useStyles } from './index.style';
import { MenuModal } from './MenuModal';
import type { MenuQueryParams, MenuRow } from './type';
import { getMenuVisibilityAction, queryMenuRows } from './util';

type MenuModalState =
  | { mode: 'create' }
  | { mode: 'edit'; menu: MenuRow }
  | null;

export default function AdminMenusPage() {
  const { styles } = useStyles();
  const showStaticAction = useStaticPrototypeAction();
  const [modalState, setModalState] = useState<MenuModalState>(null);

  const columns = useMemo<ProColumns<MenuRow>[]>(
    () => [
      {
        dataIndex: 'icon',
        render: (_, row) => <span className={styles.icon}>{row.icon}</span>,
        title: '',
        width: 40,
      },
      {
        dataIndex: 'name',
        render: (_, row) => (
          <span className={styles.menuName}>
            <span>{row.name}</span>
            {row.isNew ? <SemanticTag label="新增" tone="brand" /> : null}
          </span>
        ),
        title: '菜单',
        width: 150,
      },
      {
        dataIndex: 'group',
        render: (_, row) => <SemanticTag {...MENU_GROUP_META[row.group]} />,
        title: '分组',
        width: 90,
      },
      {
        dataIndex: 'capability',
        render: (_, row) => (
          <span className={styles.capability}>{row.capability}</span>
        ),
        title: '可见条件',
        width: 410,
      },
      {
        dataIndex: 'visible',
        render: (_, row) => (
          <span className={styles.visibility}>
            <Switch
              aria-label={`${row.name}显示状态`}
              checked={row.visible}
              onChange={() => showStaticAction(getMenuVisibilityAction(row))}
              size="small"
            />
            <span>显示</span>
          </span>
        ),
        title: '状态',
        width: 120,
      },
      {
        fixed: 'right',
        render: (_, row) => (
          <Space size={0}>
            <Button
              aria-label={`上移 ${row.name}`}
              onClick={() => showStaticAction(`上移菜单 ${row.key}`)}
              size="small"
              type="link"
            >
              ↑
            </Button>
            <Button
              aria-label={`下移 ${row.name}`}
              onClick={() => showStaticAction(`下移菜单 ${row.key}`)}
              size="small"
              type="link"
            >
              ↓
            </Button>
            <Button
              aria-label={`编辑 ${row.name}`}
              onClick={() => setModalState({ mode: 'edit', menu: row })}
              size="small"
              type="link"
            >
              编辑
            </Button>
          </Space>
        ),
        title: '操作',
        valueType: 'option',
        width: 170,
      },
    ],
    [
      showStaticAction,
      styles.capability,
      styles.icon,
      styles.menuName,
      styles.visibility,
    ],
  );

  return (
    <PageContainer ghost pageHeaderRender={false}>
      <div className={styles.page}>
        <header className={styles.pageHeader}>
          <p className={styles.pageDescription}>
            菜单按登录人能力动态渲染；可见性只改善体验，不构成授权边界（服务端始终校验）
          </p>
          <Button
            aria-label="新增菜单"
            onClick={() => setModalState({ mode: 'create' })}
            type="primary"
          >
            ＋ 新增菜单
          </Button>
        </header>

        <ProTable<MenuRow, MenuQueryParams>
          columns={columns}
          options={false}
          pagination={{ pageSize: 20, showSizeChanger: false }}
          request={queryMenuRows}
          rowKey="key"
          scroll={{ x: 980 }}
          search={false}
          size="small"
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
