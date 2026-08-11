import { Alert, Button, Form, Input, Modal, Space } from 'antd';
import { useMemo, useState } from 'react';
import type { PublishPolicyFormValues } from './type';

interface PublishPolicyModalProps {
  error: string | undefined;
  loading: boolean;
  onClose: () => void;
  onSubmit: (values: PublishPolicyFormValues) => Promise<void>;
  open: boolean;
}

export function PublishPolicyModal({
  error,
  loading,
  onClose,
  onSubmit,
  open,
}: PublishPolicyModalProps) {
  const [reason, setReason] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const submitDisabled = useMemo(
    () => reason.trim().length === 0 || !/^\d{6}$/.test(totpCode),
    [reason, totpCode],
  );

  return (
    <Modal
      destroyOnHidden
      footer={
        <Space>
          <Button disabled={loading} onClick={onClose}>
            取消
          </Button>
          <Button
            disabled={submitDisabled}
            loading={loading}
            onClick={() => onSubmit({ reason: reason.trim(), totpCode })}
            type="primary"
          >
            确认发布
          </Button>
        </Space>
      }
      mask={{ closable: false }}
      onCancel={onClose}
      open={open}
      title="发布 Policy"
    >
      <Form layout="vertical">
        {error ? <Alert showIcon title={error} type="error" /> : null}
        <Form.Item label="发布原因" required>
          <Input.TextArea
            aria-label="发布原因"
            id="policy-publish-reason"
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            value={reason}
          />
        </Form.Item>
        <Form.Item label="TOTP 验证码" required>
          <Input
            aria-label="TOTP 验证码"
            autoComplete="one-time-code"
            id="policy-publish-totp"
            inputMode="numeric"
            maxLength={6}
            onChange={(event) =>
              setTotpCode(event.target.value.replace(/\D/g, '').slice(0, 6))
            }
            value={totpCode}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
