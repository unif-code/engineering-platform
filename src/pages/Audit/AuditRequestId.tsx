import { CopyOutlined } from '@ant-design/icons';
import { App, Button, Space, Typography } from 'antd';

interface AuditRequestIdProps {
  requestId: string;
}

export function AuditRequestId({ requestId }: AuditRequestIdProps) {
  const { message } = App.useApp();

  const copyRequestId = async () => {
    if (navigator.clipboard === undefined) {
      message.error('当前浏览器不支持复制 Request ID');
      return;
    }
    try {
      await navigator.clipboard.writeText(requestId);
      message.success('Request ID 已复制');
    } catch {
      message.error('Request ID 复制失败');
    }
  };

  return (
    <Space size="small">
      <Typography.Text code>{requestId}</Typography.Text>
      <Button
        aria-label="复制 Request ID"
        icon={<CopyOutlined />}
        onClick={() => void copyRequestId()}
        size="small"
        type="text"
      />
    </Space>
  );
}
