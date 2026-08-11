import { ModalForm, ProFormTextArea } from '@ant-design/pro-components';
import { App, Typography } from 'antd';
import { formatGovernanceError } from '@/features/administration';
import type { GrantRow, RevokeGrantFormValues } from './type';

interface RevokeGrantModalProps {
  grant: GrantRow;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  open: boolean;
}

export function RevokeGrantModal({
  grant,
  onClose,
  onConfirm,
  open,
}: RevokeGrantModalProps) {
  const { message } = App.useApp();

  const submit = async ({ reason }: RevokeGrantFormValues) => {
    try {
      await onConfirm(reason.trim());
      onClose();
      message.success('Grant 已撤销');
      return true;
    } catch (error) {
      message.error(formatGovernanceError(error, 'Grant 撤销失败'));
      return false;
    }
  };

  return (
    <ModalForm<RevokeGrantFormValues>
      key={grant.id}
      modalProps={{ destroyOnHidden: true, onCancel: onClose }}
      onFinish={submit}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
      open={open}
      submitter={{
        searchConfig: { resetText: '取消', submitText: '确认撤销' },
        submitButtonProps: { danger: true },
      }}
      title="撤销 Grant"
      width={520}
    >
      <Typography.Paragraph type="secondary">
        {grant.principal.employeeNo} · {grant.principal.displayName} ·{' '}
        {grant.capability} · {grant.scope.label}
      </Typography.Paragraph>
      <ProFormTextArea
        fieldProps={{ id: 'admin-grant-revoke-reason', rows: 3 }}
        formItemProps={{ htmlFor: 'admin-grant-revoke-reason' }}
        label="撤销原因"
        name="reason"
        placeholder="说明撤销该 Grant 的原因"
        rules={[
          { required: true, message: '请输入撤销原因' },
          { whitespace: true, message: '撤销原因不能为空' },
        ]}
      />
    </ModalForm>
  );
}
