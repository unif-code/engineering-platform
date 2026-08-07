# 实施路线图

> 文档层级：L1 路线图
> 规范事实源：[实施路线图详细说明](./implementation-roadmap-detail.md)
> 容量事实源：[环境容量与服务器规划](./environment-capacity-plan.md)

## 路线图定位

本文是 V0.1～V1.0 Capability Release、环境推广与 Launch Profile 的统一导航。00～11 定义稳定的目标架构 Contract；本文及对应 detail 只决定哪些能力进入哪个 Release、当前实施状态以及候选制品走到哪个 Promotion 阶段，不改变领域 owner 的业务、安全或运行规则。

GitOps Desired State、Platform Configuration Snapshot（PCS）和 Operations Read Model 共同证明各 Platform Environment 的实际部署状态。路线图状态不能替代这些运行证据。

## 三条正交轴

**Capability Release | Environment Promotion | Reliability/Capacity Profile** 是三条互不推导、互不替代的轴。

| 轴 | 回答的问题 | 状态或选择 | 不代表 |
| --- | --- | --- | --- |
| Capability Release | 哪组用户旅程与 Capability Package 通过 Release Gate？ | V0.1、V0.2、V0.3、V0.4、V0.5、V1.0 及独立实现状态 | 已部署到某个环境 |
| Environment Promotion | 同一候选 Image Digest/Bundle 经验证后位于哪一推广阶段？ | `NOT_DEPLOYED`、`DEV_ACCEPTED`、`PROD_CANDIDATE`、`PROD_RELEASED` | 新增产品功能或创建新版本 |
| Reliability/Capacity Profile | 当前验收选择哪一可靠性与容量场景？ | 单节点 DEV、分阶段 Agent Sandbox、Compact Launch 或触发后的 Hardened Target Profile | 某套拓扑已经实际运行 |

DEV 与 PROD 是彼此隔离的 Platform Environment，不是产品版本。一个版本实现完成，不自动成为 `DEV_ACCEPTED`；候选制品在 DEV 验收通过，也不自动成为 `PROD_RELEASED`。Profile 是验收和采购选择，不是 Observed State。

## 纵向里程碑依赖图

```text
Capability Release

V0.1 可运行基础
  └──> V0.2 访问治理闭环
         └──> V0.3 人工交付闭环
                └──> V0.4 Agent 纵向试点
                       └──> V0.5 Production Candidate
                              └──> V1.0 首次正式发布
                                    （不增加功能）

V0.5 已在 DEV 验收的同一 Image Digest/Bundle
  └── DEV_ACCEPTED ──> PROD_CANDIDATE ──> PROD_RELEASED
                         V1.0 只执行 Promotion，不重新构建
```

V0.1～V0.5 依次形成可验收的纵向能力；后一个里程碑依赖前一个已通过的 Release Gate。V1.0 的 Capability Scope 与 V0.5 Production Candidate 相同，只把 DEV 已验收的候选制品与兼容配置 Promotion 到独立 PROD，并完成 PROD Release Gate。

## Gate 与能力启用

| Gate 类别 | 在路线图中的作用 | 失败结果 |
| --- | --- | --- |
| Release Gate | 判断某个版本定义的用户旅程、范围和证据是否达到可接受状态。 | 版本不能标记为 `ACCEPTED`，候选制品不能进入下一 Promotion 阶段。 |
| Capability Activation Gate | 判断已实现能力是否满足其完整目标 Contract 并可在指定环境启用。 | Capability 保持关闭；不能以半成品或降级安全边界绕过。 |
| Evolution Trigger | 根据上线后的容量、可靠性、成本或运维证据决定是否进入增强 Profile 或目标演进。 | 保持当前已验证 Profile，通过排队、拒绝或安全停止守住 Ceiling。 |

Release Gate 不替代领域 Contract；每个 Gate 的具体判定仍回链 00～11 的规范 owner。未被当前 Release 选入或未通过 Capability Activation Gate 的目标能力必须保持关闭。

## 里程碑导航

| 里程碑 | 纵向结果 | Profile 导航 |
| --- | --- | --- |
| V0.1 可运行基础 | 建立可部署、可观察、可备份恢复的平台基础。 | [V0.1～V0.3 单节点基线](./environment-capacity-plan.md#5-v01v03-单节点基线) |
| V0.2 访问治理闭环 | 建立身份、组织、Workspace、授权和 Audit 闭环。 | [V0.1～V0.3 单节点基线](./environment-capacity-plan.md#5-v01v03-单节点基线) |
| V0.3 人工交付闭环 | 建立 Requirement、SDD、人工 Gate、Git/MR 与交付证据闭环。 | [V0.1～V0.3 单节点基线](./environment-capacity-plan.md#5-v01v03-单节点基线) |
| V0.4 Agent 纵向试点 | 建立单仓 `fix` Agent 的受控执行、Sandbox 与交付闭环。 | [V0.x 渐进式采购与部署](./environment-capacity-plan.md#4-v0x-渐进式采购与部署) |
| V0.5 Production Candidate | 在 DEV 完成首发范围的安全、容量、恢复与发布候选验收。 | [V1.0 Compact Launch Profile](./environment-capacity-plan.md#6-v10-compact-launch-profile) |
| V1.0 首次正式发布 | 将 V0.5 同一候选制品 Promotion 到 PROD，服务首批 Launch 人群。 | [首批 10 人配置](./environment-capacity-plan.md#63-首批-10-人配置) |

每个版本的用户旅程、包含/不包含范围、依赖、Release Gate、验收证据及当前状态只在[实施路线图详细说明](./implementation-roadmap-detail.md)维护。Profile 的服务器规格、人数场景、计算方法和采购计划只在[环境容量与服务器规划](./environment-capacity-plan.md)维护。
