import { RouteContext } from '@ant-design/pro-components';
import { Typography } from 'antd';
import { useContext } from 'react';
import { PLATFORM_NAME } from '@/constants/brand';

export function HeaderTitle() {
  const { pageTitleInfo } = useContext(RouteContext);

  return (
    <Typography.Text strong>
      {pageTitleInfo?.pageName || PLATFORM_NAME}
    </Typography.Text>
  );
}
