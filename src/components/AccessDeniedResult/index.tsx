import { Button, Result } from 'antd';
import { APP_PATHS } from '@/constants/route';

interface AccessDeniedResultProps {
  requestId?: string;
}

export function AccessDeniedResult({ requestId }: AccessDeniedResultProps) {
  return (
    <Result
      status="403"
      title="无权访问"
      subTitle={
        <>
          <div>当前账号没有访问此页面的能力，请联系管理员。</div>
          {requestId ? <div>requestId: {requestId}</div> : null}
        </>
      }
      extra={
        <Button href={APP_PATHS.home} type="primary">
          返回工作台
        </Button>
      }
    />
  );
}
