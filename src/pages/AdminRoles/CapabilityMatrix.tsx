import { ProCard } from '@ant-design/pro-components';
import { Button, Checkbox, Space } from 'antd';
import { SemanticTag } from '@/components/SemanticTag';
import { CAPABILITY_GROUPS } from './constant';
import { useStyles } from './index.style';
import type { RoleFixture } from './type';

interface CapabilityMatrixProps {
  role: RoleFixture;
  selectedCapabilities: string[];
  onChange: (capabilities: string[]) => void;
  onDelete: () => void;
  onSave: () => void;
}

export function CapabilityMatrix({
  role,
  selectedCapabilities,
  onChange,
  onDelete,
  onSave,
}: CapabilityMatrixProps) {
  const { styles } = useStyles();

  return (
    <section
      aria-label={`${role.name} Capability 矩阵`}
      className={styles.matrix}
    >
      <ProCard className={styles.card}>
        <header className={styles.matrixHeader}>
          <div className={styles.matrixTitleBlock}>
            <h2 className={styles.matrixTitle}>{role.name}</h2>
            <p className={styles.matrixDescription}>{role.description}</p>
          </div>
          <div className={styles.matrixTags}>
            <SemanticTag label={`${role.memberCount} 名成员`} tone="neutral" />
            <SemanticTag
              label={`${selectedCapabilities.length} 项 Capability`}
              tone="brand"
            />
          </div>
        </header>

        <div className={styles.capabilityGrid}>
          {CAPABILITY_GROUPS.map((group) => (
            <fieldset className={styles.capabilityGroup} key={group.key}>
              <legend className={styles.capabilityLegend}>{group.title}</legend>
              <p className={styles.capabilityDescription}>
                {group.description}
              </p>
              <Checkbox.Group<string>
                className={styles.checkboxGroup}
                onChange={(groupCapabilities) => {
                  const groupCapabilityIds = new Set<string>(
                    group.capabilities.map((capability) => capability.id),
                  );
                  onChange([
                    ...selectedCapabilities.filter(
                      (capability) => !groupCapabilityIds.has(capability),
                    ),
                    ...groupCapabilities,
                  ]);
                }}
                value={selectedCapabilities}
              >
                {group.capabilities.map((capability) => (
                  <Checkbox
                    className={styles.checkboxOption}
                    key={capability.id}
                    value={capability.id}
                  >
                    <span className={styles.optionBody}>
                      <span className={styles.optionLabel}>
                        {capability.label}
                      </span>
                      <span className={styles.capabilityCode}>
                        {capability.id}
                      </span>
                    </span>
                  </Checkbox>
                ))}
              </Checkbox.Group>
            </fieldset>
          ))}
        </div>

        <footer className={styles.matrixFooter}>
          <p className={styles.boundaryNote}>
            当前勾选仅为页面临时状态；真实授权由服务端按 Capability、Scope
            与当前资源关系判定。
          </p>
          <Space wrap>
            <Button danger onClick={onDelete}>
              删除角色
            </Button>
            <Button onClick={onSave} type="primary">
              保存变更
            </Button>
          </Space>
        </footer>
      </ProCard>
    </section>
  );
}
