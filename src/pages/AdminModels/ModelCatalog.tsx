import { type ProColumns, ProTable } from '@ant-design/pro-components';
import { Button, Space, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { FilterToolbar } from '@/components/FilterToolbar';
import { SemanticTag } from '@/components/SemanticTag';
import { useStaticPrototypeAction } from '@/hooks/useStaticPrototypeAction';
import { MODEL_STATUS_META } from './constant';
import { useStyles } from './index.style';
import { ModelModal } from './ModelModal';
import type { ModelQueryParams, ModelRow } from './type';
import { queryModelRows } from './util';

type ModelModalState = { model?: ModelRow } | null;

export function ModelCatalog() {
  const { styles } = useStyles();
  const [modalState, setModalState] = useState<ModelModalState>(null);
  const showStaticAction = useStaticPrototypeAction();

  const columns = useMemo<ProColumns<ModelRow>[]>(
    () => [
      {
        dataIndex: 'name',
        render: (_, row) => <strong>{row.name}</strong>,
        title: '模型',
        width: 150,
      },
      {
        className: styles.code,
        dataIndex: 'deployment',
        title: '部署名',
        width: 150,
      },
      { dataIndex: 'use', title: '用途', width: 170 },
      { dataIndex: 'access', title: '接入', width: 190 },
      {
        dataIndex: 'context',
        title: '上下文',
        width: 70,
      },
      {
        className: styles.code,
        dataIndex: 'rateLimit',
        render: (_, row) => `${row.rateLimit} RPM`,
        title: '限流',
        width: 90,
      },
      {
        dataIndex: 'status',
        render: (_, row) => <SemanticTag {...MODEL_STATUS_META[row.status]} />,
        title: '状态',
        width: 70,
      },
      {
        fixed: 'right',
        render: (_, row) => (
          <Space size="small">
            <Button
              aria-label={`配置 ${row.name}`}
              onClick={() => setModalState({ model: row })}
              size="small"
              type="link"
            >
              配置
            </Button>
            <Button
              aria-label={`${row.status === 'active' ? '停用' : '启用'} ${row.name}`}
              onClick={() =>
                showStaticAction(
                  `${row.status === 'active' ? '停用' : '启用'}模型 ${row.name}`,
                )
              }
              size="small"
              type="link"
            >
              {row.status === 'active' ? '停用' : '启用'}
            </Button>
          </Space>
        ),
        title: '操作',
        valueType: 'option',
        width: 150,
      },
    ],
    [showStaticAction, styles.code],
  );

  return (
    <section aria-label="模型目录内容">
      <FilterToolbar
        actions={
          <Button onClick={() => setModalState({})} type="primary">
            接入模型
          </Button>
        }
        ariaLabel="模型筛选与操作"
        summary={
          <Typography.Text type="secondary">
            Chat（对话）与 Execution（执行）独立治理；Agent
            请求逻辑能力（coding-backend / review-code…），由 Route
            Policy（路由策略）解析到实际模型部署
          </Typography.Text>
        }
      />

      <ProTable<ModelRow, ModelQueryParams>
        columns={columns}
        options={false}
        pagination={false}
        request={queryModelRows}
        rowKey="id"
        scroll={{ x: 1040 }}
        search={false}
        size="small"
        toolBarRender={false}
      />

      <Typography.Text className={styles.catalogNote} type="secondary">
        Provider 参数由 Adapter 映射，不渗入业务模型 · 联网搜索 / 深度思考为
        Deployment Capability
      </Typography.Text>

      {modalState ? (
        <ModelModal
          model={modalState.model}
          onClose={() => setModalState(null)}
          open
        />
      ) : null}
    </section>
  );
}
