import { PageContainer } from '@ant-design/pro-components';
import { Button, Empty, Tooltip, Typography } from 'antd';
import { useStyles } from './index.style';

const EMPTY_DESCRIPTION = '当前没有真实数据';
const UNAVAILABLE_TITLE = '当前版本暂未接入';

function CapabilityRegion({ name }: { name: string }) {
  const { styles } = useStyles();

  return (
    <section aria-label={name} className={styles.capabilityRegion}>
      <Typography.Title className={styles.sectionTitle} level={3}>
        {name}
      </Typography.Title>
      <Empty description={EMPTY_DESCRIPTION} />
    </section>
  );
}

export default function AdminRolesPage() {
  const { styles } = useStyles();

  return (
    <PageContainer ghost pageHeaderRender={false}>
      <main className={styles.masterDetail}>
        <nav aria-label="角色列表" className={styles.roleList}>
          <header className={styles.selectorHeadingRow}>
            <Typography.Title className={styles.selectorHeading} level={2}>
              角色（能力标签）
            </Typography.Title>
            <Tooltip title={UNAVAILABLE_TITLE}>
              <Button
                aria-label="新建角色"
                disabled
                size="small"
                title={UNAVAILABLE_TITLE}
                type="link"
              >
                ＋ 新建
              </Button>
            </Tooltip>
          </header>
          <Empty description={EMPTY_DESCRIPTION} />
          <Typography.Paragraph className={styles.roleNote} type="secondary">
            角色只是标签：能力可自由组合授予任何角色。授权结论来自服务端
            Capability + Scope + Assignment。
          </Typography.Paragraph>
        </nav>

        <section aria-label="角色能力配置" className={styles.matrix}>
          <Typography.Title className={styles.matrixTitle} level={2}>
            角色能力配置
          </Typography.Title>
          <Typography.Paragraph type="secondary">
            勾选即授予；持有该角色的登录用户菜单与按钮即时变化。
          </Typography.Paragraph>
          <div className={styles.capabilitySections}>
            <CapabilityRegion name="业务能力" />
            <CapabilityRegion name="观测能力" />
            <CapabilityRegion name="管理端能力" />
          </div>
        </section>
      </main>
    </PageContainer>
  );
}
