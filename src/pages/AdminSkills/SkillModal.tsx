import {
  ModalForm,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { useStaticPrototypeAction } from '@/hooks/useStaticPrototypeAction';
import type { SkillFormValues, SkillItem } from './type';

interface SkillModalProps {
  open: boolean;
  skill?: SkillItem;
  onClose: () => void;
}

export function SkillModal({ open, skill, onClose }: SkillModalProps) {
  const showStaticAction = useStaticPrototypeAction();
  const inputIdPrefix = skill
    ? `admin-skill-edit-${skill.key}`
    : 'admin-skill-create';
  const initialValues: SkillFormValues | undefined = skill
    ? {
        name: skill.name,
        key: skill.key,
        version: skill.version,
        description: skill.description,
      }
    : undefined;

  const submit = async (_values: SkillFormValues) => {
    showStaticAction(skill ? `编辑 Skill ${skill.key}` : '新增 Skill');
    onClose();
    return true;
  };

  return (
    <ModalForm<SkillFormValues>
      initialValues={initialValues}
      key={skill?.key ?? 'create'}
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
          submitText: skill ? '保存' : '新增',
        },
      }}
      title={skill ? '编辑 Skill' : '新增 Skill'}
      width={560}
    >
      <ProFormText
        fieldProps={{ id: `${inputIdPrefix}-name` }}
        formItemProps={{ htmlFor: `${inputIdPrefix}-name` }}
        label="名称"
        name="name"
        placeholder="请输入 Skill 名称"
        rules={[{ required: true, message: '请输入名称' }]}
      />
      <ProFormText
        fieldProps={{ id: `${inputIdPrefix}-key` }}
        formItemProps={{ htmlFor: `${inputIdPrefix}-key` }}
        label="Key"
        name="key"
        placeholder="例如 requirement-clarifier"
        rules={[{ required: true, message: '请输入 Key' }]}
      />
      <ProFormText
        fieldProps={{ id: `${inputIdPrefix}-version` }}
        formItemProps={{ htmlFor: `${inputIdPrefix}-version` }}
        label="版本"
        name="version"
        placeholder="例如 1.0.0"
        rules={[{ required: true, message: '请输入版本' }]}
      />
      <ProFormTextArea
        fieldProps={{ id: `${inputIdPrefix}-description`, rows: 4 }}
        formItemProps={{ htmlFor: `${inputIdPrefix}-description` }}
        label="说明"
        name="description"
        placeholder="描述 Skill 的目标、输入与适用范围"
        rules={[{ required: true, message: '请输入说明' }]}
      />
    </ModalForm>
  );
}
