import {
  ModalForm,
  ProFormSelect,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { App, Typography } from 'antd';
import {
  formatGovernanceError,
  type WorkspaceAccountRef,
} from '@/features/administration';
import { WORKSPACE_ACTION_META } from './constant';
import type {
  WorkspaceAction,
  WorkspaceActionFormValues,
  WorkspaceRow,
} from './type';

interface WorkspaceActionModalProps {
  action: WorkspaceAction;
  candidates: readonly WorkspaceAccountRef[];
  leader?: WorkspaceAccountRef;
  onClose: () => void;
  onConfirm: (values: WorkspaceActionFormValues) => Promise<void>;
  open: boolean;
  workspace: WorkspaceRow;
}

export function WorkspaceActionModal({
  action,
  candidates,
  leader,
  onClose,
  onConfirm,
  open,
  workspace,
}: WorkspaceActionModalProps) {
  const { message } = App.useApp();
  const meta = WORKSPACE_ACTION_META[action];
  const accountLabel = action === 'transfer' ? '新 Owner' : 'Leader';

  const submit = async (values: WorkspaceActionFormValues) => {
    try {
      await onConfirm({
        ...values,
        accountId: leader?.id ?? values.accountId,
        reason: values.reason.trim(),
      });
      message.success(meta.successText);
      return true;
    } catch (error) {
      message.error(formatGovernanceError(error, `${meta.title}失败`));
      return false;
    }
  };

  return (
    <ModalForm<WorkspaceActionFormValues>
      key={`${workspace.id}-${action}-${leader?.id ?? 'choose'}`}
      modalProps={{ destroyOnHidden: true, onCancel: onClose }}
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
          submitText: meta.confirmText,
        },
      }}
      title={meta.title}
      width={520}
    >
      <Typography.Paragraph type="secondary">
        工作区：{workspace.name}
        {leader ? ` · ${leader.displayName}` : ''}
      </Typography.Paragraph>
      {action === 'remove' ? null : (
        <ProFormSelect
          fieldProps={{
            'aria-label': accountLabel,
            id: `admin-workspace-${action}-account`,
            virtual: false,
          }}
          formItemProps={{ htmlFor: `admin-workspace-${action}-account` }}
          label={accountLabel}
          name="accountId"
          options={candidates.map(({ displayName, id }) => ({
            label: displayName,
            value: id,
          }))}
          placeholder={`请选择${accountLabel}`}
          rules={[{ required: true, message: `请选择${accountLabel}` }]}
        />
      )}
      <ProFormTextArea
        fieldProps={{
          id: `admin-workspace-${action}-reason`,
          rows: 3,
        }}
        formItemProps={{ htmlFor: `admin-workspace-${action}-reason` }}
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
