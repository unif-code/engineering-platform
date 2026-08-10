import {
  ModalForm,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { useStaticPrototypeAction } from '@/hooks/useStaticPrototypeAction';
import { REPOSITORY_OPTIONS, WORKSPACE_OPTIONS } from './constant';
import type { CreateTaskInput } from './type';

interface CreateTaskModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreateTaskModal({ open, onClose }: CreateTaskModalProps) {
  const showStaticAction = useStaticPrototypeAction();

  const submit = async (_values: CreateTaskInput) => {
    showStaticAction('创建任务');
    onClose();
    return true;
  };

  return (
    <ModalForm<CreateTaskInput>
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
        searchConfig: { resetText: '取消', submitText: '创建任务' },
      }}
      title="创建任务"
      width={560}
    >
      <ProFormText
        label="标题"
        name="title"
        placeholder="请输入任务标题"
        rules={[{ required: true, message: '请输入标题' }]}
      />
      <ProFormSelect
        label="Workspace"
        name="workspace"
        options={WORKSPACE_OPTIONS.map((option) => ({ ...option }))}
        placeholder="请选择 Workspace"
        rules={[{ required: true, message: '请选择 Workspace' }]}
      />
      <ProFormSelect
        label="目标仓库"
        name="repository"
        options={REPOSITORY_OPTIONS.map((option) => ({ ...option }))}
        placeholder="请选择目标仓库"
        rules={[{ required: true, message: '请选择目标仓库' }]}
      />
      <ProFormTextArea
        fieldProps={{ rows: 4 }}
        label="说明"
        name="description"
        placeholder="描述背景、目标、范围与约束"
        rules={[{ required: true, message: '请输入说明' }]}
      />
    </ModalForm>
  );
}
