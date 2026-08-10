import { type ProColumns, ProTable } from '@ant-design/pro-components';
import { useMemo } from 'react';
import { SemanticTag } from '@/components/SemanticTag';
import { MODEL_EVALUATION_STATUS_META } from './constant';
import { useStyles } from './index.style';
import type { ModelEvaluationQueryParams, ModelEvaluationRow } from './type';
import { queryModelEvaluationRows } from './util';

export function ModelEvaluationPanel() {
  const { styles } = useStyles();
  const columns = useMemo<ProColumns<ModelEvaluationRow>[]>(
    () => [
      { dataIndex: 'modelName', title: '模型', width: 220 },
      { dataIndex: 'benchmark', title: '评测集', width: 240 },
      {
        dataIndex: 'score',
        render: (_, row) => `${row.score}%`,
        title: '得分',
        width: 120,
      },
      {
        dataIndex: 'status',
        render: (_, row) => (
          <SemanticTag {...MODEL_EVALUATION_STATUS_META[row.status]} />
        ),
        title: '结论',
        width: 120,
      },
      {
        dataIndex: 'evaluatedAt',
        title: '评测时间',
        valueType: 'dateTime',
        width: 180,
      },
    ],
    [],
  );

  return (
    <section aria-label="模型评测内容" className={styles.tabPanel}>
      <ProTable<ModelEvaluationRow, ModelEvaluationQueryParams>
        columns={columns}
        options={false}
        pagination={false}
        request={queryModelEvaluationRows}
        rowKey="id"
        scroll={{ x: 880 }}
        search={false}
        toolBarRender={false}
      />
    </section>
  );
}
