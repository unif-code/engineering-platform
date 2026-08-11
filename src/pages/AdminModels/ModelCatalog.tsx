import { type ProColumns, ProTable } from '@ant-design/pro-components';
import { Button, Input, Select, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { FilterToolbar } from '@/components/FilterToolbar';
import { SemanticTag } from '@/components/SemanticTag';
import { MODEL_STATUS_META, MODEL_STATUS_OPTIONS } from './constant';
import { useStyles } from './index.style';
import { ModelModal } from './ModelModal';
import type { ModelQueryParams, ModelRow } from './type';
import { queryModelRows, selectModelRows } from './util';

type ModelModalState = { model?: ModelRow } | null;

const contextWindowFormatter = new Intl.NumberFormat('zh-CN');

export function ModelCatalog() {
  const { styles } = useStyles();
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] =
    useState<NonNullable<ModelQueryParams['status']>>('all');
  const [modalState, setModalState] = useState<ModelModalState>(null);

  const queryParams = useMemo<ModelQueryParams>(
    () => ({ keyword, status }),
    [keyword, status],
  );
  const visibleCount = selectModelRows(queryParams).length;

  const columns = useMemo<ProColumns<ModelRow>[]>(
    () => [
      {
        dataIndex: 'name',
        render: (_, row) => (
          <span className={styles.modelName}>
            <strong>{row.name}</strong>
            <span className={styles.modelId}>{row.id}</span>
          </span>
        ),
        title: '模型',
        width: 230,
      },
      { dataIndex: 'provider', title: 'Provider', width: 140 },
      {
        dataIndex: 'contextWindow',
        render: (_, row) => (
          <span className={styles.contextWindow}>
            {contextWindowFormatter.format(row.contextWindow)}
          </span>
        ),
        sorter: true,
        title: '上下文窗口',
        width: 150,
      },
      { dataIndex: 'purpose', title: '用途', width: 220 },
      {
        dataIndex: 'status',
        render: (_, row) => <SemanticTag {...MODEL_STATUS_META[row.status]} />,
        title: '状态',
        width: 110,
      },
      {
        dataIndex: 'updatedAt',
        sorter: true,
        title: '更新时间',
        valueType: 'dateTime',
        width: 170,
      },
      {
        fixed: 'right',
        render: (_, row) => (
          <Button
            aria-label={`编辑 ${row.name}`}
            onClick={() => setModalState({ model: row })}
            type="link"
          >
            编辑
          </Button>
        ),
        title: '操作',
        valueType: 'option',
        width: 100,
      },
    ],
    [styles.contextWindow, styles.modelId, styles.modelName],
  );

  return (
    <section aria-label="模型目录内容" className={styles.tabPanel}>
      <FilterToolbar
        actions={
          <Button onClick={() => setModalState({})} type="primary">
            接入模型
          </Button>
        }
        ariaLabel="模型筛选与操作"
        filters={
          <Select<NonNullable<ModelQueryParams['status']>>
            aria-label="模型状态"
            className={styles.filter}
            id="admin-model-status-filter"
            onChange={setStatus}
            options={MODEL_STATUS_OPTIONS.map((option) => ({ ...option }))}
            value={status}
            virtual={false}
          />
        }
        search={
          <Input.Search
            allowClear
            aria-label="搜索模型"
            className={styles.search}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="名称 / Provider / 用途"
            value={keyword}
          />
        }
        summary={
          <Typography.Text type="secondary">
            共 {visibleCount} 个模型
          </Typography.Text>
        }
      />

      <ProTable<ModelRow, ModelQueryParams>
        columns={columns}
        key={JSON.stringify(queryParams)}
        options={false}
        pagination={{ pageSize: 10, showSizeChanger: false }}
        params={queryParams}
        request={queryModelRows}
        rowKey="id"
        scroll={{ x: 1120 }}
        search={false}
        toolBarRender={false}
      />

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
