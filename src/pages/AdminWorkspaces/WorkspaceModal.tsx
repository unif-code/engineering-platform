import {
  ModalForm,
  ProFormSelect,
  ProFormText,
} from '@ant-design/pro-components';
import { App } from 'antd';
import {
  formatGovernanceError,
  type WorkspaceAccountRef,
  type WorkspaceSummary,
} from '@/features/administration';
import type { WorkspaceFormValues } from './type';

interface WorkspaceModalProps {
  leaderOptions: readonly WorkspaceAccountRef[];
  onClose: () => void;
  onCreated: (workspace: WorkspaceSummary) => void;
  onSubmit: (values: {
    name: string;
    ownerId: string;
    reason: string;
  }) => Promise<WorkspaceSummary>;
  open: boolean;
}

export function WorkspaceModal({
  leaderOptions,
  onClose,
  onCreated,
  onSubmit,
  open,
}: WorkspaceModalProps) {
  const { message } = App.useApp();

  const submit = async (values: WorkspaceFormValues) => {
    try {
      const workspace = await onSubmit({
        name: values.name.trim(),
        ownerId: values.ownerId,
        reason: '通过工作区管理创建工作区',
      });
      onCreated(workspace);
      onClose();
      message.success('工作区已创建');
      return true;
    } catch (error) {
      message.error(formatGovernanceError(error, '工作区创建失败'));
      return false;
    }
  };

  return (
    <ModalForm<WorkspaceFormValues>
      modalProps={{ destroyOnHidden: true, onCancel: onClose }}
      onFinish={submit}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
      open={open}
      submitter={{
        searchConfig: { resetText: '取消', submitText: '创建' },
      }}
      title="创建工作区"
      width={560}
    >
      <ProFormText
        fieldProps={{ id: 'admin-workspace-create-name' }}
        formItemProps={{ htmlFor: 'admin-workspace-create-name' }}
        label="工作区名称"
        name="name"
        placeholder="如：国际化工作区"
        rules={[
          { required: true, message: '请输入工作区名称' },
          { whitespace: true, message: '工作区名称不能为空' },
        ]}
      />
      <ProFormSelect
        fieldProps={{
          'aria-label': 'Owner（开发Leader）',
          id: 'admin-workspace-create-owner',
          virtual: false,
        }}
        formItemProps={{ htmlFor: 'admin-workspace-create-owner' }}
        label="Owner（开发Leader）"
        name="ownerId"
        options={leaderOptions.map(({ displayName, id }) => ({
          label: displayName,
          value: id,
        }))}
        placeholder="请选择 Leader 作为 Owner"
        rules={[{ required: true, message: '请选择 Owner' }]}
      />
    </ModalForm>
  );
}
