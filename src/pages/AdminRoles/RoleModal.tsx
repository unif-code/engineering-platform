import {
  ModalForm,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { useStaticPrototypeAction } from '@/hooks/useStaticPrototypeAction';
import type { RoleFormValues } from './type';

interface RoleModalProps {
  open: boolean;
  onClose: () => void;
}

export function RoleModal({ open, onClose }: RoleModalProps) {
  const showStaticAction = useStaticPrototypeAction();

  const submit = async (_values: RoleFormValues) => {
    showStaticAction('新建角色');
    onClose();
    return true;
  };

  return (
    <ModalForm<RoleFormValues>
      key="create"
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
          submitText: '创建',
        },
      }}
      title="新建 Role"
      width={560}
    >
      <ProFormText
        fieldProps={{ id: 'admin-role-create-name' }}
        formItemProps={{ htmlFor: 'admin-role-create-name' }}
        label="角色名称"
        name="name"
        placeholder="例如 Release Operator"
        rules={[{ required: true, message: '请输入角色名称' }]}
      />
      <ProFormTextArea
        fieldProps={{ id: 'admin-role-create-description', rows: 4 }}
        formItemProps={{ htmlFor: 'admin-role-create-description' }}
        label="角色说明"
        name="description"
        placeholder="描述 Role 的职责与适用边界"
        rules={[{ required: true, message: '请输入角色说明' }]}
      />
    </ModalForm>
  );
}
