import { Column } from '@ant-design/charts';
import {
  type ActionType,
  PageContainer,
  ProCard,
  type ProColumns,
  ProTable,
  type ProTableProps,
} from '@ant-design/pro-components';
import { App, Button, Input, Select, Space, Typography, theme } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DetailDrawer } from '@/components/DetailDrawer';
import { FilterToolbar } from '@/components/FilterToolbar';
import { MetricCard } from '@/components/MetricCard';
import { SemanticTag } from '@/components/SemanticTag';
import { formatGovernanceError } from '@/features/administration';
import {
  AUDIT_ACTION_DISTRIBUTION,
  AUDIT_ACTION_OPTIONS,
  AUDIT_DETAIL_COLUMNS,
  AUDIT_METRICS,
  AUDIT_PAGE_SIZE,
  AUDIT_RANGE_OPTIONS,
  AUDIT_RESULT_COUNTS,
  AUDIT_RESULT_META,
  AUDIT_RISK_META,
  AUDIT_RISK_OPTIONS,
  AUDIT_TARGET_TYPE_OPTIONS,
  AUDIT_TREND,
} from './constant';
import { useStyles } from './index.style';
import type { AuditQueryParams, AuditRange, AuditRow } from './type';
import { mergeAndSelectAuditRows, queryAuditRows } from './util';

const ACTION_TONE: Record<AuditRow['action'], 'brand' | 'info' | 'purple'> = {
  'Capability Activate': 'purple',
  'Artifact Accept': 'info',
  Promotion: 'brand',
  'Config Publish': 'purple',
};

