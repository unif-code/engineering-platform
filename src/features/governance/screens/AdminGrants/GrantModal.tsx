import {
  ModalForm,
  type ProFormInstance,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { App, Typography } from 'antd';
import { useRef } from 'react';
import { formatGovernanceError } from '@/features/administration';
import {
  GRANT_PRINCIPAL_TYPE_OPTIONS,
  GRANT_VALIDITY_OPTIONS,
} from './constant';
import type {
  GrantFormValues,
  GrantPrincipalOption,
  GrantPrincipalType,
  GrantScopeOption,
  GrantSubmitInput,
} from './type';

interface GrantModalProps {
  onClose: () => void;
  onSubmit: (input: GrantSubmitInput) => Promise<void>;
  open: boolean;
  principalOptions: readonly GrantPrincipalOption[];
  scopeOptions: readonly GrantScopeOption[];
}

function buildGrantSubmitInput(
  values: GrantFormValues,
  principalOptions: readonly GrantPrincipalOption[],
  scopeOptions: readonly GrantScopeOption[],
): GrantSubmitInput {
  const principal = principalOptions.find(
    ({ value }) => value === values.principalId,
  );
  if (principal?.type !== values.principalType) {
    throw new Error('请选择与主体类型匹配的主体');
  }
  const scope = scopeOptions.find(({ value }) => value === values.scopeId);
  if (scope === undefined) {
    throw new Error('请选择范围');
  }
  if (values.validity !== 'LONG_TERM') {
    throw new Error('当前契约尚未开放临时有效期授权');
  }
  return {
    capability: values.capability.trim(),
    principalId: values.principalId,
    reason: values.reason.trim(),
    scope:
      scope.type === 'PLATFORM'
        ? { type: 'PLATFORM' }
        : { id: scope.value, type: 'WORKSPACE' },
  };
}

export function GrantModal({
  onClose,
  onSubmit,
  open,
  principalOptions,
  scopeOptions,
}: GrantModalProps) {
  const { message } = App.useApp();
  const formRef = useRef<ProFormInstance<GrantFormValues> | undefined>(
    undefined,
  );
  const principalType: GrantPrincipalType = 'ACCOUNT';

  const submit = async (values: GrantFormValues) => {
    try {
      await onSubmit(
        buildGrantSubmitInput(values, principalOptions, scopeOptions),
      );
      onClose();
      message.success('能力已授予');
      return true;
    } catch (error) {
      message.error(formatGovernanceError(error, '能力授予失败'));
      return false;
    }
  };

  return (
    <ModalForm<GrantFormValues>
      formRef={formRef}
      initialValues={{
        principalType: 'ACCOUNT',
        scopeId: 'PLATFORM',
        validity: 'LONG_TERM',
      }}
      modalProps={{ destroyOnHidden: true, onCancel: onClose }}
      onFinish={submit}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
      open={open}
      submitter={{
        searchConfig: { resetText: '取消', submitText: '确认授予' },
      }}
      title="新增授权"
      width={560}
    >
      <Typography.Paragraph type="secondary">
        Grant 以 Principal × Capability × Scope 成对保存，不从角色模板推导。
      </Typography.Paragraph>
      <ProFormSelect
        disabled
        fieldProps={{
          'aria-label': '主体类型',
          id: 'admin-grant-principal-type',
          virtual: false,
        }}
        formItemProps={{ htmlFor: 'admin-grant-principal-type' }}
        label="主体类型"
        name="principalType"
        options={GRANT_PRINCIPAL_TYPE_OPTIONS.map((option) => ({ ...option }))}
        rules={[{ required: true, message: '请选择主体类型' }]}
      />
      <ProFormSelect
        fieldProps={{
          'aria-label': '主体',
          id: 'admin-grant-principal',
          virtual: false,
        }}
        formItemProps={{ htmlFor: 'admin-grant-principal' }}
        label="主体"
        name="principalId"
        options={principalOptions.filter(({ type }) => type === principalType)}
        placeholder="请选择主体"
        rules={[{ required: true, message: '请选择主体' }]}
      />
      <ProFormText
        fieldProps={{
          'aria-label': '能力',
          id: 'admin-grant-capability',
        }}
        formItemProps={{ htmlFor: 'admin-grant-capability' }}
        label="能力"
        name="capability"
        placeholder="请输入 Capability，如 ws.config"
        rules={[
          { required: true, message: '请输入 Capability' },
          { whitespace: true, message: 'Capability 不能为空' },
        ]}
      />
      <ProFormSelect
        fieldProps={{
          'aria-label': '范围',
          id: 'admin-grant-scope',
          virtual: false,
        }}
        formItemProps={{ htmlFor: 'admin-grant-scope' }}
        label="范围"
        name="scopeId"
        options={scopeOptions.map(({ label, value }) => ({ label, value }))}
        rules={[{ required: true, message: '请选择范围' }]}
      />
      <ProFormSelect
        fieldProps={{
          'aria-label': '有效期',
          id: 'admin-grant-validity',
          virtual: false,
        }}
        formItemProps={{ htmlFor: 'admin-grant-validity' }}
        label="有效期"
        name="validity"
        options={GRANT_VALIDITY_OPTIONS.map((option) => ({ ...option }))}
        rules={[{ required: true, message: '请选择有效期' }]}
      />
      <ProFormTextArea
        fieldProps={{ id: 'admin-grant-reason', rows: 3 }}
        formItemProps={{ htmlFor: 'admin-grant-reason' }}
        label="授权原因"
        name="reason"
        placeholder="将写入审计日志"
        rules={[
          { required: true, message: '请输入授予原因' },
          { whitespace: true, message: '授予原因不能为空' },
        ]}
      />
    </ModalForm>
  );
}
