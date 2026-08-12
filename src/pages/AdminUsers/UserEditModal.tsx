import {
  ModalForm,
  ProFormSelect,
  ProFormText,
} from '@ant-design/pro-components';
import { USER_ROLE_OPTIONS, USER_TEAM_OPTIONS } from './constant';
import type { UserEditFormValues, UserRow } from './type';

interface UserEditModalProps {
  account: UserRow;
  onClose: () => void;
  onSubmit: () => void;
  open: boolean;
}

export function UserEditModal({
  account,
  onClose,
  onSubmit,
  open,
}: UserEditModalProps) {
  const inputIdPrefix = `admin-user-edit-${account.id}`;

  return (
    <ModalForm<UserEditFormValues>
      initialValues={{
        displayName: account.displayName,
        role: account.roles?.[0],
        status: account.status === 'ENABLED' ? 'ENABLED' : 'DISABLED',
        team: account.team,
      }}
      key={account.id}
      modalProps={{ destroyOnHidden: true, onCancel: onClose }}
      onFinish={async () => {
        onSubmit();
        onClose();
        return true;
      }}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
      open={open}
      submitter={{ searchConfig: { resetText: '取消', submitText: '保存' } }}
      title="编辑用户"
      width={560}
    >
      <ProFormText
        fieldProps={{ id: `${inputIdPrefix}-name` }}
        formItemProps={{ htmlFor: `${inputIdPrefix}-name` }}
        label="姓名"
        name="displayName"
        rules={[{ required: true, message: '请输入姓名' }]}
      />
      <ProFormSelect
        fieldProps={{
          'aria-label': '所属 Team',
          id: `${inputIdPrefix}-team`,
          virtual: false,
        }}
        formItemProps={{ htmlFor: `${inputIdPrefix}-team` }}
        label="所属 Team"
        name="team"
        options={USER_TEAM_OPTIONS}
        rules={[{ required: true, message: '请选择所属 Team' }]}
      />
      <ProFormSelect
        fieldProps={{
          'aria-label': '角色',
          id: `${inputIdPrefix}-role`,
          virtual: false,
        }}
        formItemProps={{ htmlFor: `${inputIdPrefix}-role` }}
        label="角色"
        name="role"
        options={USER_ROLE_OPTIONS}
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
        options={[
          { label: '正常', value: 'ENABLED' },
          { label: '已禁用', value: 'DISABLED' },
        ]}
        rules={[{ required: true, message: '请选择状态' }]}
      />
    </ModalForm>
  );
}
