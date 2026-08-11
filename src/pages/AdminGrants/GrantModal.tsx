import {
  ModalForm,
  ProFormSelect,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { App, Typography } from 'antd';
import { useState } from 'react';
import {
  formatGovernanceError,
  type GrantScopeType,
} from '@/features/administration';
import { GRANT_CAPABILITY_OPTIONS, GRANT_SCOPE_OPTIONS } from './constant';
import type { GrantFormValues, GrantSubmitInput } from './type';

interface SelectOption {
  label: string;
  value: string;
}

interface GrantModalProps {
  onClose: () => void;
  onSubmit: (input: GrantSubmitInput) => Promise<void>;
  open: boolean;
  principalOptions: readonly SelectOption[];
  workspaceOptions: readonly SelectOption[];
}

export function GrantModal({
  onClose,
  onSubmit,
  open,
  principalOptions,
  workspaceOptions,
}: GrantModalProps) {
  const { message } = App.useApp();
  const [scopeType, setScopeType] = useState<GrantScopeType>('PLATFORM');

  const submit = async (values: GrantFormValues) => {
    try {
      const workspaceId = values.workspaceId;
      if (values.scopeType === 'WORKSPACE' && workspaceId === undefined) {
        throw new Error('请选择 Workspace');
      }
      await onSubmit({
        capability: values.capability,
        principalId: values.principalId,
        reason: values.reason.trim(),
        scope:
          values.scopeType === 'PLATFORM'
            ? { type: 'PLATFORM' }
            : { id: workspaceId, type: 'WORKSPACE' },
      });
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
      initialValues={{ scopeType: 'PLATFORM' }}
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
      title="授予能力"
      width={560}
    >
      <Typography.Paragraph type="secondary">
        Grant 以 Principal × Capability × Scope 成对保存，不从角色模板推导。
      </Typography.Paragraph>
      <ProFormSelect
        fieldProps={{
          'aria-label': 'Principal',
          id: 'admin-grant-principal',
          virtual: false,
        }}
        formItemProps={{ htmlFor: 'admin-grant-principal' }}
        label="Principal"
        name="principalId"
        options={[...principalOptions]}
        placeholder="请选择账号"
        rules={[{ required: true, message: '请选择 Principal' }]}
      />
      <ProFormSelect
        fieldProps={{
          'aria-label': 'Capability',
          id: 'admin-grant-capability',
          virtual: false,
        }}
        formItemProps={{ htmlFor: 'admin-grant-capability' }}
        label="Capability"
        name="capability"
        options={GRANT_CAPABILITY_OPTIONS.map((option) => ({ ...option }))}
        placeholder="请选择 Capability"
        rules={[{ required: true, message: '请选择 Capability' }]}
      />
      <ProFormSelect
        fieldProps={{
          'aria-label': 'Scope 类型',
          id: 'admin-grant-scope-type',
          onChange: setScopeType,
          virtual: false,
        }}
        formItemProps={{ htmlFor: 'admin-grant-scope-type' }}
        label="Scope 类型"
        name="scopeType"
        options={GRANT_SCOPE_OPTIONS.map((option) => ({ ...option }))}
        rules={[{ required: true, message: '请选择 Scope 类型' }]}
      />
      {scopeType === 'WORKSPACE' ? (
        <ProFormSelect
          fieldProps={{
            'aria-label': 'Workspace',
            id: 'admin-grant-workspace',
            virtual: false,
          }}
          formItemProps={{ htmlFor: 'admin-grant-workspace' }}
          label="Workspace"
          name="workspaceId"
          options={[...workspaceOptions]}
          placeholder="请选择 Workspace"
          rules={[{ required: true, message: '请选择 Workspace' }]}
        />
      ) : null}
      <ProFormTextArea
        fieldProps={{ id: 'admin-grant-reason', rows: 3 }}
        formItemProps={{ htmlFor: 'admin-grant-reason' }}
        label="授予原因"
        name="reason"
        placeholder="说明本次授权的业务原因"
        rules={[
          { required: true, message: '请输入授予原因' },
          { whitespace: true, message: '授予原因不能为空' },
        ]}
      />
    </ModalForm>
  );
}
