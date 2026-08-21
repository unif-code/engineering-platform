import {
  ModalForm,
  ProFormSelect,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { App, Typography } from 'antd';
import {
  formatGovernanceError,
  type OrganizationNode,
} from '@/features/administration';
import type { SuperiorFormValues, SuperiorTarget } from './type';

interface SuperiorModalProps {
  account: OrganizationNode;
  onClose: () => void;
  onConfirm: (values: SuperiorFormValues) => Promise<void>;
  open: boolean;
  targets: SuperiorTarget[];
}

export function SuperiorModal({
  account,
  onClose,
  onConfirm,
  open,
  targets,
}: SuperiorModalProps) {
  const { message } = App.useApp();

  const submit = async (values: SuperiorFormValues) => {
    try {
      await onConfirm({
        reason: values.reason.trim(),
        superiorId: values.superiorId,
      });
      return true;
    } catch (error) {
      message.error(formatGovernanceError(error, '组织归属调整失败'));
      return false;
    }
  };

  return (
    <ModalForm<SuperiorFormValues>
      key={account.id}
      modalProps={{ destroyOnHidden: true, onCancel: onClose }}
      onFinish={submit}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
      open={open}
      submitter={{
        searchConfig: { resetText: '取消', submitText: '确认调整' },
      }}
      title={`调整${account.displayName}归属`}
      width={520}
    >
      <Typography.Paragraph type="secondary">
        当前账号：{account.employeeNo} · {account.displayName}
      </Typography.Paragraph>
      <ProFormSelect
        fieldProps={{
          'aria-label': '新上级',
          id: `admin-organization-${account.id}-superior`,
          virtual: false,
        }}
        formItemProps={{
          htmlFor: `admin-organization-${account.id}-superior`,
        }}
        label="新上级"
        name="superiorId"
        options={targets}
        placeholder="请选择合法上级"
        rules={[{ required: true, message: '请选择新上级' }]}
      />
      <ProFormTextArea
        fieldProps={{
          id: `admin-organization-${account.id}-reason`,
          rows: 3,
        }}
        formItemProps={{
          htmlFor: `admin-organization-${account.id}-reason`,
        }}
        label="调整原因"
        name="reason"
        placeholder="说明本次组织归属调整的原因"
        rules={[
          { required: true, message: '请输入调整原因' },
          { whitespace: true, message: '调整原因不能为空' },
        ]}
      />
    </ModalForm>
  );
}
