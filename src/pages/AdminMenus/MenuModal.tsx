import {
  ModalForm,
  ProFormSelect,
  ProFormText,
} from '@ant-design/pro-components';
import { useStaticPrototypeAction } from '@/hooks/useStaticPrototypeAction';
import { MENU_CAPABILITY_OPTIONS, MENU_FORM_GROUP_OPTIONS } from './constant';
import type { MenuFormValues, MenuRow } from './type';

interface MenuModalProps {
  open: boolean;
  menu?: MenuRow;
  onClose: () => void;
}

export function MenuModal({ open, menu, onClose }: MenuModalProps) {
  const showStaticAction = useStaticPrototypeAction();
  const inputIdPrefix = menu
    ? `admin-menu-edit-${menu.key}`
    : 'admin-menu-create';
  const initialValues = menu
    ? { ...menu }
    : {
        capability: '任意登录用户',
        group: 'user',
      };

  const submit = async (_values: MenuFormValues) => {
    showStaticAction(menu ? `编辑菜单 ${menu.key}` : '新增菜单');
    onClose();
    return true;
  };

  return (
    <ModalForm<MenuFormValues>
      initialValues={initialValues}
      key={menu?.key ?? 'create'}
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
          submitText: menu ? '保存' : '新增',
        },
      }}
      title={menu ? '编辑菜单' : '新增菜单'}
      width={560}
    >
      <ProFormText
        fieldProps={{ id: `${inputIdPrefix}-name` }}
        formItemProps={{ htmlFor: `${inputIdPrefix}-name` }}
        label="菜单名称"
        name="name"
        placeholder="请输入菜单名称"
        rules={[{ required: true, message: '请输入菜单名称' }]}
      />
      <ProFormSelect
        fieldProps={{
          'aria-label': '分组',
          id: `${inputIdPrefix}-group`,
          virtual: false,
        }}
        formItemProps={{ htmlFor: `${inputIdPrefix}-group` }}
        label="分组"
        name="group"
        options={MENU_FORM_GROUP_OPTIONS.map((option) => ({ ...option }))}
        rules={[{ required: true, message: '请选择分组' }]}
      />
      <ProFormSelect
        fieldProps={{
          'aria-label': '绑定能力',
          id: `${inputIdPrefix}-capability`,
          virtual: false,
        }}
        formItemProps={{ htmlFor: `${inputIdPrefix}-capability` }}
        label="绑定能力"
        name="capability"
        options={MENU_CAPABILITY_OPTIONS.map((option) => ({ ...option }))}
        rules={[{ required: true, message: '请选择绑定能力' }]}
      />
      {menu ? null : (
        <ProFormText
          fieldProps={{ id: `${inputIdPrefix}-path` }}
          formItemProps={{ htmlFor: `${inputIdPrefix}-path` }}
          label="路由"
          name="path"
          placeholder="/calendar"
          rules={[
            { required: true, message: '请输入路由' },
            { pattern: /^\//, message: '路由必须以 / 开头' },
          ]}
        />
      )}
    </ModalForm>
  );
}
