import { useStyles } from './index.style';

export function PreviewFrame() {
  const { styles } = useStyles();

  return (
    <section aria-label="Sandbox Preview" className={styles.previewFrame}>
      <div className={styles.previewToolbar}>
        <span aria-hidden="true" className={styles.previewDot} />
        <span aria-hidden="true" className={styles.previewDot} />
        <span aria-hidden="true" className={styles.previewDot} />
        <span>Sandbox Preview · light</span>
      </div>
      <div className={styles.previewCanvas}>
        <div className={styles.previewHero}>
          <div className={styles.previewEyebrow}>ENGINEERING PLATFORM</div>
          <h3 className={styles.previewTitle}>统一任务创建链路</h3>
          <p className={styles.previewDescription}>
            隔离的浅色静态页面示意，不执行脚本或远程请求。
          </p>
        </div>
      </div>
    </section>
  );
}
