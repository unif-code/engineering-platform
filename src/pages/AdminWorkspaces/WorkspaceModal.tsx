import {
  ModalForm,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { useStaticPrototypeAction } from '@/hooks/useStaticPrototypeAction';
import { DEFAULT_TEAM_OPTIONS } from './constant';
import type { WorkspaceFormValues } from './type';

interface WorkspaceModalProps {
  open: boolean;
  onClose: () => void;
}

export function WorkspaceModal({ open, onClose }: WorkspaceModalProps) {
  const showStaticAction = useStaticPrototypeAction();

  const submit = async (_values: WorkspaceFormValues) => {
    showStaticAction('创建工作区');
    onClose();
    return true;
  };

  return (
    <ModalForm<WorkspaceFormValues>
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
        searchConfig: { resetText: '取消', submitText: '创建' },
      }}
      title="创建工作区"
      width={560}
    >
      <ProFormText
        label="名称"
        name="name"
        placeholder="请输入工作区名称"
        rules={[{ required: true, message: '请输入名称' }]}
      />
      <ProFormText
        label="Owner"
        name="owner"
        placeholder="请输入工作区 Owner"
        rules={[{ required: true, message: '请输入 Owner' }]}
      />
      <ProFormSelect
        fieldProps={{
          'aria-label': '默认 Team',
          id: 'workspace-default-team',
          virtual: false,
        }}
        label="默认 Team"
        name="defaultTeam"
        options={DEFAULT_TEAM_OPTIONS.map((option) => ({ ...option }))}
        placeholder="请选择默认 Team"
        rules={[{ required: true, message: '请选择默认 Team' }]}
      />
      <ProFormTextArea
        fieldProps={{ rows: 4 }}
        label="说明"
        name="description"
        placeholder="描述工作区职责、范围与协作约束"
        rules={[{ required: true, message: '请输入说明' }]}
      />
    </ModalForm>
  );
}
