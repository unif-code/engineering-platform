import { CopyOutlined } from '@ant-design/icons';
import { Alert, App, Button, Modal, Space, Typography } from 'antd';
import { useStyles } from './index.style';
import type { CredentialReceipt } from './type';

interface CredentialModalProps {
  kind: 'create' | 'reset';
  open: boolean;
  receipt: CredentialReceipt;
  onClose: () => void;
}

export function CredentialModal({
  kind,
  open,
  receipt,
  onClose,
}: CredentialModalProps) {
  const { message } = App.useApp();
  const { styles } = useStyles();
  const title = kind === 'create' ? '账号创建成功' : '密码重置成功';

  const copyPassword = async () => {
    try {
      if (navigator.clipboard === undefined) {
        throw new Error('Clipboard API unavailable');
      }
      await navigator.clipboard.writeText(receipt.temporaryPassword);
      message.success('已复制临时密码');
    } catch {
      message.error('复制失败，请手动复制临时密码');
    }
  };

  return (
    <Modal
      cancelButtonProps={{ hidden: true }}
      destroyOnHidden
      mask={{ closable: false }}
      okText="我已安全记录"
      onCancel={onClose}
      onOk={onClose}
      open={open}
      title={title}
    >
      <Space className={styles.credential} orientation="vertical" size="middle">
        <Alert
          description="关闭后平台不会再次展示该密码。"
          showIcon
          title="仅此一次，请立即传达"
          type="warning"
        />
        <Typography.Text type="secondary">
          {receipt.account.employeeNo} · {receipt.account.displayName}
        </Typography.Text>
        <Typography.Text className={styles.credentialSecret} code>
          {receipt.temporaryPassword}
        </Typography.Text>
        <Button
          aria-label="复制临时密码"
          icon={<CopyOutlined />}
          onClick={() => void copyPassword()}
        >
          复制临时密码
        </Button>
      </Space>
    </Modal>
  );
}
