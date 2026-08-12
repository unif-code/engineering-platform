import {
  ModalForm,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import {
  ORGANIZATION_LEAD_OPTIONS,
  ORGANIZATION_PARENT_OPTIONS,
} from './constant';
import type { DepartmentFormValues } from './type';

interface DepartmentModalProps {
  onClose: () => void;
  onSubmit: (values: DepartmentFormValues) => Promise<void>;
  open: boolean;
}

export function DepartmentModal({
  onClose,
  onSubmit,
  open,
}: DepartmentModalProps) {
  return (
    <ModalForm<DepartmentFormValues>
      modalProps={{ destroyOnHidden: true, onCancel: onClose }}
      onFinish={async (values) => {
        await onSubmit(values);
        return true;
      }}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
      open={open}
      submitter={{
        searchConfig: { resetText: '取消', submitText: '确认创建' },
      }}
      title="新建部门"
      width={560}
    >
      <ProFormText
        fieldProps={{ id: 'admin-organization-department-name' }}
        formItemProps={{ htmlFor: 'admin-organization-department-name' }}
        label="部门名称"
        name="name"
        placeholder="如：国际化技术部"
        rules={[{ required: true, message: '请输入部门名称' }]}
      />
      <ProFormSelect
        fieldProps={{
          'aria-label': '负责人',
          id: 'admin-organization-department-lead',
          virtual: false,
        }}
        formItemProps={{ htmlFor: 'admin-organization-department-lead' }}
        label="负责人"
        name="leadId"
        options={ORGANIZATION_LEAD_OPTIONS.map((option) => ({ ...option }))}
        rules={[{ required: true, message: '请选择负责人' }]}
      />
      <ProFormSelect
        fieldProps={{
          'aria-label': '上级部门',
          id: 'admin-organization-parent-department',
          virtual: false,
        }}
        formItemProps={{ htmlFor: 'admin-organization-parent-department' }}
        initialValue="root"
        label="上级部门"
        name="parentKey"
        options={ORGANIZATION_PARENT_OPTIONS.map((option) => ({ ...option }))}
        rules={[{ required: true, message: '请选择上级部门' }]}
      />
      <ProFormTextArea
        fieldProps={{ id: 'admin-organization-department-subgroups', rows: 3 }}
        formItemProps={{ htmlFor: 'admin-organization-department-subgroups' }}
        label="子团队"
        name="subgroups"
        placeholder="逗号分隔，如：国际化前端, 多语言中台"
      />
    </ModalForm>
  );
}
