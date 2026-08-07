# Configuration Governance

> 文档层级：L1 架构地图
> 规范事实源：[Configuration Governance 详细说明](./configuration-governance-detail.md)

## 目标与边界

本主题定义平台通用 Typed Configuration 的分类、生命周期、Effective Snapshot、兼容演进与 DEV→PROD Promotion。Configuration 位于 `backend/control_plane/app/modules/configuration/`，是 Python Control Plane 模块化单体中的独立领域模块，不是独立 Deployable 或既有微服务。

本文描述完整 Target Architecture，不记录 Release 版本、实施状态、环境 Promotion 状态或 Capacity Profile 选择；这些事实只见[实施路线图](../12-implementation-roadmap/implementation-roadmap.md)。

各领域模块拥有自己的 Namespace、Typed Schema、已发布 Policy 数据、默认值、约束、Reader/Migrator、解析器和业务解释；Configuration Governance 统一拥有 Draft、Publish、Rollback、Effective Snapshot 与增强治理协议，禁止各模块建立平行配置工作流。

Super Admin、配置管理资格、TOTP Challenge 和恢复授权由[身份、组织与授权](../01-identity-organization-authorization/identity-organization-authorization-detail.md)拥有；Web、Control Plane 装配、Port/Adapter 与管理入口由[平台应用与集成](../06-platform-application-integration/platform-application-integration-detail.md)拥有。

## 配置分类与事实通道

| 分类 | 权威通道 | 平台边界 |
| --- | --- | --- |
| `PLATFORM_POLICY` | 对应模块 PostgreSQL 与受控后台发布 | 产生版本化 Effective Snapshot |
| `GITOPS_CONFIG` | Git、Helm、Manifest 与 Reconcile | 后台只读展示 Desired、Effective 与 Drift |
| `SYSTEM_INVARIANT` | 代码、数据库约束和安全规则 | 只读且不可通过配置降级 |

Configuration Catalog 只聚合注册的 Typed Schema，不提供通用 Key/Value、任意 JSON、SQL、表达式或脚本编辑能力。Secret 明文和可直接使用的认证材料不进入 Catalog、Draft、Bundle、Audit 或 PostgreSQL。

## 生命周期概览

```text
Typed Schema + Active Snapshot
→ Draft / Clone / Takeover
→ Validation + Impact Preview
→ Publish（不可变新版本并立即激活）
→ Effective Snapshot + Outbox

Base 过期 → Stale → Schema-aware Three-way Rebase
Rollback → 从历史 Snapshot 创建新 Draft → 重新发布更高版本
```

Typed Schema、仅 Super Admin 管理、服务端 Validation、Publish、不可变 Effective Snapshot、Audit 与 Rollback 构成基础生命周期。Draft Takeover、Schema-aware Three-way Rebase、DEV→PROD Bundle Promotion、Lineage High-water 与 Divergence Review 是增强 Contract；未启用增强能力时不得以简化实现绕过基础生命周期。

Draft 不参与运行时解析；Published Version、Policy Snapshot 与历史来源不可原地修改。发布、回滚和跨环境导入始终重新校验当前权限、Schema、依赖、并发条件、安全下限与 Content Hash。

## Effective Snapshot 与消费关系

运行时只读取当前 Active Snapshot，不回放 Delta。需要冻结语义的 Requirement、Gate、Attempt、Artifact、Upload Session 或调度对象在建立时保存适用的 Effective Snapshot 与 Composite Revision，后续配置发布不能重写既有事实。

Configuration 模块拥有 Catalog、跨模块治理数据与公开 Configuration Facade，并通过注册的 Port 编排 Namespace owner；领域模块在自己的 Schema 与事务中拥有 Draft、Published Version、Active Pointer 和 Policy Snapshot，执行校验、发布与解析。运行时通过稳定 Contract 取得 Effective Policy；Configuration 不直写其他模块表，也不能绕过领域 Guard、Capability、Assignment、Human Gate、GitOps 或 `SYSTEM_INVARIANT`。

## 增强 Contract：DEV→PROD Promotion

DEV→PROD 只传递来自不可变 Published ChangeSet 的签名 Typed Change Intent。Bundle 不复制数据库、Draft、运行缓存、业务数据或 Secret，也不建立跨环境数据库连接、内部写 API、共享凭据、运行时读取或自动同步。

PROD 主动导入并重新完成验签、Schema、Scope/Reference Mapping、安全下限、Validation、Impact Preview、Divergence Review、TOTP 与 Publish。Source Lineage、High-water Mark、Signing Key 生命周期和有意环境差异均保留不可变来源链，不能因恢复、轮换或回滚静默清零。

## 不变量

1. 配置分类、权威通道与可变性不能由 Catalog Metadata 降级。
2. Published Version 与 Effective Snapshot 始终不可变、可追溯并绑定准确版本与 Hash。
3. Frontend、脚本、旧缓存或 Projection 不能自行决定当前有效配置。
4. DEV 与 PROD 不共享运行状态；Promotion 不是同步、复制或回滚通道。
5. 各领域拥有 Namespace 的 Policy 数据与业务语义；Configuration Governance 拥有通用治理协议，不建立集中式跨模块事务。
6. Configuration 是模块化单体中的领域模块，不形成独立 Deployable 或微服务。
7. 12 只选择 Capacity Profile；10 拥有已发布 Policy 的有效值与生命周期；09 只校验配置影响是否越过物理 Ceiling，三者不得形成平行配置事实源。
