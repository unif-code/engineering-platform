import {
  PageContainer,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import { Button, Card, Empty, Tabs, Tooltip, Typography } from 'antd';
import { useStyles } from './index.style';

type EmptyRow = Record<string, unknown>;

const EMPTY_DESCRIPTION = '当前没有真实数据';
const UNAVAILABLE_TITLE = '当前版本暂未接入';
const emptyTableLocale = {
  emptyText: <Empty description={EMPTY_DESCRIPTION} />,
};

const catalogColumns: ProColumns<EmptyRow>[] = [
  { title: '模型', width: 150 },
  { title: '部署名', width: 150 },
  { title: '用途', width: 170 },
  { title: '接入', width: 190 },
  { title: '上下文', width: 70 },
  { title: '限流', width: 90 },
  { title: '状态', width: 70 },
  { title: '操作', width: 150 },
];

const evidenceColumns: ProColumns<EmptyRow>[] = [
  { title: '证据 ID', width: 80 },
  { title: '类型', width: 130 },
  { title: '目标 Deployment', width: 150 },
  { title: '输入 / 阈值快照', width: 220 },
  { title: '结论（owner 判定）', width: 240 },
  { title: '时间', width: 90 },
];

function ModelCatalog() {
  const { styles } = useStyles();

  return (
    <section aria-label="模型目录内容" className={styles.section}>
      <header className={styles.toolbar}>
        <Typography.Text type="secondary">
          Chat（对话）与 Execution（执行）独立治理；Agent
          请求逻辑能力（coding-backend / review-code…），由 Route
          Policy（路由策略）解析到实际模型部署
        </Typography.Text>
        <Tooltip title={UNAVAILABLE_TITLE}>
          <Button disabled title={UNAVAILABLE_TITLE} type="primary">
            接入模型
          </Button>
        </Tooltip>
      </header>
      <ProTable<EmptyRow>
        columns={catalogColumns}
        dataSource={[]}
        locale={emptyTableLocale}
        options={false}
        pagination={false}
        rowKey="key"
        scroll={{ x: 1040 }}
        search={false}
        size="small"
        toolBarRender={false}
      />
      <Typography.Text className={styles.note} type="secondary">
        Provider 参数由 Adapter 映射，不渗入业务模型 · 联网搜索 / 深度思考为
        Deployment Capability
      </Typography.Text>
    </section>
  );
}

function EmptyRegion({ name }: { name: string }) {
  const { styles } = useStyles();

  return (
    <section aria-label={name} className={styles.emptyRegion}>
      <Typography.Title className={styles.sectionTitle} level={3}>
        {name}
      </Typography.Title>
      <Empty description={EMPTY_DESCRIPTION} />
    </section>
  );
}

function ModelUsage() {
  const { styles } = useStyles();

  return (
    <div className={styles.usagePage}>
      <EmptyRegion name="模型调用 KPI" />
      <div className={styles.usageGrid}>
        <div className={styles.usagePrimary}>
          <EmptyRegion name="调用量趋势" />
          <EmptyRegion name="Chat 与 Agent 调用占比" />
        </div>
        <div className={styles.usageSecondary}>
          <EmptyRegion name="按模型分布" />
          <EmptyRegion name="按 Team 分布" />
        </div>
      </div>
    </div>
  );
}

function ModelEvaluation() {
  const { styles } = useStyles();

  return (
    <section aria-label="模型评测内容" className={styles.section}>
      <Typography.Paragraph type="secondary">
        评测只经 ModelEvaluationPort → ModelGatewayPort 调用批准的
        Deployment，不取得 Provider
        凭据；输入、阈值与结果冻结为不可变评测证据，业务是否通过由对应 owner
        判定
      </Typography.Paragraph>
      <EmptyRegion name="评测作业" />
      <section aria-label="评测证据" className={styles.evidence}>
        <Card
          className={styles.evidenceTitle}
          size="small"
          title="评测证据（不可变）"
        />
        <ProTable<EmptyRow>
          columns={evidenceColumns}
          dataSource={[]}
          locale={emptyTableLocale}
          options={false}
          pagination={false}
          rowKey="key"
          scroll={{ x: 1000 }}
          search={false}
          size="small"
          toolBarRender={false}
        />
      </section>
    </section>
  );
}

const MODEL_TAB_ITEMS = [
  { children: <ModelCatalog />, key: 'catalog', label: '模型目录' },
  { children: <ModelUsage />, key: 'usage', label: '调用看板' },
  { children: <ModelEvaluation />, key: 'evaluation', label: '模型评测' },
];

export default function AdminModelsPage() {
  const { styles } = useStyles();

  return (
    <PageContainer ghost pageHeaderRender={false}>
      <main className={styles.page}>
        <Tabs items={MODEL_TAB_ITEMS} />
      </main>
    </PageContainer>
  );
}
