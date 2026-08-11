import { PageContainer, ProList } from '@ant-design/pro-components';
import { Button } from 'antd';
import clsx from 'clsx';
import { useState } from 'react';
import { SemanticTag } from '@/components/SemanticTag';
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
    <PageContainer
      extra={[
        <Button key="create" onClick={() => setModalOpen(true)} type="primary">
          新建 Role
        </Button>,
      ]}
      ghost
      subTitle="维护 Role 的 Capability 模板；当前页面为静态数据投影"
      title="角色管理"
    >
      <div className={styles.page}>
        <div className={styles.masterDetail}>
          <nav aria-label="角色列表" className={styles.roleList}>
            <ProList<RoleFixture>
              cardProps={{ className: styles.card }}
              dataSource={[...ROLE_FIXTURES]}
              headerTitle={
                <div className={styles.selectorTitle}>
                  <h2 className={styles.selectorHeading}>Roles</h2>
                  <span className={styles.selectorHint}>
                    选择 Role 查看 Capability 模板
                  </span>
                </div>
              }
              itemRender={(role) => {
                const selected = role.id === selectedRole.id;

                return (
                  <Button
                    aria-pressed={selected}
                    block
                    className={clsx(
                      styles.roleButton,
                      selected && styles.roleButtonActive,
                    )}
                    onClick={() => selectRole(role)}
                    type="text"
                  >
                    <span className={styles.roleButtonContent}>
                      <span className={styles.roleTitleRow}>
                        <span className={styles.roleName}>{role.name}</span>
                        <SemanticTag
                          label={selected ? '当前' : `${role.memberCount} 人`}
                          tone={selected ? 'brand' : 'neutral'}
                        />
                      </span>
                      <span className={styles.roleDescription}>
                        {role.description}
                      </span>
                    </span>
                  </Button>
                );
              }}
              pagination={false}
              rowKey="id"
              split={false}
            />
          </nav>

          <CapabilityMatrix
            onChange={setSelectedCapabilities}
            onDelete={() => showStaticAction(`删除角色 ${selectedRole.name}`)}
            onSave={() => showStaticAction(`保存角色 ${selectedRole.name}`)}
            role={selectedRole}
            selectedCapabilities={selectedCapabilities}
          />
        </div>

        {modalOpen ? (
          <RoleModal onClose={() => setModalOpen(false)} open />
        ) : null}
      </div>
    </PageContainer>
  );
}
