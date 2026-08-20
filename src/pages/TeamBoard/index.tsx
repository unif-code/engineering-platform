import { Bar, Column } from '@ant-design/charts';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import { Button, Progress, Segmented, Typography, theme } from 'antd';
import { useState } from 'react';
import { MetricCard } from '@/components/MetricCard';
import { SemanticTag } from '@/components/SemanticTag';
import { useStaticPrototypeAction } from '@/hooks/useStaticPrototypeAction';
import { TEAM_FIXTURES, TEAM_OPTIONS } from './constant';
import { useStyles } from './index.style';
import type { TeamBoardFixture, TeamName } from './type';
import { formatChartValue } from './util';

const DEFAULT_TEAM = TEAM_FIXTURES[0];
const TEAM_BY_NAME: Record<TeamName, TeamBoardFixture> = {
  中台: TEAM_FIXTURES[2],
  交易: TEAM_FIXTURES[1],
  营销: DEFAULT_TEAM,
};

export default function TeamBoardPage() {
  const { styles } = useStyles();
  const { token } = theme.useToken();
  const showStaticAction = useStaticPrototypeAction();
  const [selectedTeam, setSelectedTeam] =
    useState<TeamBoardFixture>(DEFAULT_TEAM);

  return (
    <PageContainer ghost pageHeaderRender={false}>
      <div className={styles.page}>
        <div className={styles.toolbar}>
          <Segmented<TeamName>
            aria-label="选择团队"
            className={styles.teamSelector}
            name="team-board-selector"
            onChange={(teamName) => setSelectedTeam(TEAM_BY_NAME[teamName])}
            options={TEAM_OPTIONS}
            size="small"
            value={selectedTeam.name}
          />
          <Typography.Text type="secondary">
            经理及以上可跨 Team 查看 · 数据为 Read Model 投影
          </Typography.Text>
        </div>

        <section
          aria-label={`${selectedTeam.name} KPI`}
          className={styles.metricsGrid}
        >
          {selectedTeam.metrics.map((metric) => (
            <article
              aria-label={`${metric.title}：${metric.value}`}
              key={metric.key}
            >
              <MetricCard
                description={metric.description}
                title={metric.title}
                tone={metric.tone}
                value={metric.value}
              />
            </article>
          ))}
        </section>

        <div className={styles.analysisGrid}>
          <ProCard className={styles.card} title="任务吞吐 · 近 8 周完成数">
            <figure
              aria-label={`${selectedTeam.name}近八周吞吐`}
              className={styles.chartFigure}
            >
              <Column
                animate={false}
                axis={{ x: { title: false }, y: false }}
                data={[...selectedTeam.throughput]}
                height={180}
                label={{ position: 'top', text: 'value' }}
                style={{ fill: token.colorPrimary }}
                xField="label"
                yField="value"
              />
            </figure>
          </ProCard>

          <ProCard className={styles.card} title="进行中任务 · 阶段分布">
            <figure
              aria-label={`${selectedTeam.name}阶段分布`}
              className={styles.chartFigure}
            >
              <Bar
                animate={false}
                axis={{ x: false, y: { title: false } }}
                colorField="label"
                data={[...selectedTeam.distribution]}
                height={180}
                label={{ position: 'right', text: 'value' }}
                legend={false}
                scale={{
                  color: {
                    range: [
                      token.colorInfo,
                      token.colorWarning,
                      token.colorPrimary,
                      token.purple6,
                      token.colorSuccess,
                    ],
                  },
                }}
                xField="value"
                yField="label"
              />
            </figure>
          </ProCard>
        </div>

        <div className={styles.analysisGrid}>
          <ProCard className={styles.card} title="成员负载 · 进行中任务数">
            <ul
              aria-label={`${selectedTeam.name}成员负载`}
              className={styles.list}
            >
              {selectedTeam.members.map((member) => (
                <li
                  aria-label={`${member.name}：${member.activeTasks} 项，Agent 参与率 ${member.agentParticipation}%`}
                  className={styles.memberItem}
                  key={member.key}
                >
                  <div className={styles.memberHeader}>
                    <strong>{member.name}</strong>
                    <div className={styles.memberMeta}>
                      <Typography.Text type="secondary">
                        {member.activeTasks} 项
                      </Typography.Text>
                      {member.overloaded ? (
                        <SemanticTag label="过载" tone="danger" />
                      ) : null}
                    </div>
                  </div>
                  <Progress
                    aria-label={`${member.name} 进行中任务 ${member.activeTasks} 项`}
                    percent={Math.round((member.activeTasks / 6) * 100)}
                    showInfo={false}
                    size="small"
                    status={member.overloaded ? 'exception' : 'normal'}
                  />
                  <div className={styles.participationRow}>
                    <Typography.Text type="secondary">
                      Agent 参与率
                    </Typography.Text>
                    <Progress
                      aria-label={`${member.name} Agent 参与率 ${member.agentParticipation}%`}
                      className={styles.participationProgress}
                      percent={member.agentParticipation}
                      size="small"
                    />
                  </div>
                </li>
              ))}
            </ul>
          </ProCard>

          <div className={styles.rightStack}>
            <ProCard className={styles.card} title="合并请求处理周期">
              <figure
                aria-label={`${selectedTeam.name}合并请求处理周期`}
                className={styles.chartFigure}
              >
                <Typography.Text type="secondary">
                  从合并请求创建到合并 · 周均 · 当前{' '}
                  <strong className={styles.mergeAverage}>
                    {selectedTeam.mergeCycleAverage}
                  </strong>
                </Typography.Text>
                <Column
                  animate={false}
                  axis={false}
                  data={[...selectedTeam.mergeCycle]}
                  height={96}
                  label={{
                    position: 'top',
                    text: formatChartValue,
                  }}
                  style={{ fill: token.colorInfo }}
                  xField="label"
                  yField="value"
                />
              </figure>
            </ProCard>

            <ProCard className={styles.card} title="阻塞 / 异常任务">
              <ul
                aria-label={`${selectedTeam.name}阻塞事项`}
                className={styles.list}
              >
                {selectedTeam.blockers.length === 0 ? (
                  <li className={styles.emptyBlocker}>当前无阻塞任务 ✓</li>
                ) : (
                  selectedTeam.blockers.map((blocker) => (
                    <li className={styles.blockerItem} key={blocker.key}>
                      <Button
                        aria-label={`处理阻塞：${blocker.title}`}
                        block
                        className={styles.blockerButton}
                        onClick={() =>
                          showStaticAction(`处理阻塞 ${blocker.title}`)
                        }
                        type="text"
                      >
                        <div className={styles.blockerHeader}>
                          <strong>{blocker.title}</strong>
                          <SemanticTag
                            label={blocker.status}
                            tone={blocker.tone}
                          />
                        </div>
                        <p className={styles.blockerDescription}>
                          {blocker.description}
                        </p>
                      </Button>
                    </li>
                  ))
                )}
              </ul>
            </ProCard>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
