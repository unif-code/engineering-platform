import { type ProColumns, ProTable } from '@ant-design/pro-components';
import { Typography } from 'antd';
import { useMemo } from 'react';
import { MODEL_EVALUATION_JOBS } from './constant';
import { useStyles } from './index.style';
import type { ModelEvaluationQueryParams, ModelEvaluationRow } from './type';
import { queryModelEvaluationRows } from './util';

export function ModelEvaluationPanel() {
  const { styles } = useStyles();
  const columns = useMemo<ProColumns<ModelEvaluationRow>[]>(
    () => [
      {
        className: styles.code,
        dataIndex: 'id',
        title: '证据 ID',
        width: 90,
      },
      { dataIndex: 'type', title: '类型', width: 130 },
      {
        className: styles.code,
        dataIndex: 'deployment',
        title: '目标 Deployment',
        width: 160,
      },
      { dataIndex: 'snapshot', title: '输入 / 阈值快照', width: 260 },
      {
        dataIndex: 'conclusion',
        render: (_, row) => (
          <Typography.Text
            type={row.status === 'passed' ? 'success' : 'warning'}
          >
            {row.conclusion}
          </Typography.Text>
        ),
        title: '结论（owner 判定）',
        width: 260,
      },
      { dataIndex: 'evaluatedAt', title: '时间', width: 100 },
    ],
    [styles.code],
  );

  return (
    <section aria-label="模型评测内容">
      <Typography.Paragraph type="secondary">
        评测只经 ModelEvaluationPort → ModelGatewayPort 调用批准的 Deployment，
        不取得 Provider
        凭据；输入、阈值与结果冻结为不可变评测证据，业务是否通过由对应 owner
        判定
      </Typography.Paragraph>

      <div className={styles.evaluationJobs}>
        {MODEL_EVALUATION_JOBS.map((job) => (
          <article
            aria-label={job.name}
            className={styles.evaluationJob}
            key={job.key}
          >
            <div className={styles.evaluationJobTitle}>
              <Typography.Text strong>{job.name}</Typography.Text>
              <Typography.Text code>{job.version}</Typography.Text>
            </div>
            <Typography.Text>{job.use}</Typography.Text>
            <Typography.Text type="secondary">{job.mode}</Typography.Text>
            <Typography.Text className={styles.evaluationLatest}>
              {job.latest}
            </Typography.Text>
          </article>
        ))}
      </div>

      <ProTable<ModelEvaluationRow, ModelEvaluationQueryParams>
        columns={columns}
        headerTitle="评测证据（不可变）"
        options={false}
        pagination={false}
        request={queryModelEvaluationRows}
        rowKey="id"
        scroll={{ x: 1000 }}
        search={false}
        size="small"
        toolBarRender={false}
      />
    </section>
  );
}
