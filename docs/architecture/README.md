# 内部研发平台架构文档

本目录是平台架构的唯一文档入口：13 篇主题文档（00～12）+ 1 篇参数附录 + 1 篇治理例外记录。
每篇主题固定四节：目标与边界 / 核心模型 / 关键不变量 / 与其他模块的关系。
离线导航：[平台架构地图](./visuals/platform-architecture-map.html)（只导航，不承载事实）。

## 文档导航

| 编号 | 主题 | 一句职责 |
| --- | --- | --- |
| 00 | [平台总览](./00-platform-overview.md) | 说明 System Context、总体边界和责任链。 |
| 01 | [身份、组织与授权](./01-identity-organization-authorization.md) | 说明身份、组织、成员与服务端授权。 |
| 02 | [Requirement Workflow](./02-requirement-workflow.md) | 说明业务责任、审核、验收与证据。 |
| 03 | [Agent、Skill 与 Model](./03-agent-skill-model.md) | 说明受控执行、模型路由、评测工具链和不可变 Binding。 |
| 04 | [Sandbox Runtime](./04-sandbox-runtime.md) | 说明隔离执行环境、容量与恢复。 |
| 05 | [Source Control 与交付](./05-source-control-delivery.md) | 说明代码绑定、交付证据和 MR 协作。 |
| 06 | [平台应用与集成](./06-platform-application-integration.md) | 说明应用边界、集成、安全公告和运维可见性。 |
| 07 | [数据、消息与存储](./07-data-messaging-storage.md) | 说明数据事实、消息、Artifact 与组件恢复。 |
| 08 | [安全、审计与治理](./08-security-audit-governance.md) | 说明 Trust、Secret、加密、Audit 与安全恢复。 |
| 09 | [基础设施与运维](./09-infrastructure-operations.md) | 说明环境、Flux GitOps、Kubernetes、可观测性、DR 与容量。 |
| 10 | [Configuration Governance](./10-configuration-governance.md) | 说明配置分类、生命周期、Effective Snapshot 与 Promotion。 |
| 11 | [架构基线](./11-architecture-baseline.md) | 索引跨模块不变量、质量场景和三类 Gate。 |
| 12 | [实施路线图](./12-implementation-roadmap.md) | 唯一记录 Release Scope、实施状态、环境 Promotion 与 Profile 选择。 |
| 附录 | [参数附录](./appendix-parameters.md) | 唯一记录全部精确参数与数值。 |
| 例外 | [治理例外记录](./deviations.md) | 唯一记录已批准的目标契约偏差、影响与关闭条件。 |

## 事实所有权矩阵

改任何事实前先在此定位 owner；其他文档只链接、不复制。

| 事实类别 | Owner |
| --- | --- |
| System Context、平台角色、模块边界与责任链总览 | [00](./00-platform-overview.md) |
| 身份、组织、Workspace、成员投影、服务端授权、Super Admin 与 Bootstrap、配置命令资格、Identity 恢复 | [01](./01-identity-organization-authorization.md) |
| Requirement、WorkItem、Route、人工 Gate、责任 Assignment、Decision、Artifact 业务状态、验收与 Baseline Selection | [02](./02-requirement-workflow.md) |
| Agent Definition、Skill Bundle、Model Catalog/Capability/Route、Run/Attempt、Execution Binding、Child 状态与等待、评测工具链、Context/Tool/Network Policy | [03](./03-agent-skill-model.md) |
| Sandbox Environment、Kata 物理隔离、Materialization、资源准入、Capacity Lease 与账本、Sandbox 网络与 Egress、短期 Secret、Preview、Image Build、清理 | [04](./04-sandbox-runtime.md) |
| GitLab Binding、任务分支、Integration/Formal MR、`IntegrationBaselineEvidence`、Review Assignment、Merge 与多仓语义、GitLab 外部事实收敛 | [05](./05-source-control-delivery.md) |
| 前端与 Control Plane 边界、Deployable、Port/Adapter、跨模块一致性、External Provider Binding、Operations Read Model、Console Access、安全公告与外部 Feed Envelope、External Feed Lineage/High-water | [06](./06-platform-application-integration.md) |
| PostgreSQL/Valkey/NATS/Temporal/对象存储事实、Artifact 对象与配额账本、Backup、Retention 执行、组件故障恢复 | [07](./07-data-messaging-storage.md) |
| Trust、Secret、PKI、加密、供应链与文件扫描机制、Provider 信任材料、Audit Envelope 与保留、Break-glass、安全恢复 | [08](./08-security-audit-governance.md) |
| Platform Environment 与 Cloud Binding、PCS、GitOps Desired State、Kubernetes 与 Node Role、网络与 Gateway、存储物理拓扑、物理放置与容量准入、可观测性与告警、Cluster DR、TCO | [09](./09-infrastructure-operations.md) |
| 配置分类、Catalog、Draft/Publish/Rollback/Rebase、Effective Snapshot、`PLATFORM_POLICY` 有效值、Schema 兼容演进、Promotion 与 Divergence、配置 Source Lineage/High-water、Activation Record 持久化 | [10](./10-configuration-governance.md) |
| 跨模块不变量、依赖边界、质量场景、三类 Gate 与 Evolution Trigger 的分类与语义 | [11](./11-architecture-baseline.md) |
| Release Scope、Release Gate 与验收证据、实施状态、环境 Promotion、Capability 阶段选择与 Activation 归属、Profile 选择 | [12](./12-implementation-roadmap.md) |
| 全部精确参数：资源数值、Policy Key、错误码、Port 方法清单、Runtime 组件、容量场景、服务器矩阵与分阶段采购计划 | [附录](./appendix-parameters.md) |
| 已批准的目标契约偏差、影响评估与关闭条件 | [例外](./deviations.md) |

跨 owner 拆分的事实必须双向确认，不能只改一侧：

- Audit：08 拥有 Envelope、可靠提交、脱敏、WORM 与 Retention；各领域只拥有本领域 Trigger 与业务摘要。
- Configuration：10 拥有 Catalog 与通用生命周期协议；各领域拥有本 Namespace 的 Schema、默认值与业务解释。
- 容量：12 选择 Profile，附录拥有数值与服务器矩阵，09 验证物理 Ceiling 与放置，04/07 拥有各自准入账本。
- 交付证据：05 拥有 Evidence 结构、hash 与变化事件；02 拥有交付快照、Selection 冻结与验收失效。
- Artifact：02 拥有业务状态与扫描分支结果，07 拥有对象、Object Version 与双账本预占，08 拥有扫描与保留机制。
- Gate：11 拥有三类 Gate 的分类与语义，12 记录具体 Release Gate 与阶段选择，10 持久化 Activation Record。
- Deployed State 不属于任何文档，只能由环境 GitOps Desired State、PCS 与 Operations Read Model 证据证明。

## 维护规则

1. 改动前先在所有权矩阵定位 owner，只在 owner 文档修改，再更新引用处链接。
2. 参数数值只改参数附录；正文不复制数值，只写定性规则。
3. 每篇保持四节模板；主题文档 ≤150 行（00、12 ≤180）。
4. 不在 README、HTML 地图或外部系统复制规范事实；HTML 地图只做导航（其节点与 Profile 摘要中的数字仅为导航提示，以参数附录为准）。
5. 过期规则直接删除，不保留方案比较、对话记录或历史规则。
6. 本目录任何 `.md` 变化后运行 `pnpm baseline:update` 刷新 [baseline-manifest.json](./baseline-manifest.json)（架构基线号与文档 SHA-256 的唯一事实源），`pnpm lint` 内的 `baseline:check` 会校验一致性。
