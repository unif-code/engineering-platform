import { ModalForm, ProFormText } from '@ant-design/pro-components';
import { Button } from 'antd';
import { useState } from 'react';
import { SemanticTag } from '@/components/SemanticTag';
import { useStaticPrototypeAction } from '@/hooks/useStaticPrototypeAction';
import { GITLAB_CONNECTION, WORKSPACE_POLICY_ITEMS } from './constant';
import { useStyles } from './index.style';
import type { GitLabConnectionValues, WorkspaceFixture } from './type';

export interface SettingsPanelProps {
  workspace: WorkspaceFixture;
}

export function SettingsPanel({ workspace }: SettingsPanelProps) {
  const { styles } = useStyles();
  const showStaticAction = useStaticPrototypeAction();
  const [connectionOpen, setConnectionOpen] = useState(false);

  const submitConnection = async (_values: GitLabConnectionValues) => {
    showStaticAction('更新 GitLab Connection');
    setConnectionOpen(false);
    return true;
  };

  return (
    <section
      aria-labelledby={`${workspace.id}-settings-title`}
      className={styles.panel}
    >
      <h3 className={styles.panelTitle} id={`${workspace.id}-settings-title`}>
        设置
      </h3>
      <div className={styles.settingsGrid}>
        <article className={styles.settingsSection}>
          <header className={styles.settingsHeading}>
            <h4 className={styles.settingsTitle}>GitLab Connection</h4>
            <SemanticTag label="已连接" tone="success" />
          </header>
          <dl className={styles.keyValueList}>
            <dt className={styles.key}>地址</dt>
            <dd className={styles.value}>{GITLAB_CONNECTION.url}</dd>
            <dt className={styles.key}>凭据引用</dt>
            <dd className={styles.value}>
              {GITLAB_CONNECTION.credentialReference}
            </dd>
            <dt className={styles.key}>Scope</dt>
            <dd className={styles.value}>{GITLAB_CONNECTION.scope}</dd>
          </dl>
          <div className={styles.settingsActions}>
            <Button onClick={() => setConnectionOpen(true)}>更新连接</Button>
          </div>
        </article>

        <article className={styles.settingsSection}>
          <header className={styles.settingsHeading}>
            <h4 className={styles.settingsTitle}>Workspace Policy</h4>
            <SemanticTag label="已启用" tone="brand" />
          </header>
          <ul className={styles.policyList}>
            {WORKSPACE_POLICY_ITEMS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <div className={styles.settingsActions}>
            <Button
              onClick={() => showStaticAction('保存 Workspace Policy')}
              type="primary"
            >
              保存 Workspace Policy
            </Button>
            <Button danger onClick={() => showStaticAction('归档工作区')}>
              归档工作区
            </Button>
          </div>
        </article>
      </div>

      {connectionOpen ? (
        <ModalForm<GitLabConnectionValues>
          initialValues={{
            credentialReference: GITLAB_CONNECTION.credentialReference,
            url: GITLAB_CONNECTION.url,
          }}
          modalProps={{
            destroyOnHidden: true,
            onCancel: () => setConnectionOpen(false),
          }}
          onFinish={submitConnection}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) {
              setConnectionOpen(false);
            }
          }}
          open
          submitter={{
            searchConfig: { resetText: '取消', submitText: '保存连接' },
          }}
          title="更新 GitLab Connection"
        >
          <ProFormText
            label="GitLab 地址"
            name="url"
            rules={[{ message: '请输入 GitLab 地址', required: true }]}
          />
          <ProFormText
            label="Credential Reference"
            name="credentialReference"
            rules={[{ message: '请输入 Credential Reference', required: true }]}
          />
        </ModalForm>
      ) : null}
    </section>
  );
}
