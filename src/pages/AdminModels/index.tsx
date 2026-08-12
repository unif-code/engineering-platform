import { PageContainer } from '@ant-design/pro-components';
import { Tabs } from 'antd';
import { useStyles } from './index.style';
import { ModelCatalog } from './ModelCatalog';
import { ModelEvaluationPanel } from './ModelEvaluationPanel';
import { ModelUsagePanel } from './ModelUsagePanel';

const MODEL_TAB_ITEMS = [
  { children: <ModelCatalog />, key: 'catalog', label: '模型目录' },
  { children: <ModelUsagePanel />, key: 'usage', label: '调用看板' },
  {
    children: <ModelEvaluationPanel />,
    key: 'evaluation',
    label: '模型评测',
  },
];

export default function AdminModelsPage() {
  const { styles } = useStyles();

  return (
    <PageContainer ghost pageHeaderRender={false}>
      <div className={styles.page}>
        <Tabs items={MODEL_TAB_ITEMS} />
      </div>
    </PageContainer>
  );
}
