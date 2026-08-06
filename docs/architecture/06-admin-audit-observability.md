# 管理端、Audit 与 Observability

> 文档层级：L1 精简版
> 状态：完整架构基线（已批准）
> 更新日期：2026-08-06
> 详细设计：[管理端、Audit 与 Observability 详细设计](./06-admin-audit-observability-detail.md)

## 1. 模块目标

平台管理后台统一承载当前 Platform Environment 的人员、授权、配置、运行状态、Audit、安全公告和专业控制台入口。菜单与 API 由 Capability + Scope 动态授权，不根据“管理员”“Leader”等岗位字符串硬编码。

管理后台不是 Cloud Admin Console、Kubernetes Admin UI 或完整 Observability 产品。业务配置只有 Super Admin 可以发布；基础设施参数只能通过 GitOps/PCS 修改，平台中只读展示。

## 2. 环境与入口

- 单个环境的用户端和管理端使用同一个 Web 构建产物、同一个 Control Plane API、本地用户事实和 Session。
- 当前只部署 DEV；未来 PROD 使用同源代码和组件独立部署。DEV 页面只显示 DEV，PROD 页面只显示 PROD，不提供跨环境切换器。
- 每个环境只有一个 `platform-gateway`。Grafana、Hubble、Temporal、OpenBao 等专业控制台入口从本环境管理后台打开新标签页，不使用 iframe。
- 打开控制台必须再次校验本地 Session、Capability 和 Scope，并通过 Console Access Adapter、Auth Proxy、短期只读身份或目标系统自身登录完成授权；菜单可见不等于目标系统已授权。
- Cloud Account、VPC、NLB、WAF、VPN、NAT、KMS、外部 Backup、Watchdog 和 Provider Audit 只通过签名只读状态 Feed展示；平台不持有 Cloud Admin Credential，也不提供基础设施写按钮。

## 3. 管理功能

- 8 位员工编号账号、随机临时密码、账号状态、正式密码重置、TOTP 重置和 Session 撤销；所有用户必须绑定 TOTP。
- 经理、Leader、普通员工及直属关系；创建 Leader 必选经理，创建普通员工必选 Leader。
- Workspace Owner、受邀Leader、动态正式成员投影与有时效协作关系；只有Owner可以邀请/移除Leader或转让Owner，协作关系不改写正式成员集合。
- Capability、Scope、Assignment、动态菜单和授权版本；岗位只提供创建时默认模板。
- Requirement、WorkItem、SDD/验收/MR Assignment、归档、逻辑删除与恢复的受权视图。
- Agent Attempt、Child Build Execution、Model Route、Runtime/Skill版本、Sandbox Capacity与Artifact状态。
- 平台配置、当前 PCS、Environment Capacity Profile、Provider Binding、Desired/Effective/Drift和变更历史。
- 外部系统与专业控制台的受权入口、健康状态和Runbook链接。

## 4. 配置边界

- 所有 `PLATFORM_POLICY` 只有 Super Admin 通过保留能力 `platform.configuration.manage` 创建 Draft、校验、发布和回滚；不再按配置项划分管理员或风险等级。
- Super Admin 也不能修改 System Invariant、绕过 Human Gate/Capability/Assignment，或从平台页面修改 Kubernetes、Ceph、OpenBao Seal、云账号、网络和其他 `GITOPS_CONFIG`。
- 配置使用 Typed Configuration Catalog，声明类型、单位、默认值、范围、Scope、继承、生效语义、版本、回滚值和敏感标记；不提供任意 JSON、SQL、表达式或脚本入口。
- 所有时间、数量和开关只有在其 Catalog Classification 允许时才可动态配置；基础设施时间和容量通过 GitOps/Capacity Profile调整，后台只读。

## 5. 统一运行状态

运行状态页面采用“环境概览 → 组件详情 → 实例/告警详情”：

- Kubernetes Node/Pod/Deployment、Gateway、证书、NetworkPolicy和Cilium/Hubble；
- PostgreSQL/CloudNativePG/PgBouncer、Valkey/Sentinel、NATS/JetStream、Temporal和OpenBao；
- Rook-Ceph/RGW、Bucket Class、ESSD PVC、Backup/Restore、容量与Object Lock；
- Prometheus/Thanos/Alertmanager、OpenTelemetry、Loki、Tempo和Grafana；
- Agent、Sandbox、Model Provider、GitLab Connector、Scanner、安全公告源及外部Provider Binding。