export default function AuditPage() {
  const { message } = App.useApp();
  const { styles } = useStyles();
  const { token } = theme.useToken();
  const actionRef = useRef<ActionType | undefined>(undefined);
  const requestSequenceRef = useRef(0);
  const loadedRowsRef = useRef<AuditRow[]>([]);
  const [range, setRange] = useState<AuditRange>('all');
  const [action, setAction] =
    useState<NonNullable<AuditQueryParams['action']>>('all');
  const [risk, setRisk] =
    useState<NonNullable<AuditQueryParams['risk']>>('all');
  const [actor, setActor] = useState('');
  const [targetType, setTargetType] =
    useState<NonNullable<AuditQueryParams['targetType']>>('all');
  const [cursor, setCursor] = useState<string>();
  const [nextCursor, setNextCursor] = useState<string | null>();
  const [visibleCount, setVisibleCount] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedRow, setSelectedRow] = useState<AuditRow>();

  const resetCursor = useCallback(() => {
    requestSequenceRef.current += 1;
    loadedRowsRef.current = [];
    setCursor(undefined);
    setNextCursor(undefined);
    setVisibleCount(0);
  }, []);

  useEffect(
    () => () => {
      requestSequenceRef.current += 1;
    },
    [],
  );

  const queryParams = useMemo<AuditQueryParams>(
    () => ({
      action,
      actor,
      cursor,
      pageSize: AUDIT_PAGE_SIZE,
      range,
      risk,
      targetType,
    }),
    [action, actor, cursor, range, risk, targetType],
  );

  const requestAuditRows = useCallback<
    NonNullable<ProTableProps<AuditRow, AuditQueryParams>['request']>
  >(
    async (params, sort, filter) => {
      const requestSequence = ++requestSequenceRef.current;
      const appending = params.cursor !== undefined;
      if (appending) {
        setLoadingMore(true);
      }
      try {
        const result = await queryAuditRows(params, sort, filter);
        if (requestSequence !== requestSequenceRef.current) {
          return { data: [], success: false };
        }
        const nextRows = appending
          ? mergeAndSelectAuditRows(
              loadedRowsRef.current,
              result.data,
              params,
              sort,
              filter,
            )
          : [...result.data];
        loadedRowsRef.current = nextRows;
        setNextCursor(result.nextCursor);
        setVisibleCount(nextRows.length);
        return { data: nextRows, success: true };
      } catch (error) {
        if (requestSequence !== requestSequenceRef.current) {
          return { data: [], success: false };
        }
        if (!appending) {
          loadedRowsRef.current = [];
          setVisibleCount(0);
          setNextCursor(null);
        }
        message.error(formatGovernanceError(error, '审计事件加载失败'));
        return { data: [...loadedRowsRef.current], success: true };
      } finally {
        if (requestSequence === requestSequenceRef.current) {
          setLoadingMore(false);
        }
      }
    },
    [message],
  );

  const loadMore = useCallback(() => {
    if (!nextCursor) {
      return;
    }
    if (cursor === nextCursor) {
      void actionRef.current?.reload();
      return;
    }
    setCursor(nextCursor);
  }, [cursor, nextCursor]);

  const showStaticAction = (actionLabel: string) => {
    message.info(`静态原型操作：${actionLabel}，未保存任何业务数据。`);
  };

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

  return (
    <PageContainer ghost pageHeaderRender={false}>
      <div className={styles.page}>
        <section aria-label="审计指标" className={styles.metricsGrid}>
          {AUDIT_METRICS.map((metric) => (
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
            <figure aria-label="近 7 日审计趋势" className={styles.chartFigure}>
              <Column
                animate={false}
                axis={{ x: { title: false }, y: false }}
                data={[...AUDIT_TREND]}
                height={140}
                label={{ position: 'top', text: 'valueLabel' }}
                style={{
                  fill: (datum: (typeof AUDIT_TREND)[number]) =>
                    datum.tone === 'success'
                      ? token.colorSuccess
                      : token.colorPrimary,
                }}
                xField="label"
                yField="value"
              />
            </figure>
          </ProCard>
          <ProCard className={styles.card} title="动作分类">
            <figure aria-label="审计动作分类" className={styles.chartFigure}>
              <Column
                animate={false}
                axis={{ x: { title: false }, y: false }}
                data={[...AUDIT_ACTION_DISTRIBUTION]}
                height={140}
                label={{ position: 'top', text: 'valueLabel' }}
                style={{ fill: token.colorPrimary }}
                xField="label"
                yField="value"
              />
            </figure>
          </ProCard>
          <ProCard className={styles.card} title="结果分布">
            <ul aria-label="审计结果分布" className={styles.resultList}>
              {(Object.keys(AUDIT_RESULT_COUNTS) as AuditRow['result'][]).map(
                (result) => (
                  <li className={styles.resultItem} key={result}>
                    <span className={styles.resultLabel}>
                      <SemanticTag {...AUDIT_RESULT_META[result]} />
                    </span>
                    <span className={styles.resultValue}>
                      {AUDIT_RESULT_COUNTS[result]}
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
                onChange={(nextRange) => {
                  resetCursor();
                  setRange(nextRange);
                }}
                options={AUDIT_RANGE_OPTIONS.map((option) => ({ ...option }))}
                value={range}
                virtual={false}
              />
              <Select<NonNullable<AuditQueryParams['targetType']>>
                aria-label="目标类型"
                className={styles.filter}
                id="audit-target-type-filter"
                onChange={(nextTargetType) => {
                  resetCursor();
                  setTargetType(nextTargetType);
                }}
                options={AUDIT_TARGET_TYPE_OPTIONS.map((option) => ({
                  ...option,
                }))}
                value={targetType}
                virtual={false}
              />
              <Select<NonNullable<AuditQueryParams['action']>>
                aria-label="审计动作"
                className={styles.actionFilter}
                id="audit-action-filter"
                onChange={(nextAction) => {
                  resetCursor();
                  setAction(nextAction);
                }}
                options={AUDIT_ACTION_OPTIONS.map((option) => ({ ...option }))}
                value={action}
                virtual={false}
              />
              <Select<NonNullable<AuditQueryParams['risk']>>
                aria-label="风险等级"
                className={styles.filter}
                id="audit-risk-filter"
                onChange={(nextRisk) => {
                  resetCursor();
                  setRisk(nextRisk);
                }}
                options={AUDIT_RISK_OPTIONS.map((option) => ({ ...option }))}
                value={risk}
                virtual={false}
              />
            </Space>
          }
          search={
            <Input.Search
              allowClear
              aria-label="操作人"
              className={styles.search}
              onChange={(event) => {
                resetCursor();
                setActor(event.target.value);
              }}
              placeholder="输入操作人"
              value={actor}
            />
          }
          summary={
            <Typography.Text type="secondary">
              已加载 {visibleCount} 条审计事件
            </Typography.Text>
          }
        />

        <ProTable<AuditRow, AuditQueryParams>
          actionRef={actionRef}
          columns={columns}
          onChange={resetCursor}
          options={false}
          pagination={false}
          params={queryParams}
          request={requestAuditRows}
          rowKey="id"
          scroll={{ x: 1180 }}
          search={false}
          toolBarRender={false}
        />

        {nextCursor ? (
          <div className={styles.loadMore}>
            <Button loading={loadingMore} onClick={loadMore}>
              加载更多
            </Button>
          </div>
        ) : null}

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
