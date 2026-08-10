import { ProFormSelect, StepsForm } from '@ant-design/pro-components';
import { Modal } from 'antd';
import { useStaticPrototypeAction } from '@/hooks/useStaticPrototypeAction';
import { EMPLOYEE_OPTIONS, REPOSITORY_OPTIONS } from './constant';
import type { AssignTaskInput, TaskRow } from './type';

interface AssignTaskStepsProps {
  open: boolean;
  task?: TaskRow;
  onClose: () => void;
}

export function AssignTaskSteps({ open, task, onClose }: AssignTaskStepsProps) {
  const showStaticAction = useStaticPrototypeAction();

  const submit = async (_values: AssignTaskInput) => {
    showStaticAction('分配任务');
    onClose();
    return true;
  };

  return (
    <Modal
      destroyOnHidden
      footer={null}
      onCancel={onClose}
      open={open}
      title="分配任务"
      width={640}
    >
      {task ? (
        <StepsForm<AssignTaskInput>
          formProps={{ layout: 'vertical' }}
          key={task.id}
          onFinish={submit}
          stepsProps={{ size: 'small' }}
        >
          <StepsForm.StepForm name="member" title="选择成员">
            <ProFormSelect
              fieldProps={{ virtual: false }}
              label="选择成员"
              name="employeeId"
              options={EMPLOYEE_OPTIONS.map((option) => ({ ...option }))}
              placeholder="请选择工作区成员"
              rules={[{ required: true, message: '请选择成员' }]}
            />
          </StepsForm.StepForm>
          <StepsForm.StepForm name="repository" title="确认仓库">
            <ProFormSelect
              fieldProps={{ virtual: false }}
              label="确认仓库"
              name="repository"
              options={REPOSITORY_OPTIONS.map((option) => ({ ...option }))}
              placeholder="请选择任务仓库"
              rules={[{ required: true, message: '请选择仓库' }]}
            />
          </StepsForm.StepForm>
        </StepsForm>
      ) : null}
    </Modal>
  );
}
