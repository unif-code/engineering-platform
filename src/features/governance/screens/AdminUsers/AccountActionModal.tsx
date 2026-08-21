import { ModalForm, ProFormTextArea } from '@ant-design/pro-components';
import { App, Typography } from 'antd';
import { USER_ACTION_META } from './constant';
import type { UserAction, UserActionFormValues, UserRow } from './type';
import { formatAccountError } from './util';

interface AccountActionModalProps {
  action: UserAction;
  account: UserRow;
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}

export function AccountActionModal({
  action,
  account,
  open,
  onClose,
  onConfirm,
}: AccountActionModalProps) {
  const { message } = App.useApp();
  const actionMeta = USER_ACTION_META[action];

  const submit = async ({ reason }: UserActionFormValues) => {
    try {
      await onConfirm(reason.trim());
      return true;
    } catch (error) {
      message.error(formatAccountError(error, `${actionMeta.title}失败`));
      return false;
    }
  };

  return (
    <ModalForm<UserActionFormValues>
      key={`${action}-${account.id}`}
      modalProps={{
        destroyOnHidden: true,
        onCancel: onClose,
      }}
      onFinish={submit}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
      open={open}
      submitter={{
        searchConfig: {
          resetText: '取消',
          submitText: actionMeta.confirmText,
        },
      }}
      title={actionMeta.title}
      width={520}
    >
      <Typography.Paragraph type="secondary">
        账号：{account.employeeNo} · {account.displayName}
      </Typography.Paragraph>
      <ProFormTextArea
        fieldProps={{ id: `admin-account-${action}-reason`, rows: 3 }}
        formItemProps={{ htmlFor: `admin-account-${action}-reason` }}
        label="操作原因"
        name="reason"
        placeholder="请输入本次治理动作的原因"
        rules={[
          { required: true, message: '请输入操作原因' },
          { whitespace: true, message: '操作原因不能为空' },
        ]}
      />
    </ModalForm>
  );
}
