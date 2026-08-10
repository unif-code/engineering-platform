import { PageContainer, ProCard } from '@ant-design/pro-components';
import { Progress, Segmented } from 'antd';
import { useState } from 'react';
import { DistributionBar } from '@/components/DistributionBar';
import { MetricCard } from '@/components/MetricCard';
import { MiniBarChart } from '@/components/MiniBarChart';
import { SemanticTag } from '@/components/SemanticTag';
import { TEAM_FIXTURES, TEAM_OPTIONS } from './constant';
import { useStyles } from './index.style';
import type { TeamName } from './type';

const DEFAULT_TEAM = TEAM_FIXTURES[0];

export default function TeamBoardPage() {
  const { styles } = useStyles();
  const [selectedTeamName, setSelectedTeamName] =
    useState<TeamName>('Platform');
  const selectedTeam =
    TEAM_FIXTURES.find((team) => team.name === selectedTeamName) ??
    DEFAULT_TEAM;

  return (
    <PageContainer
      ghost
      subTitle="按团队查看交付节奏、成员负载与当前阻塞"
      title="团队看板"
    >
      <div className={styles.page}>
        <ProCard className={styles.card}>
          <div className={styles.selectorHeader}>
            <div>
              <h2 className={styles.teamName}>{selectedTeam.name}</h2>
              <p className={styles.teamSummary}>{selectedTeam.summary}</p>
            </div>
            <Segmented<TeamName>
              aria-label="选择团队"
              block
              className={styles.teamSelector}
              name="team-board-selector"
              onChange={setSelectedTeamName}
              options={TEAM_OPTIONS}
              value={selectedTeamName}
            />
          </div>
        </ProCard>

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
          <ProCard className={styles.card} title="七日吞吐">
            <MiniBarChart
              ariaLabel={`${selectedTeam.name} 七日吞吐`}
              data={selectedTeam.throughput}
              highlightKey="sun"
            />
          </ProCard>
          <ProCard className={styles.card} title="阶段分布">
            <DistributionBar
              ariaLabel={`${selectedTeam.name} 阶段分布`}
              items={selectedTeam.distribution}
            />
          </ProCard>
        </div>

        <div className={styles.analysisGrid}>
          <ProCard className={styles.card} title="成员负载">
            <ul
              aria-label={`${selectedTeam.name} 成员负载`}
              className={styles.list}
            >
              {selectedTeam.members.map((member) => (
                <li
                  aria-label={`${member.name}：${member.role}，负载 ${member.load}%`}
                  className={styles.memberItem}
                  key={member.key}
                >
                  <div className={styles.memberHeader}>
                    <div className={styles.memberIdentity}>
                      <strong>{member.name}</strong>
                      <span className={styles.memberRole}>{member.role}</span>
                    </div>
                    <strong className={styles.loadValue}>{member.load}%</strong>
                  </div>
                  <Progress
                    aria-label={`${member.name} 负载 ${member.load}%`}
                    percent={member.load}
                    showInfo={false}
                    size="small"
                  />
                </li>
              ))}
            </ul>
          </ProCard>

          <ProCard className={styles.card} title="阻塞事项">
            <ul
              aria-label={`${selectedTeam.name} 阻塞事项`}
              className={styles.list}
            >
              {selectedTeam.blockers.map((blocker) => (
                <li className={styles.blockerItem} key={blocker.key}>
                  <div className={styles.blockerHeader}>
                    <strong>{blocker.title}</strong>
                    <SemanticTag label={blocker.status} tone={blocker.tone} />
                  </div>
                  <p className={styles.blockerDescription}>
                    {blocker.description}
                  </p>
                </li>
              ))}
            </ul>
          </ProCard>
        </div>
      </div>
    </PageContainer>
  );
}
