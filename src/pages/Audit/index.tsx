import {
  PageContainer,
  ProCard,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import { Button, Input, Select, Space, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { DetailDrawer } from '@/components/DetailDrawer';
import { FilterToolbar } from '@/components/FilterToolbar';
import { MetricCard } from '@/components/MetricCard';
import { MiniBarChart } from '@/components/MiniBarChart';
import { SemanticTag } from '@/components/SemanticTag';
import { useStaticPrototypeAction } from '@/hooks/useStaticPrototypeAction';
import {
  AUDIT_ACTION_DISTRIBUTION,
  AUDIT_ACTION_OPTIONS,
  AUDIT_DETAIL_COLUMNS,
  AUDIT_RANGE_OPTIONS,
  AUDIT_RESULT_META,
  AUDIT_RISK_META,
  AUDIT_RISK_OPTIONS,
  AUDIT_ROWS,
  AUDIT_TREND,
} from './constant';
import { useStyles } from './index.style';
import type { AuditQueryParams, AuditRange, AuditRow } from './type';
import { queryAuditRows, selectAuditRows } from './util';

const ACTION_TONE: Record<AuditRow['action'], 'brand' | 'info' | 'purple'> = {
  'Capability Activate': 'purple',
  'Artifact Accept': 'info',
  Promotion: 'brand',
  'Config Publish': 'purple',
};

export default function AuditPage() {
  const { styles } = useStyles();
  const showStaticAction = useStaticPrototypeAction();
  const [range, setRange] = useState<AuditRange>('all');
  const [action, setAction] =
    useState<NonNullable<AuditQueryParams['action']>>('all');
  const [risk, setRisk] =
    useState<NonNullable<AuditQueryParams['risk']>>('all');
  const [keyword, setKeyword] = useState('');
  const [selectedRow, setSelectedRow] = useState<AuditRow>();

  const queryParams = useMemo<AuditQueryParams>(
    () => ({ action, keyword, range, risk }),
    [action, keyword, range, risk],
  );
  const visibleCount = selectAuditRows(queryParams).length;
  const metrics = [
    {
      description: '当前静态审计样本',
      title: '审计事件',
      tone: 'neutral' as const,
      value: AUDIT_ROWS.length,
    },
    {
      description: '最近一个审计日',
      title: '今日事件',
      tone: 'brand' as const,
      value: AUDIT_ROWS.filter((row) => row.occurredAt.startsWith('2026-08-10'))
        .length,
    },
    {
      description: '需要优先复核',
      title: '高风险事件',
      tone: 'danger' as const,
      value: AUDIT_ROWS.filter((row) => row.risk === 'high').length,
    },
    {
      description: '未形成业务效果',
      title: '已拒绝',
      tone: 'warning' as const,
      value: AUDIT_ROWS.filter((row) => row.result === 'rejected').length,
    },
  ];

  const columns = useMemo<ProColumns<AuditRow>[]>(
    () => [
      {
        dataIndex: 'id',
        render: (_, row) => <span className={styles.code}>{row.id}</span>,
        title: '事件 ID',
        width: 180,
      },
      {
        dataIndex: 'occurredAt',
        sorter: true,
        title: '发生时间',
        valueType: 'dateTime',
        width: 180,
      },
      { dataIndex: 'actor', title: '操作人', width: 100 },
      {
        dataIndex: 'action',
        render: (_, row) => (
          <SemanticTag label={row.action} tone={ACTION_TONE[row.action]} />
        ),
        title: '动作',
        width: 180,
      },
      {
        dataIndex: 'target',
        render: (_, row) => <span className={styles.code}>{row.target}</span>,
        title: '目标',
        width: 240,
      },
      {
        dataIndex: 'risk',
        render: (_, row) => <SemanticTag {...AUDIT_RISK_META[row.risk]} />,
        title: '风险',
        width: 100,
      },
      {
        dataIndex: 'result',
        render: (_, row) => <SemanticTag {...AUDIT_RESULT_META[row.result]} />,
        title: '结果',
        width: 100,
      },
      {
        dataIndex: 'correlationId',
        render: (_, row) => (
          <span className={styles.code}>{row.correlationId}</span>
        ),
        title: 'Correlation ID',
        width: 200,
      },
      {
        fixed: 'right',
        render: (_, row) => (
          <Button onClick={() => setSelectedRow(row)} type="link">
            查看详情
          </Button>
        ),
        title: '操作',
        valueType: 'option',
        width: 110,
      },
    ],
    [styles.code],
  );

  const resultCounts = {
    success: AUDIT_ROWS.filter((row) => row.result === 'success').length,
    rejected: AUDIT_ROWS.filter((row) => row.result === 'rejected').length,
  };

  return (
    <PageContainer
      ghost
      subTitle="查看不可变审计事实，并通过 Correlation ID 串联排查链路"
      title="审计看板"
    >
      <div className={styles.page}>
        <section aria-label="审计指标" className={styles.metricsGrid}>
          {metrics.map((metric) => (
            <article
              aria-label={`${metric.title}：${metric.value}`}
              key={metric.title}
            >
              <MetricCard {...metric} />
            </article>
          ))}
        </section>

        <div className={styles.analysisGrid}>
          <ProCard className={styles.card} title="近 7 日操作数">
            <MiniBarChart
              ariaLabel="近 7 日审计趋势"
              data={AUDIT_TREND}
              height={140}
              highlightKey="08-10"
            />
          </ProCard>
          <ProCard className={styles.card} title="动作分类">
            <MiniBarChart
              ariaLabel="审计动作分类"
              data={AUDIT_ACTION_DISTRIBUTION}
              height={140}
              highlightKey="config"
            />
          </ProCard>
          <ProCard className={styles.card} title="结果分布">
            <ul aria-label="审计结果分布" className={styles.resultList}>
              {(Object.keys(resultCounts) as AuditRow['result'][]).map(
                (result) => (
                  <li className={styles.resultItem} key={result}>
                    <span className={styles.resultLabel}>
                      <SemanticTag {...AUDIT_RESULT_META[result]} />
                    </span>
                    <span className={styles.resultValue}>
                      {resultCounts[result]}
                    </span>
                  </li>
                ),
              )}
            </ul>
            <p className={styles.note}>
              全链路以 Correlation ID 串联；审计事实不可修改。
            </p>
          </ProCard>
        </div>

        <FilterToolbar
          actions={
            <Space wrap>
              <Button onClick={() => showStaticAction('保存审计筛选')}>
                保存筛选
              </Button>
              <Button
                onClick={() => showStaticAction('导出审计报表')}
                type="primary"
              >
                导出报表
              </Button>
            </Space>
          }
          ariaLabel="审计筛选与操作"
          filters={
            <Space wrap>
              <Select<AuditRange>
                aria-label="时间范围"
                className={styles.filter}
                id="audit-range-filter"
                onChange={setRange}
                options={AUDIT_RANGE_OPTIONS.map((option) => ({ ...option }))}
                value={range}
                virtual={false}
              />
              <Select<NonNullable<AuditQueryParams['action']>>
                aria-label="审计动作"
                className={styles.actionFilter}
                id="audit-action-filter"
                onChange={setAction}
                options={AUDIT_ACTION_OPTIONS.map((option) => ({ ...option }))}
                value={action}
                virtual={false}
              />
              <Select<NonNullable<AuditQueryParams['risk']>>
                aria-label="风险等级"
                className={styles.filter}
                id="audit-risk-filter"
                onChange={setRisk}
                options={AUDIT_RISK_OPTIONS.map((option) => ({ ...option }))}
                value={risk}
                virtual={false}
              />
            </Space>
          }
          search={
            <Input.Search
              allowClear
              aria-label="搜索审计"
              className={styles.search}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="操作人 / 目标 / Correlation ID"
              value={keyword}
            />
          }
          summary={
            <Typography.Text type="secondary">
              共 {visibleCount} 条审计事件
            </Typography.Text>
          }
        />

        <ProTable<AuditRow, AuditQueryParams>
          columns={columns}
          options={false}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          params={queryParams}
          request={queryAuditRows}
          rowKey="id"
          scroll={{ x: 1180 }}
          search={false}
          toolBarRender={false}
        />

        {selectedRow ? (
          <DetailDrawer<AuditRow>
            columns={AUDIT_DETAIL_COLUMNS}
            dataSource={selectedRow}
            onClose={() => setSelectedRow(undefined)}
            open
            size={460}
            title="审计事件详情"
          />
        ) : null}
      </div>
    </PageContainer>
  );
}
