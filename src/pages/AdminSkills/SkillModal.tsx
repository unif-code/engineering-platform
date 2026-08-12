import {
  ModalForm,
  ProFormSelect,
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
        type: skill.type,
        stack: skill.stack,
        content: skill.content,
        version: skill.version,
      }
    : undefined;

  const submit = async (_values: SkillFormValues) => {
    showStaticAction(skill ? `编辑技能 ${skill.key}` : '新建技能');
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
          submitText: skill ? '保存' : '新建',
        },
      }}
      title={skill ? '编辑技能' : '手动创建技能'}
      width={560}
    >
      <ProFormText
        fieldProps={{ id: `${inputIdPrefix}-name` }}
        formItemProps={{ htmlFor: `${inputIdPrefix}-name` }}
        label="技能名称"
        name="name"
        placeholder="请输入技能名称"
        rules={[{ required: true, message: '请输入技能名称' }]}
      />
      {skill ? (
        <>
          <ProFormText
            fieldProps={{ id: `${inputIdPrefix}-new-version` }}
            formItemProps={{ htmlFor: `${inputIdPrefix}-new-version` }}
            initialValue={skill.version}
            label="发布新版本"
            name="newVersion"
            placeholder="如：v2.9"
            rules={[{ required: true, message: '请输入发布新版本' }]}
          />
          <ProFormTextArea
            fieldProps={{ id: `${inputIdPrefix}-change-note`, rows: 4 }}
            formItemProps={{ htmlFor: `${inputIdPrefix}-change-note` }}
            label="变更说明"
            name="changeNote"
            placeholder="如：新增 hooks 依赖检查规则"
            rules={[{ required: true, message: '请输入变更说明' }]}
          />
        </>
      ) : (
        <>
          <ProFormSelect
            fieldProps={{ id: `${inputIdPrefix}-type`, virtual: false }}
            formItemProps={{ htmlFor: `${inputIdPrefix}-type` }}
            label="类型"
            name="type"
            options={[
              { label: 'SDD 方法', value: 'SDD 方法' },
              { label: '仓库规范', value: '仓库规范' },
              { label: '平台默认', value: '平台默认' },
            ]}
            placeholder="请选择技能类型"
            rules={[{ required: true, message: '请选择技能类型' }]}
          />
          <ProFormText
            fieldProps={{ id: `${inputIdPrefix}-stack` }}
            formItemProps={{ htmlFor: `${inputIdPrefix}-stack` }}
            label="适用技术栈"
            name="stack"
            placeholder="例如 React 19 / TypeScript"
            rules={[{ required: true, message: '请输入适用技术栈' }]}
          />
          <ProFormTextArea
            fieldProps={{ id: `${inputIdPrefix}-content`, rows: 4 }}
            formItemProps={{ htmlFor: `${inputIdPrefix}-content` }}
            label="规范内容"
            name="content"
            placeholder="请输入规范内容"
            rules={[{ required: true, message: '请输入规范内容' }]}
          />
          <ProFormText
            fieldProps={{ id: `${inputIdPrefix}-version` }}
            formItemProps={{ htmlFor: `${inputIdPrefix}-version` }}
            label="发布版本"
            name="version"
            placeholder="例如 v1.0"
            rules={[{ required: true, message: '请输入发布版本' }]}
          />
        </>
      )}
    </ModalForm>
  );
}
