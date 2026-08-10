import { PageContainer, ProCard } from '@ant-design/pro-components';
import { Button } from 'antd';
import { useState } from 'react';
import { SemanticTag } from '@/components/SemanticTag';
import { useStaticPrototypeAction } from '@/hooks/useStaticPrototypeAction';
import { SKILL_ITEMS, SKILL_STATUS_META } from './constant';
import { useStyles } from './index.style';
import { SkillModal } from './SkillModal';
import type { SkillItem } from './type';

type SkillModalState =
  | { mode: 'create' }
  | { mode: 'edit'; skill: SkillItem }
  | null;

export default function AdminSkillsPage() {
  const { styles } = useStyles();
  const showStaticAction = useStaticPrototypeAction();
  const [modalState, setModalState] = useState<SkillModalState>(null);

  return (
    <PageContainer
      extra={[
        <Button
          key="create"
          onClick={() => setModalState({ mode: 'create' })}
          type="primary"
        >
          新增 Skill
        </Button>,
      ]}
      ghost
      subTitle="管理 Agent 可用 Skill 的版本与生命周期；当前页面为静态数据投影"
      title="技能管理"
    >
      <div className={styles.page}>
        <section aria-label="技能目录">
          <ProCard.Group ghost gutter={[16, 16]} wrap>
            {SKILL_ITEMS.map((skill) => {
              const statusMeta = SKILL_STATUS_META[skill.status];
              const finalAction = skill.status === 'active' ? '停用' : '归档';

              return (
                <ProCard
                  actions={[
                    <Button
                      aria-label={`编辑 ${skill.key}`}
                      key="edit"
                      onClick={() => setModalState({ mode: 'edit', skill })}
                      size="small"
                      type="link"
                    >
                      编辑
                    </Button>,
                    <Button
                      aria-label={`发版 ${skill.key}`}
                      key="release"
                      onClick={() =>
                        showStaticAction(`发版 Skill ${skill.key}`)
                      }
                      size="small"
                      type="link"
                    >
                      发版
                    </Button>,
                    <Button
                      aria-label={`${finalAction} ${skill.key}`}
                      key="lifecycle"
                      onClick={() =>
                        showStaticAction(`${finalAction} Skill ${skill.key}`)
                      }
                      size="small"
                      type="link"
                    >
                      {finalAction}
                    </Button>,
                  ]}
                  aria-label={`${skill.key} 技能卡片`}
                  className={styles.card}
                  colSpan={{ xs: 24, sm: 12, lg: 8 }}
                  key={skill.key}
                  role="article"
                  title={
                    <div className={styles.cardTitle}>
                      <span>{skill.name}</span>
                      <SemanticTag {...statusMeta} />
                    </div>
                  }
                >
                  <div className={styles.cardBody}>
                    <p className={styles.description}>{skill.description}</p>
                    <dl className={styles.metadata}>
                      <dt className={styles.metadataLabel}>Key</dt>
                      <dd className={`${styles.metadataValue} ${styles.code}`}>
                        {skill.key}
                      </dd>
                      <dt className={styles.metadataLabel}>版本</dt>
                      <dd className={`${styles.metadataValue} ${styles.code}`}>
                        {skill.version}
                      </dd>
                      <dt className={styles.metadataLabel}>Owner</dt>
                      <dd className={styles.metadataValue}>{skill.owner}</dd>
                      <dt className={styles.metadataLabel}>更新时间</dt>
                      <dd className={styles.metadataValue}>
                        {skill.updatedAt}
                      </dd>
                    </dl>
                  </div>
                </ProCard>
              );
            })}
          </ProCard.Group>
        </section>

        {modalState ? (
          <SkillModal
            onClose={() => setModalState(null)}
            open
            skill={modalState.mode === 'edit' ? modalState.skill : undefined}
          />
        ) : null}
      </div>
    </PageContainer>
  );
}