页面显示Desired/Effective、健康、容量、性能、备份恢复、Telemetry Gap、Partial Query、Drift、趋势、影响范围、Correlation ID、Runbook和受权Deep Link。复杂指标、日志和Trace查询仍进入专业控制台，平台不重复建设Grafana。

外部Watchdog必须位于被监控Cluster故障域之外；即使Cluster、平台API、数据库和状态Collector均失联，仍能通过独立渠道告警。平台只展示其签名投影，不能成为Watchdog告警链的同步依赖。

## 6. Audit

Audit记录谁在何时、以何种身份、对哪个对象执行了什么动作、结果如何及前后值摘要。它是独立、追加式、防篡改事实，不是Requirement逻辑删除表，也不被业务归档、删除或恢复改写。

必须审计的类别至少包括：

- 登录、密码/TOTP重置、Session、Super Admin生命周期和Break-glass；
- 组织、Workspace、协作关系、Capability、Scope、Assignment与配置发布；
- Requirement、WorkItem、Gate、Decision、验收、归档、恢复和逻辑删除；
- Agent/Build Attempt、Execution Binding、Skill、Model、工具、Sandbox、网络与Artifact；
- GitLab Project/分支/Commit/Integration MR/Formal MR/Review/Merge；
- Secret引用和轮换、Backup/Restore、Object Lock、Provider状态导入及专业控制台访问。

审计正文不保存密码、TOTP Secret、Token、Private Key、Presigned URL、Prompt/源码/附件正文或其他Secret；只保存必要的引用、Fingerprint、Digest和脱敏摘要。

## 7. Observability 与看板

- 应用通过OpenTelemetry产生Trace、结构化Log和应用Metric，并传播`request_id`、`trace_id`、`requirement_id`、`attempt_id`等Correlation ID。
- Metrics使用Prometheus双副本与Thanos Query，Alertmanager三副本；Log使用Loki Monolithic三副本；Trace使用Tempo 3 Monolithic单副本和双OTel Gateway有界持久Queue。Trace是诊断数据，不宣称Backend HA或零丢失。
- 默认Retention为Metrics 30天、普通Log 14天、安全/Audit热查Log 30天、Hubble异常流7天、Trace 7天；权威Audit/WORM不由Loki替代。
- 看板覆盖Model调用/Token/成本/延迟、Requirement阶段耗时、Gate等待、返修、MR周期、Attempt/Build/Sandbox、Artifact/存储、容量、备份恢复和各组件SLO。
- 数据按Capability + Scope裁剪；高基数Correlation ID不作为Metric Label，Secret、HTTP Authorization、Cookie、Prompt正文、源码和SQL Bind Value不得进入Telemetry。

## 8. 消息与安全公告

- 第一版消息使用后端API拉取，不先建设实时推送中心。
- 后端每周日`02:00 Asia/Shanghai`从CISA KEV、NVD API 2.0和OSV API增量采集，每周一`07:00`自动发布；调度通过版本化配置管理。
- 公告只发布与Technology Inventory匹配的CISA KEV及High/Critical漏洞，保留来源覆盖、游标、摘要Hash、去重、重试和发布Audit。
- 部分源失败可以发布但必须标明缺失；全部失败不得发布空公告，继续保留上一期并告警。
- 可见性由公告读取Capability + Scope决定，管理员或开发Leader只是默认能力模板对象，不是代码角色判断。

## 9. 治理原则

- Audit权威事实、业务数据库、Observability诊断数据和外部Provider状态投影各自保持单一事实源，不能互相替代。
- 配置值、Observed状态和Derived指标必须区分；只读观测结果不能反向成为第二份可编辑配置。
- 所有看板数字必须能追溯到来源、时间窗口、单位、分母、Policy/Profile Revision和数据缺口。
- Secret、Cloud Credential和密钥材料永不在管理后台展示；只显示引用、健康、版本、轮换、到期与Drift。
