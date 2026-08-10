import { PlusOutlined } from '@ant-design/icons';
import { ModalForm, ProFormSelect } from '@ant-design/pro-components';
import { Button } from 'antd';
import { useState } from 'react';
import { SemanticTag } from '@/components/SemanticTag';
import { useStaticPrototypeAction } from '@/hooks/useStaticPrototypeAction';
import {
  COLLABORATION_TERM_OPTIONS,
  MEMBER_CANDIDATE_OPTIONS,
} from './constant';
import { useStyles } from './index.style';
import type { AddMemberValues, WorkspaceFixture } from './type';

export interface MemberPanelProps {
  workspace: WorkspaceFixture;
}

export function MemberPanel({ workspace }: MemberPanelProps) {
  const { styles } = useStyles();
  const showStaticAction = useStaticPrototypeAction();
  const [modalOpen, setModalOpen] = useState(false);

  const submit = async (_values: AddMemberValues) => {
    showStaticAction('添加成员');
    setModalOpen(false);
    return true;
  };

  return (
    <section
      aria-labelledby={`${workspace.id}-members-title`}
      className={styles.panel}
    >
      <header className={styles.panelHeader}>
        <div>
          <h3
            className={styles.panelTitle}
            id={`${workspace.id}-members-title`}
          >
            成员
          </h3>
          <span className={styles.secondaryText}>
            正式成员与有时间边界的临时协作成员
          </span>
        </div>
        <Button
          aria-label="添加成员"
          icon={<PlusOutlined />}
          onClick={() => setModalOpen(true)}
          type="primary"
        >
          添加成员
        </Button>
      </header>

      <ul aria-label={`${workspace.name} 成员`} className={styles.memberList}>
        {workspace.members.map((member) => (
          <li
            aria-label={`${member.name} ${member.employeeId} ${member.role}`}
            className={styles.memberItem}
            key={member.employeeId}
          >
            <span aria-hidden className={styles.memberAvatar}>
              {member.name.slice(0, 1)}
            </span>
            <span className={styles.memberBody}>
              <span className={styles.memberIdentity}>
                <span className={styles.memberName}>{member.name}</span>
                <SemanticTag
                  label={member.role}
                  tone={member.role.includes('Owner') ? 'brand' : 'neutral'}
                />
              </span>
              <span className={styles.code}>{member.employeeId}</span>
            </span>
          </li>
        ))}
      </ul>

      {modalOpen ? (
        <ModalForm<AddMemberValues>
          initialValues={{ collaborationTerm: '30-days' }}
          modalProps={{
            destroyOnHidden: true,
            onCancel: () => setModalOpen(false),
          }}
          onFinish={submit}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) {
              setModalOpen(false);
            }
          }}
          open
          submitter={{
            searchConfig: { resetText: '取消', submitText: '确认添加' },
          }}
          title="添加成员"
        >
          <ProFormSelect
            fieldProps={{ virtual: false }}
            label="选择成员"
            name="employeeId"
            options={MEMBER_CANDIDATE_OPTIONS.map((option) => ({ ...option }))}
            placeholder="请选择协作成员"
            rules={[{ message: '请选择协作成员', required: true }]}
          />
          <ProFormSelect
            fieldProps={{ virtual: false }}
            label="协作期限"
            name="collaborationTerm"
            options={COLLABORATION_TERM_OPTIONS.map((option) => ({
              ...option,
            }))}
            rules={[{ message: '请选择协作期限', required: true }]}
          />
        </ModalForm>
      ) : null}
    </section>
  );
}
