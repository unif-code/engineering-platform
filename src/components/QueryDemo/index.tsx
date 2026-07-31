import { useQuery } from '@umijs/max';
import { Spin, Typography } from 'antd';
import styles from './index.module.css';

// 示例：React Query 管理服务端状态（缓存/去重/重试开箱即用）；样式用 CSS Modules 隔离
const QueryDemo: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['demo-now'],
    queryFn: async () => {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return new Date().toLocaleString();
    },
    staleTime: 60_000,
  });

  return (
    <div className={styles.card}>
      <Typography.Text>
        React Query 示例（首次加载后命中缓存）：
      </Typography.Text>{' '}
      {isLoading ? (
        <Spin size="small" />
      ) : (
        <Typography.Text strong>{data}</Typography.Text>
      )}
    </div>
  );
};

export default QueryDemo;
