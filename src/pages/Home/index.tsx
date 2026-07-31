import { PageContainer } from '@ant-design/pro-components';
import { useModel } from '@umijs/max';
import Guide from '@/components/Guide';
import QueryDemo from '@/components/QueryDemo';
import { trim } from '@/utils/format';

const HomePage: React.FC = () => {
  const { name } = useModel('global');
  return (
    <PageContainer ghost>
      {/* Tailwind: 布局/间距原子类 */}
      <div className="pt-20">
        <Guide name={trim(name)} />
        <QueryDemo />
      </div>
    </PageContainer>
  );
};

export default HomePage;
