import { Form, Input, Modal } from 'antd';
import type { RefObject } from 'react';
import { useStaticPrototypeAction } from '@/hooks/useStaticPrototypeAction';
import type { RejectApprovalValues } from './type';

export interface RejectApprovalModalProps {
  open: boolean;
  onClose: () => void;
  focusReturnRef?: RefObject<HTMLElement | null>;
}

export function RejectApprovalModal({
  open,
  onClose,
  focusReturnRef,
}: RejectApprovalModalProps) {
  const [form] = Form.useForm<RejectApprovalValues>();
  const showStaticAction = useStaticPrototypeAction();

  const close = () => {
    form.resetFields();
    onClose();
  };

  const submit = () => {
    showStaticAction('驳回审批');
    close();
  };

  return (
    <Modal
      afterOpenChange={(nextOpen) => {
        if (!nextOpen) {
          focusReturnRef?.current?.focus({ preventScroll: true });
        }
      }}
      cancelText="取消"
      destroyOnHidden
      focusable={focusReturnRef ? { focusTriggerAfterClose: false } : undefined}
      okButtonProps={{ danger: true }}
      okText="确认驳回"
      onCancel={close}
      onOk={() => form.submit()}
      open={open}
      title="驳回审批"
    >
      <Form<RejectApprovalValues>
        clearOnDestroy
        form={form}
        layout="vertical"
        onFinish={submit}
      >
        <Form.Item
          label="驳回原因"
          name="reason"
          rules={[
            {
              message: '请输入驳回原因',
              required: true,
              whitespace: true,
            },
          ]}
        >
          <Input.TextArea
            autoSize={{ maxRows: 6, minRows: 4 }}
            maxLength={300}
            placeholder="说明需要补充或调整的内容"
            showCount
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
