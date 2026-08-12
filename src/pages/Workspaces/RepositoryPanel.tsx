import { ModalForm, ProFormText } from '@ant-design/pro-components';
import { Button, Checkbox } from 'antd';
import { useState } from 'react';
import { SemanticTag } from '@/components/SemanticTag';
import { useStaticPrototypeAction } from '@/hooks/useStaticPrototypeAction';
import { GITLAB_CONNECTION } from './constant';
import { useStyles } from './index.style';
import type { GitLabConnectionValues, WorkspaceFixture } from './type';

export interface RepositoryPanelProps {
  workspace: WorkspaceFixture;
}

export function RepositoryPanel({ workspace }: RepositoryPanelProps) {
  const { styles } = useStyles();
  const showStaticAction = useStaticPrototypeAction();
  const [connectionOpen, setConnectionOpen] = useState(false);
  const visibleRepositories = workspace.canManage
    ? workspace.repositories
    : workspace.repositories.filter(({ selected }) => selected);
  const selectedCount = workspace.repositories.filter(
    ({ selected }) => selected,
  ).length;
  const hiddenCount = Math.max(
    0,
    workspace.foundRepositoryCount - workspace.repositories.length,
  );

  const submitConnection = async (_values: GitLabConnectionValues) => {
    showStaticAction('更新 GitLab Connection');
    setConnectionOpen(false);
    return true;
  };

  return (
    <section
      aria-labelledby={`${workspace.id}-repositories-title`}
      className={styles.panel}
    >
      <h3
        className={styles.visuallyHidden}
        id={`${workspace.id}-repositories-title`}
      >
        仓库
      </h3>

      {workspace.canManage ? (
        <div className={styles.connectionCard}>
          <span aria-hidden className={styles.gitLabMark}>
            🦊
          </span>
          <span className={styles.connectionBody}>
            <span className={styles.connectionTitle}>
              git.corp.example.com <SemanticTag label="已连接" tone="success" />
            </span>
            <span className={styles.code}>
              PAT：glpat-•••••••••••• · {GITLAB_CONNECTION.scope} · 发现{' '}
              {workspace.foundRepositoryCount} 个仓库
            </span>
          </span>
          <Button onClick={() => setConnectionOpen(true)} size="small">
            更新连接
          </Button>
        </div>
      ) : null}

      {workspace.canManage ? (
        <div className={styles.repositorySummary}>
          <span className={styles.secondaryText}>
            勾选进入工作区的仓库；只有选入的仓库对成员可见、可绑定任务
          </span>
          <strong className={styles.selectedCount}>
            {selectedCount} / {workspace.foundRepositoryCount} 已选入
          </strong>
        </div>
      ) : null}

      <ul
        aria-label={`${workspace.name} 仓库`}
        className={styles.repositoryList}
      >
        {visibleRepositories.map((repository) => (
          <li
            aria-label={`${repository.name} 仓库`}
            className={styles.repositoryItem}
            key={repository.name}
          >
            {workspace.canManage ? (
              <Checkbox
                aria-label={`${repository.name} 选入工作区`}
                checked={repository.selected}
                onChange={() =>
                  showStaticAction(
                    `${repository.selected ? '移出' : '选入'}仓库 ${repository.name}`,
                  )
                }
              />
            ) : null}
            <span className={styles.repositoryName}>{repository.name}</span>
            <SemanticTag label={repository.stack} tone="neutral" />
          </li>
        ))}
      </ul>

      {workspace.canManage ? (
        <p className={styles.repositoryNote}>
          … 其余 {hiddenCount} 个仓库未选入（仅 Owner 可见）· CI/CD 由 Jenkins
          承担，平台预留接入框架
        </p>
      ) : null}

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
            fieldProps={{ id: 'workspace-gitlab-url' }}
            formItemProps={{ htmlFor: 'workspace-gitlab-url' }}
            label="GitLab 地址"
            name="url"
            rules={[{ message: '请输入 GitLab 地址', required: true }]}
          />
          <ProFormText
            fieldProps={{ id: 'workspace-gitlab-credential' }}
            formItemProps={{ htmlFor: 'workspace-gitlab-credential' }}
            label="Credential Reference"
            name="credentialReference"
            rules={[{ message: '请输入 Credential Reference', required: true }]}
          />
        </ModalForm>
      ) : null}
    </section>
  );
}
