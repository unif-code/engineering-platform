import { RouteContext } from '@ant-design/pro-components';
import { Typography } from 'antd';
import { useContext } from 'react';

export function HeaderTitle() {
  const { pageTitleInfo } = useContext(RouteContext);

  return (
    <Typography.Text strong>
      {pageTitleInfo?.pageName || '内部研发平台'}
    </Typography.Text>
  );
}
