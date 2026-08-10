import {
  ModalForm,
  ProFormDigit,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { useStaticPrototypeAction } from '@/hooks/useStaticPrototypeAction';
import { MODEL_FORM_STATUS_OPTIONS, MODEL_PROVIDER_OPTIONS } from './constant';
import type { ModelFormValues, ModelRow } from './type';

interface ModelModalProps {
  open: boolean;
  model?: ModelRow;
  onClose: () => void;
}

export function ModelModal({ open, model, onClose }: ModelModalProps) {
  const showStaticAction = useStaticPrototypeAction();
  const inputIdPrefix = model
    ? `admin-model-edit-${model.id}`
    : 'admin-model-create';
  const initialValues: Partial<ModelFormValues> = model
    ? {
        name: model.name,
        provider: model.provider,
        contextWindow: model.contextWindow,
        status: model.status,
        purpose: model.purpose,
      }
    : { status: 'evaluation' };

  const submit = async (values: Partial<ModelFormValues>) => {
    showStaticAction(
      model
        ? `编辑模型 ${model.name}`
        : `接入模型 ${values.name?.trim() ?? ''}`,
    );
    onClose();
    return true;
  };

  return (
    <ModalForm<Partial<ModelFormValues>>
      initialValues={initialValues}
      key={model?.id ?? 'create'}
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
          submitText: model ? '保存' : '接入',
        },
      }}
      title={model ? '编辑模型' : '接入模型'}
      width={600}
    >
      <ProFormText
        fieldProps={{ id: `${inputIdPrefix}-name` }}
        formItemProps={{ htmlFor: `${inputIdPrefix}-name` }}
        label="名称"
        name="name"
        placeholder="请输入模型名称"
        rules={[{ required: true, message: '请输入名称' }]}
      />
      <ProFormSelect
        fieldProps={{
          'aria-label': 'Provider',
          id: `${inputIdPrefix}-provider`,
          virtual: false,
        }}
        formItemProps={{ htmlFor: `${inputIdPrefix}-provider` }}
        label="Provider"
        name="provider"
        options={MODEL_PROVIDER_OPTIONS.map((option) => ({ ...option }))}
        placeholder="请选择 Provider"
        rules={[{ required: true, message: '请选择 Provider' }]}
      />
      <ProFormDigit
        fieldProps={{
          id: `${inputIdPrefix}-context-window`,
          min: 1,
          precision: 0,
        }}
        formItemProps={{ htmlFor: `${inputIdPrefix}-context-window` }}
        label="上下文窗口"
        name="contextWindow"
        placeholder="请输入 Token 数量"
        rules={[{ required: true, message: '请输入上下文窗口' }]}
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
        options={MODEL_FORM_STATUS_OPTIONS.map((option) => ({ ...option }))}
        rules={[{ required: true, message: '请选择状态' }]}
      />
      <ProFormTextArea
        fieldProps={{ id: `${inputIdPrefix}-purpose`, rows: 4 }}
        formItemProps={{ htmlFor: `${inputIdPrefix}-purpose` }}
        label="用途"
        name="purpose"
        placeholder="描述模型适用任务与路由范围"
        rules={[{ required: true, message: '请输入用途' }]}
      />
    </ModalForm>
  );
}
