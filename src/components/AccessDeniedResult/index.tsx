import { Button, Result } from 'antd';

export function AccessDeniedResult() {
  return (
    <Result
      status="403"
      title="无权访问"
      subTitle="当前账号没有访问此页面的能力，请联系管理员。"
      extra={
        <Button href="/home" type="primary">
          返回工作台
        </Button>
      }
    />
  );
}
