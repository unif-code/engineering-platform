import { Button, Checkbox } from 'antd';
import { SemanticTag } from '@/components/SemanticTag';
import { CAPABILITY_GROUPS } from './constant';
import { useStyles } from './index.style';
import type { RoleFixture } from './type';

interface CapabilityMatrixProps {
  role: RoleFixture;
  selectedCapabilities: string[];
  onChange: (capabilities: string[]) => void;
  onDelete: () => void;
}

export function CapabilityMatrix({
  role,
  selectedCapabilities,
  onChange,
  onDelete,
}: CapabilityMatrixProps) {
  const { styles } = useStyles();

  return (
    <section aria-label={`${role.name}能力配置`} className={styles.matrix}>
      <header className={styles.matrixHeader}>
        <h2 className={styles.matrixTitle}>「{role.name}」的能力配置</h2>
        {role.locked ? (
          <SemanticTag
            label="超级管理员默认拥有全部能力 · 不允许删除或修改"
            tone="brand"
          />
        ) : null}
        <Button
          className={styles.deleteButton}
          danger
          disabled={role.locked}
          onClick={onDelete}
          size="small"
        >
          删除角色
        </Button>
      </header>
      <p className={styles.matrixDescription}>
        勾选即授予；持有该角色的登录用户菜单与按钮即时变化（可用右下角切换器验证）
      </p>
      <p className={styles.staticPreviewNote} role="note">
        静态预览 · 当前勾选仅在本页面临时生效，不写入服务端
      </p>

      <div className={styles.capabilitySections}>
        {CAPABILITY_GROUPS.map((group) => (
          <fieldset className={styles.capabilityGroup} key={group.key}>
            <legend className={styles.capabilityLegend}>{group.title}</legend>
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
                  disabled={role.locked}
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
    </section>
  );
}
