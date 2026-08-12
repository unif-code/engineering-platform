import { Button, Input } from 'antd';
import { useState } from 'react';
import { useStaticPrototypeAction } from '@/hooks/useStaticPrototypeAction';
import { useStyles } from './index.style';
import type { WorkspaceFixture } from './type';

export interface SettingsPanelProps {
  workspace: WorkspaceFixture;
}

export function SettingsPanel({ workspace }: SettingsPanelProps) {
  const { styles } = useStyles();
  const showStaticAction = useStaticPrototypeAction();
  const [name, setName] = useState(workspace.name);

  const saveName = () => {
    showStaticAction('保存工作区名称');
    setName(workspace.name);
  };

  return (
    <section
      aria-labelledby={`${workspace.id}-settings-title`}
      className={styles.panel}
    >
      <h3 className={styles.panelTitle} id={`${workspace.id}-settings-title`}>
        工作区设置
      </h3>

      <div className={styles.settingsForm}>
        <label className={styles.settingsLabel} htmlFor="workspace-name">
          工作区名称
        </label>
        <div className={styles.settingsNameRow}>
          <Input
            id="workspace-name"
            onChange={(event) => setName(event.target.value)}
            value={name}
          />
          <Button disabled={!name.trim()} onClick={saveName} type="primary">
            保存
          </Button>
        </div>
      </div>

      <div className={styles.archiveCard}>
        <span>
          <strong className={styles.archiveTitle}>归档工作区</strong>
          <span className={styles.archiveDescription}>
            归档后成员不能继续绑定新任务，历史数据仍可查看。
          </span>
        </span>
        <Button danger onClick={() => showStaticAction('归档工作区')}>
          归档
        </Button>
      </div>
    </section>
  );
}
