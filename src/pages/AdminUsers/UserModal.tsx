import { DrawerForm, ProFormText } from '@ant-design/pro-components';
import { Alert, App } from 'antd';
import { createAccount } from '@/features/administration';
import type { CredentialReceipt, UserFormValues } from './type';
import { formatAccountError } from './util';

interface UserModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (receipt: CredentialReceipt) => void;
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
      onCreated(receipt);
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
      <Alert
        description="Team、角色与直属上级需要组织与授权契约支持"
        showIcon
        title="当前版本暂未接入"
        type="info"
      />
      <ProFormText
        disabled
        fieldProps={{
          'aria-label': '所属 Team',
          id: 'admin-user-create-team',
        }}
        formItemProps={{ htmlFor: 'admin-user-create-team' }}
        label="所属 Team"
        placeholder="当前版本暂未接入"
      />
      <ProFormText
        disabled
        fieldProps={{
          'aria-label': '角色',
          id: 'admin-user-create-role',
        }}
        formItemProps={{ htmlFor: 'admin-user-create-role' }}
        label="角色"
        placeholder="当前版本暂未接入"
      />
      <ProFormText
        disabled
        fieldProps={{
          'aria-label': '直属上级',
          id: 'admin-user-create-superior',
        }}
        formItemProps={{ htmlFor: 'admin-user-create-superior' }}
        label="直属上级"
        placeholder="当前版本暂未接入"
      />
    </DrawerForm>
  );
}
