import {
  DrawerForm,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { App } from 'antd';
import { createAccount } from '@/features/administration';
import { USER_FORM_PROFESSION_OPTIONS } from './constant';
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
        ...values,
        displayName: values.displayName.trim(),
        employeeNo: values.employeeNo.trim(),
        profession: values.profession?.trim() || undefined,
        reason: values.reason.trim(),
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
      title={<span id={titleId}>新增账号</span>}
      width={480}
    >
      <ProFormText
        fieldProps={{
          autoComplete: 'off',
          id: 'admin-user-create-employee-no',
          inputMode: 'numeric',
        }}
        formItemProps={{ htmlFor: 'admin-user-create-employee-no' }}
        label="员工编号"
        name="employeeNo"
        placeholder="请输入 8 位员工编号"
        rules={[
          { required: true, message: '请输入员工编号' },
          { pattern: /^\d{8}$/, message: '员工编号为 8 位数字' },
        ]}
      />
      <ProFormText
        fieldProps={{ id: 'admin-user-create-display-name' }}
        formItemProps={{ htmlFor: 'admin-user-create-display-name' }}
        label="姓名"
        name="displayName"
        placeholder="请输入姓名"
        rules={[
          { required: true, message: '请输入姓名' },
          { whitespace: true, message: '姓名不能为空' },
        ]}
      />
      <ProFormSelect
        fieldProps={{
          'aria-label': '专业分类',
          allowClear: true,
          id: 'admin-user-create-profession',
          virtual: false,
        }}
        formItemProps={{ htmlFor: 'admin-user-create-profession' }}
        label="专业分类"
        name="profession"
        options={USER_FORM_PROFESSION_OPTIONS.map((option) => ({ ...option }))}
        placeholder="可选"
      />
      <ProFormTextArea
        fieldProps={{ id: 'admin-user-create-reason', rows: 3 }}
        formItemProps={{ htmlFor: 'admin-user-create-reason' }}
        label="创建原因"
        name="reason"
        placeholder="说明创建该账号的原因"
        rules={[
          { required: true, message: '请输入创建原因' },
          { whitespace: true, message: '创建原因不能为空' },
        ]}
      />
    </DrawerForm>
  );
}
