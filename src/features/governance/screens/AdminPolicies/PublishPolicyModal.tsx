import { Alert, Button, Form, Input, Modal, Space } from 'antd';
import { useMemo, useState } from 'react';
import type { PublishPolicyFormValues } from './type';

interface PublishPolicyModalProps {
  error: string | undefined;
  loading: boolean;
  mode?: 'publish' | 'rollback';
  onClose: () => void;
  onSubmit: (values: PublishPolicyFormValues) => Promise<void>;
  open: boolean;
}

export function PublishPolicyModal({
  error,
  loading,
  mode = 'publish',
  onClose,
  onSubmit,
  open,
}: PublishPolicyModalProps) {
  const [reason, setReason] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const confirmLabel = mode === 'publish' ? '确认发布' : '确认创建';
  const reasonLabel = mode === 'publish' ? '发布原因' : '回滚原因';
  const title = mode === 'publish' ? '发布 Policy' : '创建回滚 Draft';
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
            {confirmLabel}
          </Button>
        </Space>
      }
      mask={{ closable: false }}
      onCancel={onClose}
      open={open}
      title={title}
    >
      <Form layout="vertical">
        {error ? <Alert showIcon title={error} type="error" /> : null}
        <Form.Item label={reasonLabel} required>
          <Input.TextArea
            aria-label={reasonLabel}
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
