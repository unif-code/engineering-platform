import { LockOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { Button } from 'antd';
import clsx from 'clsx';
import { useState } from 'react';
import { useStaticPrototypeAction } from '@/hooks/useStaticPrototypeAction';
import { CapabilityMatrix } from './CapabilityMatrix';
import { ROLE_FIXTURES } from './constant';
import { useStyles } from './index.style';
import { RoleModal } from './RoleModal';
import type { RoleFixture } from './type';

const DEFAULT_ROLE = ROLE_FIXTURES[0];

export default function AdminRolesPage() {
  const { styles } = useStyles();
  const showStaticAction = useStaticPrototypeAction();
  const [selectedRoleId, setSelectedRoleId] = useState<string>(DEFAULT_ROLE.id);
  const [selectedCapabilities, setSelectedCapabilities] = useState<string[]>(
    () => [...DEFAULT_ROLE.capabilities],
  );
  const [modalOpen, setModalOpen] = useState(false);
  const selectedRole =
    ROLE_FIXTURES.find((role) => role.id === selectedRoleId) ?? DEFAULT_ROLE;

  const selectRole = (role: RoleFixture) => {
    setSelectedRoleId(role.id);
    setSelectedCapabilities([...role.capabilities]);
  };

  return (
    <PageContainer ghost pageHeaderRender={false}>
      <div className={styles.masterDetail}>
        <nav aria-label="角色列表" className={styles.roleList}>
          <div className={styles.selectorHeadingRow}>
            <h2 className={styles.selectorHeading}>角色（能力标签）</h2>
            <Button
              aria-label="新建角色"
              onClick={() => setModalOpen(true)}
              size="small"
              type="link"
            >
              ＋ 新建
            </Button>
          </div>

          {ROLE_FIXTURES.map((role) => {
            const selected = role.id === selectedRole.id;

            return (
              <Button
                aria-pressed={selected}
                block
                className={clsx(
                  styles.roleButton,
                  selected && styles.roleButtonActive,
                )}
                key={role.id}
                onClick={() => selectRole(role)}
                type="text"
              >
                <span className={styles.roleButtonContent}>
                  <span className={styles.roleName}>{role.name}</span>
                  {'locked' in role && role.locked ? (
                    <LockOutlined aria-label="平台保护" />
                  ) : null}
                  <span className={styles.roleMeta}>
                    {role.capabilities.length} 能力 · {role.memberCount} 人
                  </span>
                </span>
              </Button>
            );
          })}

          <p className={styles.roleNote}>
            角色只是标签：能力可自由组合授予任何角色。授权结论来自服务端
            Capability + Scope + Assignment。
          </p>
        </nav>

        <CapabilityMatrix
          onChange={setSelectedCapabilities}
          onDelete={() => showStaticAction(`删除角色 ${selectedRole.name}`)}
          role={selectedRole}
          selectedCapabilities={selectedCapabilities}
        />
      </div>

      {modalOpen ? (
        <RoleModal onClose={() => setModalOpen(false)} open />
      ) : null}
    </PageContainer>
  );
}
