import { LockOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { Button, Typography } from 'antd';
import clsx from 'clsx';
import { useMemo, useState } from 'react';
import { SemanticTag } from '@/components/SemanticTag';
import { useStaticPrototypeAction } from '@/hooks/useStaticPrototypeAction';
import { SKILL_ITEMS, SKILL_STATUS_META, SKILL_TYPE_META } from './constant';
import { useStyles } from './index.style';
import { SkillCreateModal } from './SkillCreateModal';
import { SkillModal } from './SkillModal';
import type { SkillItem } from './type';
import { getPreviousVersions } from './version';

type SkillModalState =
  | { mode: 'create' }
  | { mode: 'manual' }
  | { mode: 'edit'; skill: SkillItem }
  | null;

const SKILL_TYPE_ORDER = ['SDD 方法', '仓库规范', '平台默认'] as const;

function getSkillMarkdown(skill: SkillItem) {
  return `# ${skill.name}

> 版本 ${skill.version} · 适用：${skill.stack}

## 目标
${skill.content}

## 规则
1. 目录结构遵循平台脚手架约定
2. 提交信息使用 Conventional Commits
3. 新增代码必须附带单元测试，覆盖率不低于 80%
4. 禁止绕过 lint 与类型检查提交

## 校验
CI 执行 lint / test / build 三段流水线，未通过禁止合并；违规项由 Agent 在 MR 描述中逐条说明。`;
}

export default function AdminSkillsPage() {
  const { styles } = useStyles();
  const showStaticAction = useStaticPrototypeAction();
  const [selectedSkill, setSelectedSkill] = useState<SkillItem>(SKILL_ITEMS[0]);
  const [modalState, setModalState] = useState<SkillModalState>(null);
  const skillGroups = useMemo(
    () =>
      SKILL_TYPE_ORDER.map((type) => ({
        items: SKILL_ITEMS.filter((skill) => skill.type === type),
        type,
      })),
    [],
  );
  const previousVersions = getPreviousVersions(selectedSkill.version);
  const statusMeta = SKILL_STATUS_META[selectedSkill.status];
  const typeMeta = SKILL_TYPE_META[selectedSkill.type];

  return (
    <PageContainer ghost pageHeaderRender={false}>
      <div className={styles.page}>
        <div className={styles.toolbar}>
          <Typography.Text type="secondary">
            SDD 方法与仓库规范技能随版本包发布；Agent
            按仓库技术栈自动匹配，执行启动时版本冻结进 Binding（执行绑定）
          </Typography.Text>
          <Button
            onClick={() => setModalState({ mode: 'create' })}
            type="primary"
          >
            新建技能
          </Button>
        </div>

        <div className={styles.masterDetail}>
          <section aria-label="技能目录" className={styles.catalog}>
            {skillGroups.map((group) => (
              <div className={styles.catalogGroup} key={group.type}>
                <header className={styles.catalogGroupHeader}>
                  <strong>{group.type}</strong>
                  <span>{group.items.length}</span>
                </header>
                <ul className={styles.catalogList}>
                  {group.items.map((skill) => (
                    <li key={skill.key}>
                      <Button
                        aria-label={`选择技能 ${skill.key}`}
                        aria-pressed={skill.key === selectedSkill.key}
                        className={clsx(
                          styles.catalogButton,
                          skill.key === selectedSkill.key &&
                            styles.catalogButtonActive,
                        )}
                        onClick={() => setSelectedSkill(skill)}
                        type="text"
                      >
                        <span
                          aria-hidden
                          className={clsx(
                            styles.statusDot,
                            skill.status === 'active' && styles.statusDotActive,
                          )}
                        />
                        <span className={styles.catalogName}>{skill.name}</span>
                        <span className={styles.code}>{skill.version}</span>
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>

          <section
            aria-label={`${selectedSkill.key} 技能详情`}
            className={styles.detail}
          >
            <header className={styles.detailHeader}>
              <div className={styles.detailTitleRow}>
                <h2 className={styles.detailTitle}>{selectedSkill.name}</h2>
                <SemanticTag {...typeMeta} />
                <SemanticTag {...statusMeta} />
                {selectedSkill.locked ? (
                  <span
                    aria-label="平台默认，受保护"
                    className={styles.protectedBadge}
                    role="img"
                  >
                    <LockOutlined aria-hidden /> 平台默认 · 受保护
                  </span>
                ) : null}
                <span className={styles.detailActions}>
                  <Button
                    aria-label={`编辑 / 发版 ${selectedSkill.key}`}
                    onClick={() =>
                      setModalState({ mode: 'edit', skill: selectedSkill })
                    }
                    size="small"
                    type="link"
                  >
                    编辑 / 发版
                  </Button>
                  <Button
                    aria-label={`${statusMeta.label}切换 ${selectedSkill.key}`}
                    onClick={() =>
                      showStaticAction(
                        `${statusMeta.label}切换 Skill ${selectedSkill.key}`,
                      )
                    }
                    size="small"
                    type="link"
                  >
                    {selectedSkill.status === 'active' ? '禁用' : '启用'}
                  </Button>
                  <Button
                    aria-label={`归档 ${selectedSkill.key}`}
                    disabled={selectedSkill.locked}
                    onClick={
                      selectedSkill.locked
                        ? undefined
                        : () =>
                            showStaticAction(`归档 Skill ${selectedSkill.key}`)
                    }
                    size="small"
                    title={
                      selectedSkill.locked
                        ? '平台默认技能受保护，不可归档'
                        : undefined
                    }
                    type="link"
                  >
                    归档
                  </Button>
                </span>
              </div>
              <p className={styles.detailMeta}>
                版本{' '}
                <span className={styles.code}>{selectedSkill.version}</span> ·
                适用 {selectedSkill.stack} · 使用范围 {selectedSkill.usage}
              </p>
            </header>

            <div className={styles.contentGrid}>
              <article className={styles.sourceCard}>
                <header className={styles.cardHeader}>
                  <h3 className={styles.cardTitle}>规范原文</h3>
                  <span className={styles.code}>
                    skill.md · {selectedSkill.version}
                  </span>
                </header>
                <pre className={styles.skillSource}>
                  {getSkillMarkdown(selectedSkill)}
                </pre>
              </article>

              <aside className={styles.historyCard}>
                <h3 className={styles.cardTitle}>版本历史</h3>
                <ol className={styles.historyList}>
                  <li className={styles.historyItem}>
                    <span aria-hidden className={styles.historyDot} />
                    <span>
                      <strong className={styles.code}>
                        {selectedSkill.version}
                      </strong>{' '}
                      <SemanticTag label="生效中" tone="success" />
                      <span className={styles.historyNote}>当前生效版本</span>
                      <span className={styles.historyMeta}>
                        07-30 14:02 · 康宁
                      </span>
                    </span>
                  </li>
                  {previousVersions.map((previousVersion) => (
                    <li className={styles.historyItem} key={previousVersion}>
                      <span aria-hidden className={styles.historyDot} />
                      <span>
                        <strong className={styles.code}>
                          {previousVersion}
                        </strong>
                        <span className={styles.historyNote}>初始导入</span>
                        <span className={styles.historyMeta}>
                          06-18 10:20 · 康宁
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
              </aside>
            </div>
          </section>
        </div>

        {modalState?.mode === 'create' ? (
          <SkillCreateModal
            onClose={() => setModalState(null)}
            onManual={() => setModalState({ mode: 'manual' })}
            open
          />
        ) : null}

        {modalState && modalState.mode !== 'create' ? (
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
