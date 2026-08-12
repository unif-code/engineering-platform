import {
  ModalForm,
  ProFormSelect,
  ProFormText,
} from '@ant-design/pro-components';
import { useStaticPrototypeAction } from '@/hooks/useStaticPrototypeAction';
import { INITIAL_CAPABILITY_OPTIONS } from './constant';
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
      title="新建角色"
      width={480}
    >
      <ProFormText
        fieldProps={{ id: 'admin-role-create-name' }}
        formItemProps={{ htmlFor: 'admin-role-create-name' }}
        label="角色名称"
        name="name"
        placeholder="如：测试工程师"
        rules={[{ required: true, message: '请输入角色名称' }]}
      />
      <ProFormText
        fieldProps={{ id: 'admin-role-create-description' }}
        formItemProps={{ htmlFor: 'admin-role-create-description' }}
        label="描述"
        name="description"
        placeholder="选填"
      />
      <ProFormSelect
        fieldProps={{
          id: 'admin-role-create-capability',
          options: [...INITIAL_CAPABILITY_OPTIONS],
          virtual: false,
        }}
        formItemProps={{ htmlFor: 'admin-role-create-capability' }}
        label="初始能力"
        name="initialCapability"
        rules={[{ required: true, message: '请选择初始能力' }]}
      />
    </ModalForm>
  );
}
