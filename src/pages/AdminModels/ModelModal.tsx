import {
  ModalForm,
  ProFormDigit,
  ProFormSelect,
  ProFormText,
} from '@ant-design/pro-components';
import { useStaticPrototypeAction } from '@/hooks/useStaticPrototypeAction';
import {
  MODEL_ACCESS_OPTIONS,
  MODEL_FORM_STATUS_OPTIONS,
  MODEL_USE_OPTIONS,
} from './constant';
import type {
  ModelCreateFormValues,
  ModelEditFormValues,
  ModelRow,
} from './type';

interface ModelModalProps {
  open: boolean;
  model?: ModelRow;
  onClose: () => void;
}

interface SharedModalProps {
  open: boolean;
  onClose: () => void;
}

function CreateModelModal({ open, onClose }: SharedModalProps) {
  const showStaticAction = useStaticPrototypeAction();

  const submit = async (values: ModelCreateFormValues) => {
    showStaticAction(`接入模型 ${values.name.trim()}`);
    onClose();
    return true;
  };

  return (
    <ModalForm<ModelCreateFormValues>
      initialValues={{ initialStatus: 'evaluation' }}
      key="create"
      modalProps={{ destroyOnHidden: true, onCancel: onClose }}
      onFinish={submit}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
      open={open}
      submitter={{
        searchConfig: { resetText: '取消', submitText: '接入' },
      }}
      title="接入模型"
      width={560}
    >
      <ProFormText
        fieldProps={{ id: 'admin-model-create-name' }}
        formItemProps={{ htmlFor: 'admin-model-create-name' }}
        label="模型名称"
        name="name"
        placeholder="如：GLM-5"
        rules={[{ required: true, message: '请输入模型名称' }]}
      />
      <ProFormText
        fieldProps={{ id: 'admin-model-create-deployment' }}
        formItemProps={{ htmlFor: 'admin-model-create-deployment' }}
        label="部署名"
        name="deployment"
        placeholder="如：glm-5"
        rules={[{ required: true, message: '请输入部署名' }]}
      />
      <ProFormSelect
        fieldProps={{
          'aria-label': '用途',
          id: 'admin-model-create-use',
          virtual: false,
        }}
        formItemProps={{ htmlFor: 'admin-model-create-use' }}
        label="用途"
        name="use"
        options={MODEL_USE_OPTIONS.map((option) => ({ ...option }))}
        placeholder="请选择用途"
        rules={[{ required: true, message: '请选择用途' }]}
      />
      <ProFormSelect
        fieldProps={{
          'aria-label': '接入方式',
          id: 'admin-model-create-access',
          virtual: false,
        }}
        formItemProps={{ htmlFor: 'admin-model-create-access' }}
        label="接入方式"
        name="access"
        options={MODEL_ACCESS_OPTIONS.map((option) => ({ ...option }))}
        placeholder="请选择接入方式"
        rules={[{ required: true, message: '请选择接入方式' }]}
      />
      <ProFormText
        fieldProps={{ id: 'admin-model-create-context' }}
        formItemProps={{ htmlFor: 'admin-model-create-context' }}
        label="上下文窗口"
        name="context"
        placeholder="如：256K"
        rules={[{ required: true, message: '请输入上下文窗口' }]}
      />
      <ProFormDigit
        fieldProps={{ id: 'admin-model-create-rate', min: 1, precision: 0 }}
        formItemProps={{ htmlFor: 'admin-model-create-rate' }}
        label="限流 (RPM)"
        name="rateLimit"
        placeholder="如：200"
        rules={[{ required: true, message: '请输入限流值' }]}
      />
      <ProFormSelect
        fieldProps={{
          'aria-label': '初始状态',
          id: 'admin-model-create-status',
          virtual: false,
        }}
        formItemProps={{ htmlFor: 'admin-model-create-status' }}
        label="初始状态"
        name="initialStatus"
        options={MODEL_FORM_STATUS_OPTIONS.map((option) => ({ ...option }))}
        rules={[{ required: true, message: '请选择初始状态' }]}
      />
    </ModalForm>
  );
}

function EditModelModal({
  model,
  open,
  onClose,
}: SharedModalProps & { model: ModelRow }) {
  const showStaticAction = useStaticPrototypeAction();
  const initialValues: ModelEditFormValues = {
    rateLimit: model.rateLimit,
    context: model.context,
    status: model.status,
  };

  const submit = async (_values: ModelEditFormValues) => {
    showStaticAction(`编辑模型配置 ${model.name}`);
    onClose();
    return true;
  };

  return (
    <ModalForm<ModelEditFormValues>
      initialValues={initialValues}
      key={model.id}
      modalProps={{ destroyOnHidden: true, onCancel: onClose }}
      onFinish={submit}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
      open={open}
      submitter={{
        searchConfig: { resetText: '取消', submitText: '保存' },
      }}
      title="编辑模型配置"
      width={560}
    >
      <ProFormDigit
        fieldProps={{
          id: `admin-model-edit-${model.id}-rate`,
          min: 1,
          precision: 0,
        }}
        formItemProps={{ htmlFor: `admin-model-edit-${model.id}-rate` }}
        label="限流 (RPM)"
        name="rateLimit"
        rules={[{ required: true, message: '请输入限流值' }]}
      />
      <ProFormText
        fieldProps={{ id: `admin-model-edit-${model.id}-context` }}
        formItemProps={{
          htmlFor: `admin-model-edit-${model.id}-context`,
        }}
        label="上下文窗口"
        name="context"
        rules={[{ required: true, message: '请输入上下文窗口' }]}
      />
      <ProFormSelect
        fieldProps={{
          'aria-label': '状态',
          id: `admin-model-edit-${model.id}-status`,
          virtual: false,
        }}
        formItemProps={{ htmlFor: `admin-model-edit-${model.id}-status` }}
        label="状态"
        name="status"
        options={MODEL_FORM_STATUS_OPTIONS.map((option) => ({ ...option }))}
        rules={[{ required: true, message: '请选择状态' }]}
      />
    </ModalForm>
  );
}

export function ModelModal({ open, model, onClose }: ModelModalProps) {
  return model ? (
    <EditModelModal model={model} onClose={onClose} open={open} />
  ) : (
    <CreateModelModal onClose={onClose} open={open} />
  );
}
