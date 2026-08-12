import {
  DrawerForm,
  ProFormSelect,
  ProFormText,
} from '@ant-design/pro-components';
import { App } from 'antd';
import { createAccount } from '@/features/administration';
import {
  USER_CREATE_ROLE_OPTIONS,
  USER_SUPERIOR_OPTIONS,
  USER_TEAM_OPTIONS,
} from './constant';
import type { CredentialReceipt, UserFormValues } from './type';
import { formatAccountError } from './util';

interface UserModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (receipt: CredentialReceipt, values: UserFormValues) => void;
}

export function UserModal({ open, onClose, onCreated }: UserModalProps) {
  const { message } = App.useApp();
  const titleId = 'admin-account-create-title';

  const submit = async (values: UserFormValues) => {
    try {
      const receipt = await createAccount({
        displayName: values.displayName.trim(),
        employeeNo: values.employeeNo.trim().toUpperCase(),
        reason: '通过用户管理新增用户',
      });
      onClose();
      onCreated(receipt, values);
      return true;
    } catch (error) {
      message.error(formatAccountError(error, '账号创建失败'));
      return false;
    }
  };

  return (
    <DrawerForm<UserFormValues>
      drawerProps={{
        'aria-labelledby': titleId,
        destroyOnHidden: true,
        onClose,
      }}
      key="create-account"
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
      title={<span id={titleId}>新增用户</span>}
      width={480}
    >
      <ProFormText
        fieldProps={{ id: 'admin-user-create-display-name' }}
        formItemProps={{ htmlFor: 'admin-user-create-display-name' }}
        label="姓名"
        name="displayName"
        placeholder="如：林一"
        rules={[
          { required: true, message: '请输入姓名' },
          { whitespace: true, message: '姓名不能为空' },
        ]}
      />
      <ProFormText
        fieldProps={{
          autoComplete: 'off',
          id: 'admin-user-create-employee-no',
          inputMode: 'numeric',
        }}
        formItemProps={{ htmlFor: 'admin-user-create-employee-no' }}
        label="工号"
        name="employeeNo"
        placeholder="E1xxx"
        rules={[
          { required: true, message: '请输入工号' },
          {
            pattern: /^(?:E\d{4}|\d{8})$/i,
            message: '员工编号须为 E 加 4 位数字或 8 位数字',
          },
        ]}
      />
      <ProFormSelect
        fieldProps={{
          'aria-label': '所属 Team',
          id: 'admin-user-create-team',
          virtual: false,
        }}
        formItemProps={{ htmlFor: 'admin-user-create-team' }}
        label="所属 Team"
        name="team"
        options={USER_TEAM_OPTIONS}
        rules={[{ required: true, message: '请选择所属 Team' }]}
      />
      <ProFormSelect
        fieldProps={{
          'aria-label': '角色',
          id: 'admin-user-create-role',
          virtual: false,
        }}
        formItemProps={{ htmlFor: 'admin-user-create-role' }}
        label="角色"
        name="role"
        options={USER_CREATE_ROLE_OPTIONS}
        rules={[{ required: true, message: '请选择角色' }]}
      />
      <ProFormSelect
        fieldProps={{
          'aria-label': '直属上级',
          id: 'admin-user-create-superior',
          virtual: false,
        }}
        formItemProps={{ htmlFor: 'admin-user-create-superior' }}
        label="直属上级"
        name="superior"
        options={USER_SUPERIOR_OPTIONS}
        rules={[{ required: true, message: '请选择直属上级' }]}
      />
    </DrawerForm>
  );
}
