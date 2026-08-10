import {
  ModalForm,
  ProFormDigit,
  ProFormSelect,
  ProFormSwitch,
  ProFormText,
} from '@ant-design/pro-components';
import { useStaticPrototypeAction } from '@/hooks/useStaticPrototypeAction';
import { MENU_FORM_GROUP_OPTIONS, MENU_ROWS } from './constant';
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
        group: 'user',
        order: MENU_ROWS.length + 1,
        visible: true,
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
        disabled={Boolean(menu)}
        fieldProps={{ id: `${inputIdPrefix}-key` }}
        formItemProps={{ htmlFor: `${inputIdPrefix}-key` }}
        label="Route Key"
        name="key"
        placeholder="例如 adminReports"
        rules={[{ required: true, message: '请输入 Route Key' }]}
      />
      <ProFormText
        fieldProps={{ id: `${inputIdPrefix}-name` }}
        formItemProps={{ htmlFor: `${inputIdPrefix}-name` }}
        label="菜单名称"
        name="name"
        placeholder="请输入菜单名称"
        rules={[{ required: true, message: '请输入菜单名称' }]}
      />
      <ProFormText
        fieldProps={{ id: `${inputIdPrefix}-path` }}
        formItemProps={{ htmlFor: `${inputIdPrefix}-path` }}
        label="路径"
        name="path"
        placeholder="例如 /admin/reports"
        rules={[
          { required: true, message: '请输入路径' },
          { pattern: /^\//, message: '路径必须以 / 开头' },
        ]}
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
      <ProFormDigit
        fieldProps={{
          'aria-label': '顺序',
          id: `${inputIdPrefix}-order`,
          min: 1,
          precision: 0,
        }}
        formItemProps={{ htmlFor: `${inputIdPrefix}-order` }}
        label="顺序"
        name="order"
        rules={[{ required: true, message: '请输入顺序' }]}
      />
      <ProFormSwitch
        fieldProps={{
          'aria-label': '显示',
          id: `${inputIdPrefix}-visible`,
        }}
        formItemProps={{ htmlFor: `${inputIdPrefix}-visible` }}
        label="显示"
        name="visible"
      />
    </ModalForm>
  );
}
