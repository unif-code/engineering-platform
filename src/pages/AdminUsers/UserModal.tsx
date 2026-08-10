import {
  ModalForm,
  ProFormSelect,
  ProFormText,
} from '@ant-design/pro-components';
import { useStaticPrototypeAction } from '@/hooks/useStaticPrototypeAction';
import { USER_FORM_ROLE_OPTIONS, USER_FORM_STATUS_OPTIONS } from './constant';
import type { UserFormValues, UserRow } from './type';

interface UserModalProps {
  open: boolean;
  user?: UserRow;
  onClose: () => void;
}

export function UserModal({ open, user, onClose }: UserModalProps) {
  const showStaticAction = useStaticPrototypeAction();
  const inputIdPrefix = user
    ? `admin-user-edit-${user.employeeId}`
    : 'admin-user-create';
  const initialValues: UserFormValues | undefined = user
    ? {
        employeeId: user.employeeId,
        name: user.name,
        email: user.email,
        roles: [...user.roles],
        status: user.status,
      }
    : undefined;

  const submit = async (_values: UserFormValues) => {
    showStaticAction(user ? `编辑用户 ${user.employeeId}` : '新增用户');
    onClose();
    return true;
  };

  return (
    <ModalForm<UserFormValues>
      initialValues={initialValues}
      key={user?.employeeId ?? 'create'}
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
          submitText: user ? '保存' : '新增',
        },
      }}
      title={user ? '编辑用户' : '新增用户'}
      width={560}
    >
      <ProFormText
        fieldProps={{ id: `${inputIdPrefix}-employee-id` }}
        formItemProps={{ htmlFor: `${inputIdPrefix}-employee-id` }}
        label="员工编号"
        name="employeeId"
        placeholder="请输入 8 位员工编号"
        rules={[
          { required: true, message: '请输入员工编号' },
          { pattern: /^\d{8}$/, message: '员工编号为 8 位数字' },
        ]}
      />
      <ProFormText
        fieldProps={{ id: `${inputIdPrefix}-name` }}
        formItemProps={{ htmlFor: `${inputIdPrefix}-name` }}
        label="姓名"
        name="name"
        placeholder="请输入姓名"
        rules={[{ required: true, message: '请输入姓名' }]}
      />
      <ProFormText
        fieldProps={{ id: `${inputIdPrefix}-email`, type: 'email' }}
        formItemProps={{ htmlFor: `${inputIdPrefix}-email` }}
        label="邮箱"
        name="email"
        placeholder="name@example.com"
        rules={[
          { required: true, message: '请输入邮箱' },
          { type: 'email', message: '请输入有效邮箱' },
        ]}
      />
      <ProFormSelect
        fieldProps={{
          'aria-label': '角色',
          id: `${inputIdPrefix}-roles`,
          mode: 'multiple',
          virtual: false,
        }}
        formItemProps={{ htmlFor: `${inputIdPrefix}-roles` }}
        label="角色"
        name="roles"
        options={USER_FORM_ROLE_OPTIONS.map((option) => ({ ...option }))}
        placeholder="请选择角色"
        rules={[{ required: true, message: '请选择角色' }]}
      />
      <ProFormSelect
        fieldProps={{
          'aria-label': '状态',
          id: `${inputIdPrefix}-status`,
          virtual: false,
        }}
        formItemProps={{ htmlFor: `${inputIdPrefix}-status` }}
        label="状态"
        name="status"
        options={USER_FORM_STATUS_OPTIONS.map((option) => ({ ...option }))}
        placeholder="请选择状态"
        rules={[{ required: true, message: '请选择状态' }]}
      />
    </ModalForm>
  );
}
