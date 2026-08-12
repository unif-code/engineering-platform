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
    <section aria-label={`${workspace.name} 成员管理`} className={styles.panel}>
      <header className={styles.panelHeader}>
        <span className={styles.secondaryText}>
          正式成员 = Owner + 受邀 Leader 直属有效员工；临时协作有时间边界
        </span>
        {workspace.canManage ? (
          <Button
            aria-label="添加成员"
            icon={<PlusOutlined />}
            onClick={() => setModalOpen(true)}
            size="small"
            type="primary"
          >
            添加成员
          </Button>
        ) : null}
      </header>

      <ul aria-label={`${workspace.name} 成员`} className={styles.memberList}>
        {workspace.members.map((member) => (
          <li
            aria-label={`${member.name} ${member.role}${member.tag === 'temporary' ? ' 临时协作' : ''}`}
            className={styles.memberItem}
            key={member.employeeId}
          >
            <span aria-hidden className={styles.memberAvatar}>
              {member.name.slice(0, 1)}
            </span>
            <span className={styles.memberBody}>
              <span className={styles.memberIdentity}>
                <span className={styles.memberName}>{member.name}</span>
                {member.tag === 'owner' ? (
                  <SemanticTag label="Owner" tone="brand" />
                ) : null}
                {member.tag === 'temporary' ? (
                  <SemanticTag label="临时协作" tone="info" />
                ) : null}
                {member.tag === 'disabled' ? (
                  <SemanticTag label="已停用" tone="neutral" />
                ) : null}
              </span>
              <span className={styles.secondaryText}>{member.role}</span>
            </span>
            {workspace.canManage && member.tag !== 'owner' ? (
              <Button
                aria-label={`移除成员 ${member.name}`}
                onClick={() => showStaticAction(`移除成员 ${member.name}`)}
                size="small"
                type="link"
              >
                移除
              </Button>
            ) : null}
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
            fieldProps={{
              'aria-label': '选择成员',
              id: 'workspace-member-candidate',
              virtual: false,
            }}
            formItemProps={{ htmlFor: 'workspace-member-candidate' }}
            label="选择成员"
            name="employeeId"
            options={MEMBER_CANDIDATE_OPTIONS.map((option) => ({ ...option }))}
            placeholder="请选择协作成员"
            rules={[{ message: '请选择协作成员', required: true }]}
          />
          <ProFormSelect
            fieldProps={{
              'aria-label': '协作期限',
              id: 'workspace-collaboration-term',
              virtual: false,
            }}
            formItemProps={{ htmlFor: 'workspace-collaboration-term' }}
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
