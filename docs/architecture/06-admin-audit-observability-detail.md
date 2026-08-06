# 管理端、Audit 与 Observability 详细设计

> 文档层级：L2 详细版
> 状态：完整架构基线（已批准）
> 更新日期：2026-08-06
> 对应精简版：[管理端、Audit 与 Observability](./06-admin-audit-observability.md)

## 1. 目标与边界

目标：

- 用同一个 Web App 管理当前 Platform Environment 的账号、组织、Workspace、Capability、Assignment、配置和运行状态；
- 对用户、Agent、Workflow、代码、基础设施投影和外部集成形成可验证的 Audit；
- 通过统一只读模型展示健康、容量、性能、备份恢复、Drift、Telemetry Gap与成本口径；
- 从平台管理后台提供当前环境专业控制台和外部 Provider Console的受权入口。

非目标：

- 不建立独立管理端账号或管理端用户表；
- 不把菜单隐藏当作后端授权；
- 不把平台管理后台变成 Kubernetes、Cloud、Ceph、OpenBao或Grafana的写控制面；
- 不用Metrics、Log或Trace替代业务事实和追加式Audit；
- 不在第一阶段建设任意拖拽式BI、实时消息推送中心或跨环境资源浏览器。

## 2. 环境、Web 与入口模型

单个 Platform Environment 内：

```text
Browser
  → platform-gateway
    → 同一 Web Build（用户端 + 管理端）
    → 同一 Control Plane API
    → 当前环境本地用户、Session 与业务事实
```

- 当前只实例化DEV；未来PROD使用相同代码、Manifest Shape、Contract和PCS独立部署。
- DEV与PROD不共享Gateway、Web/Backend实例、域名、证书、Session、用户表、PostgreSQL、Cache或任何内部控制台。
- 当前DEV页面只显示DEV事实，未来PROD页面只显示PROD事实；不提供环境下拉框批量管理两个环境。
- 每个环境只有一个`platform-gateway`，用户入口、管理入口、内部Console Access Route和获批的Operations Status Ingest Route都经过它，但使用不同Path、Policy和Rate Limit。

专业控制台统一从平台管理后台以新标签页打开：

```text
平台 Session + Capability + Scope
  → ConsoleAccessPort
    → Allowlisted Console Link
      → Auth Proxy / 短期只读身份 / 目标系统自身登录
```

- Grafana、Hubble、Temporal和OpenBao等Cluster内控制台使用内部Console Access Contract。
- Cloud/WAF/NLB/KMS/Backup等Provider Console使用`ExternalProviderBinding + ConsoleAccessAdapter`。
- 不使用iframe，不保存长期目标Credential，不接受任意用户URL或Envelope中的URL，不因平台未接入SSO就取消目标系统认证。
- 入口打开、授权结果、Actor、Environment和目标Link必须写入Audit；不记录短期Credential或目标Session内容。

## 3. 管理端信息架构

```text
平台管理后台
├── Identity
│   ├── 用户与账号
│   ├── 密码/TOTP/Session
│   └── Super Admin与恢复Case
├── Organization
│   ├── 经理与Leader
│   └── 普通员工与直属关系
├── Workspace与授权
│   ├── Owner/受邀Leader/正式成员投影/协作关系
│   ├── Capability/Scope/Assignment
│   └── GitLab Project Binding
├── Workflow与执行
│   ├── Requirement/WorkItem/Gate/Decision
│   ├── Attempt/Build/Sandbox/Artifact
│   └── Model Route/Runtime/Skill
├── Configuration
│   ├── Platform Policy
│   ├── PCS/Capacity Profile
│   └── Provider Binding/Desired/Effective/Drift
├── 运行状态
│   ├── 环境概览
│   ├── 组件/实例/容量
│   └── Alert/Gap/Runbook/Console
├── Audit中心
├── 消息与安全公告
└── 指标与成本看板
```

菜单由后端根据当前Principal的有效Capability + Scope返回。每个受保护Query或Command仍实时校验Principal、Membership、Assignment、Authorization Version和资源状态，不能信任前端路由或旧菜单缓存。

## 4. Identity 管理

用户创建不选择Workspace，主要事实包括：

```text
employeeNo            // 恰好8位数字字符串，可0开头
displayName
email
accountStatus
organizationLevel     // MANAGER | LEADER | EMPLOYEE
specialty             // PRODUCT | FRONTEND | BACKEND等
supervisorUserId
credentialVersion
authorizationVersion
totpEnrollmentState
```

规则：

- 账号只允许由具备相应Identity Capability的人员创建，不提供自助注册。
- 创建新账号或管理员重置密码时使用CSPRNG生成每账号唯一随机临时密码；默认24小时有效、只展示一次、之后不可查询明文。密码重置立即使旧密码、未消费的旧临时密码和已有Session失效，但不隐式重置TOTP Binding。
- 临时密码首次成功使用时原子消费，只签发受限Bootstrap Session。新账号必须设置15～32位正式密码并完成TOTP Enrollment；仅重置密码且原TOTP Binding仍有效时，设置正式密码后校验既有TOTP，不签发新TOTP Secret；只有管理员另行执行TOTP重置后，Bootstrap流程才要求重新Enrollment。
- 正式密码必须包含大写、小写和至少一个特殊字符，并拒绝弱密码、已泄露密码及包含员工编号等上下文的密码；使用Argon2id、独立salt和OpenBao pepper。
- 所有用户必须绑定TOTP，不因岗位或Capability获得例外；第一阶段无恢复码。密码重置与TOTP重置是两个独立受权操作，后者会撤销原Binding并要求重新Enrollment。
- MFA重置、密码重置、账号停用或安全事件会提升Credential/Authorization Version并撤销已有Session。
- Session连续60分钟无受认证用户操作后失效；后台Agent运行不能刷新人的Session。同账号默认最多3个有效Session，可在1～10范围内配置。
- Session失效或用户权限变化不终止已启动Attempt；用户之后的查看、取消、重试等动作立即按当前权限判断。

Super Admin：

- 每个环境Bootstrap只允许创建首个Super Admin一次，DEV/PROD初始化事实不共享。
- 平台始终满足`activeSuperAdminCount >= 1`；最后一个有效Super Admin不能被移除、停用或逻辑删除。
- `platform.configuration.manage`和`platform.super_admin.manage`是保留能力，不进入普通岗位模板或Grant流程。
- Super Admin不是万能Root，不能绕过业务Capability、Assignment、Human Gate、GitOps或External Provider边界。
- 正常恢复不可用时，使用GitOps锁定的一次性Break-glass Job/CLI调用受限Recovery Port；不允许Web恢复入口、直接SQL或常驻高权ServiceAccount。

## 5. Organization、Workspace 与 Authorization 管理

组织只支持：

```text
经理
└── Leader（一个经理可有多个Leader）
    └── 普通员工（产品、前端或后端）
```

- 创建Leader必须选择经理；创建普通员工必须选择直属Leader。
- 产品与开发可以属于不同经理和组织链；不支持Leader嵌套Leader或普通员工有下属。
- 开发是否能创建Requirement由Capability决定，不由岗位禁止。

Workspace正式成员为：

```text
当前Owner
UNION 受邀Leaders
UNION 上述Leader当前直属普通员工
```

- 创建Workspace的Leader成为唯一Owner。
- 只有Owner能邀请/移除其他Leader和转让Owner；受邀Leader不能继续治理Leader名单。
- 经理不会仅因管理Leader自动成为成员；不提供“手工设置正式成员”。跨组织或临时访问使用独立、有时效的协作关系，不写入正式成员投影。
- 组织关系变化会重新派生当前Membership，但不改写历史Requirement、Assignment、Decision或Audit Actor。

协作关系至少保存用户、Workspace、`validFrom`、`validTo`、原因、资源Scope和本次协作产生的临时Capability Grant，并使用`validFrom <= now < validTo`的半开区间。到期或提前终止在授权校验中立即失效，不依赖后台定时任务是否及时执行；只撤销该协作来源的Membership Scope与Grant，不影响正式成员事实、业务记录或Audit。创建、延期、终止和到期都必须具有明确协作管理Capability并写入Audit，Owner或管理员称谓本身不自动获得该能力。

授权管理统一使用：

```text
Capability + Scope + Membership + Assignment + Resource Guard
```

- 岗位只提供账号创建时的默认Capability模板和默认路由来源，后端不使用岗位字符串判断API。
- Assignment指定未完成责任当前由谁承担，不能自动补足Capability或Scope。
- Authorization Projection可以缓存，但PostgreSQL版本是权威事实；版本过期时回源或拒绝敏感写操作。
- 已完成Decision与Audit保存原Actor Snapshot，人员变动不追溯改写。

## 6. Typed Configuration 管理

配置分为：

| Classification | 示例 | 修改通道 |
| --- | --- | --- |
| `SYSTEM_INVARIANT` | `main`保护、Human Gate不可代签、Secret隔离、Audit不可篡改 | 架构/安全变更 |
| `PLATFORM_POLICY` | Session数量、密码过期、附件配额、Gate默认路由、业务超时 | Super Admin配置发布 |
| `GITOPS_CONFIG` | Replica、PVC、Retention基础设施值、Ceph阈值、Kubernetes资源、PCS | GitOps/运维流程 |
| `DERIVED/OBSERVED` | 当前用量、健康、实测RPO/RTO、趋势 | 只读，不是配置 |

- 所有`PLATFORM_POLICY`只由Super Admin通过`platform.configuration.manage`管理，不为每类配置再创建独立管理员或风险等级。
- Catalog定义稳定Key、模块Namespace、类型、单位/时区、Default、Min/Max、Enum/Allowlist、Scope、继承、Source of Truth、生效语义、Rollback和Redaction。
- 简单Boolean/Enum/Number/Duration/Schedule由Schema生成受约束表单；复杂Gate/Model Route/File Type Policy使用模块专用编辑模型。
- 不提供任意JSON、SQL、脚本、表达式或自由Helm Value编辑器。
- Draft、校验、Impact Preview、发布、Effect、Rollback、Revision和Audit必须完整保留；历史业务对象保存解析后的Effective Value和Policy Version。
- `GITOPS_CONFIG`和基础设施安全参数在后台只读，Super Admin也不能编辑。

## 7. 运行状态与 Operations Read Model

### 7.1 页面层级

```text
环境概览
  → 组件详情
    → Replica/Node/PVC/Bucket/Binding
      → Alert、时间线、证据、Runbook和受权Console
```

每一层显示：

- Desired、Effective、Revision、Drift和最近变更；
- Health、Availability、Capacity、Performance、Queue、Backup/Restore和证书状态；
- Warning/Critical、受影响能力、开始时间、持续时间、Correlation ID和数据缺口；
- 数据来源、Freshness、Partial Query与当前环境。

### 7.2 覆盖组件

- Kubernetes Node/Pod/Deployment、API Endpoint、Gateway API、Cilium/Hubble、cert-manager和StorageClass；
- CloudNativePG/PostgreSQL/PgBouncer、Valkey/Sentinel、NATS/JetStream、Temporal和OpenBao；
- Rook-Ceph/RGW、OSD/MON/MGR、Bucket Class、Object Lock、ESSD PVC和Backup Repository；
- Prometheus/Thanos/Alertmanager、OpenTelemetry Agent/Gateway、Loki、Tempo和Grafana；
- Platform Web/Backend、Model Gateway、Sandbox Controller、Agent/Build、Kata/KVM、Scanner和Artifact；
- GitLab、Model Provider、安全公告Source、External Provider Binding、Watchdog和Provider Audit。

### 7.3 External Provider 状态

平台边界外的Cloud Account、VPC、Edge/NLB、NAT/Egress、KMS、Backup、Watchdog和Provider Audit由运维/IaC治理。Cluster外`Environment Operations Collector`使用分离的短期只读身份生成签名`ExternalProviderStatusEnvelope`，经`platform-gateway`专用HTTPS Route导入。

平台验证Environment、Binding Generation、Collector Lineage、Key Scope、Signature、Digest、Sequence、Idempotency和Freshness后，只更新当前环境的只读Projection。统一状态为：

```text
HEALTHY | DEGRADED | UNAVAILABLE | UNKNOWN | STALE | PARTIAL | DRIFT
```

- 无机器接口时显示`NOT_INTEGRATED`或带有效期的签名运维声明，不能伪造绿色。
- Collector失联只降低可见性；真实依赖故障仍按各自Contract降级或Fail Closed。
- 外部Watchdog必须在Cluster、平台API、PostgreSQL和Collector都不可用时仍能独立告警。
- 管理后台和Backend不持有Management Account Credential、Cloud Admin Access Key或Provider Mutation Token。

Status Trust Store必须把每个Signing Key ID绑定到唯一Environment、Collector Lineage和允许上报的Binding Kind/ID Scope，合法Key不能替其他环境、Lineage或Binding签名。Key生命周期固定为`ADD_NEW → CANARY → ACTIVE → VERIFY_ONLY → RETIRED/REVOKED`；新旧Public Key只在受控重叠窗共同验证，新Key通过Canary和Sequence连续性后才能签发Active Envelope，旧Key保留验证到其最后一个Envelope超过Valid Until。Private Key留在Cluster外受控边界，平台只保存版本化Public Trust Material；撤销、连续签名失败或持续拒收由Cluster外链路告警，旧绿色状态到期后必须转为`STALE/UNKNOWN`。

Sequence High-water Mark固定作用于`(Environment ID, Binding ID, Binding Generation, Collector Lineage ID)`：同Sequence同Digest按幂等成功处理，同Sequence不同Digest视为安全冲突，更小Sequence拒绝。Binding Generation或Collector Lineage必须先由GitOps/Trust Store激活才能建立新Sequence空间；High-water Mark属于必须随平台数据恢复的安全事实，恢复后无法证明时Feed保持`UNKNOWN`并通过受控新Lineage切换，禁止静默清零绕过Replay。

## 8. 消息与安全公告

- 首版消息由Frontend轮询后端API，不建设WebSocket/推送中心。
- 批准的数据源固定为CISA KEV、NVD API 2.0和OSV API；不抓网页HTML，也不允许管理员填写任意URL。
- Technology Inventory是平台级版本化配置，记录关注组件、生态、厂商标识和当前版本。
- 每周日`02:00 Asia/Shanghai`增量采集，每周一`07:00`自动发布；调度可配置但不写死在业务代码。
- 仅筛选Inventory匹配的CISA KEV，以及High/Critical漏洞；CVE优先作为去重键，OSV/GHSA Alias合并。
- 单源失败最多重试3次。部分源成功可发布但必须标注覆盖缺口；全部失败不得发布空公告，保留上一期并触发Alert。
- 公告包含紧急程度、CVE/Advisory ID、受影响组件和版本、已知修复、处置建议、是否已知利用、官方来源与本期Coverage。
- 可见性由读取Capability + Scope决定；管理员和开发Leader只是默认模板对象。

## 9. Audit 事件模型

统一事件最少包含：

```text
eventId
occurredAt
environmentId
actorType
actorId
onBehalfOfUserId
workspaceId
projectId
requirementId
workItemId
attemptId
action
resourceType
resourceId
result
reasonCode
beforeDigest
afterDigest
correlationId
requestId
sourceContext
policyOrProfileRevision
metadata
```

`actorType`至少包括`USER | AGENT | SERVICE | SYSTEM | OPERATIONS`。Actor事实在事件写入后不可因人员改名、岗位变化、Assignment改派或账号停用而重写。

Audit不保存：

- 密码、临时密码、TOTP Secret、Recovery材料；
- Token、Cookie、Private Key、Access Key、完整Presigned URL；
- Prompt、源码、附件或SQL Bind Value正文；
- 未经批准的Provider原始响应。

需要证明内容时保存Fingerprint、Digest、脱敏摘要或受控Artifact Version引用。

## 10. 必须审计的操作

### 10.1 Identity 与授权

- 登录/失败、临时密码签发/消费/过期、正式密码/TOTP重置、Session签发/撤销；
- 用户、上级、账号状态、Capability、Scope、Assignment和Authorization Version变化；
- Super Admin Bootstrap、晋升、移除、最后一人保护和Break-glass Recovery Case；
- Platform Policy Draft、校验、发布、Effect、Rollback和拒绝。

### 10.2 Workspace 与研发流程

- Workspace创建、Owner转让、Leader邀请/移除、Membership投影和协作关系变化；
- Requirement/WorkItem创建、分配、状态转换、归档、恢复和逻辑删除；
- SDD、最终验收、MR Gate的Reviewer解析、改派、Decision和版本失效；
- GitLab Project绑定、分支、Commit、Integration MR、Formal MR、Review和Merge；
- Agent/Build Attempt、Execution Binding、Skill、Model、工具、Sandbox命令/网络、Artifact和资源超限。

### 10.3 基础设施与外部系统

- Secret引用、Lease/PKI轮换、OpenBao Audit、Object Lock和Backup/Restore；
- PCS、Capacity Profile、GitOps Revision、Provider Binding和签名状态Feed导入；
- 专业控制台入口授权、外部Incident关联和Break-glass操作；
- Scanner Verdict、Quarantine、技术垃圾Reconciliation和受控清理。

首版Jenkins独立运行，平台不读取其状态；用户在平台确认外部验证完成时，只审计该用户声明及其绑定的Integration Baseline。

## 11. Audit 持久化与保留

- 业务事务通过Transactional Outbox原子产生Audit事实；消费者幂等写入追加式存储。
- 普通业务API没有Audit Update/Delete；查询和导出Audit本身也必须审计。
- 平台Audit和OpenBao Audit是不同事实源，通过Request ID、Trace Context、Workload Identity和Actor Context关联。
- 集中Audit权威归档进入当前环境`audit-worm` Bucket Class，默认保留365天并使用365天`COMPLIANCE` Object Lock；到期前任何身份都不能删除或缩短期限。
- OpenBao每Replica独立Audit PVC仅作7天本地缓冲；Loki中的30天Security/Audit热查副本不是权威归档。
- DEV `audit-worm`正常Operating Quota为64 GiB并保留16 GiB Emergency Margin；PROD为96/32 GiB。达到正常Quota即进入Critical Incident并优先保障Audit写入。
- 如果任何必须产生Audit的新状态变更无法可靠持久化且容量无法覆盖扩容Lead Time，相关变更Fail Closed，不能在无Audit情况下成功。

## 12. Observability 架构

### 12.1 采集与关联

- 应用使用OpenTelemetry SDK产生Trace、结构化Log和应用Metric，传播W3C Trace Context及批准的Correlation ID。
- 应用Trace/Log通过OTLP发往本环境双OpenTelemetry Gateway；应用Metric由Prometheus抓取，避免同一Series双写。
- 每个Node运行非Root OpenTelemetry Agent读取批准的Container Log和专用有界Checkpoint目录。
- Secret、Authorization/Cookie、Presigned Query、Prompt、源码、附件、SQL Bind Value不得进入Log、Span Attribute或Metric Label。
- 高基数Correlation ID作为结构化字段，不作为Prometheus/Loki索引Label。

### 12.2 Metrics 与 Alert

- Prometheus 2个Replica，每个50 GiB PVC，默认保留30天；Thanos Sidecar + 2个Thanos Query提供去重查询。
- Alertmanager 3个Replica，每个5 GiB PVC；Alert Rule和Route由GitOps管理。
- Grafana 2个Replica，共享PostgreSQL数据库；普通用户只有Viewer/Explore只读能力。
- 每个环境产生Watchdog/Deadman信号并发送到Cluster外Receiver。

### 12.3 Log

- Loki Monolithic运行3个Replica，`replication_factor=3`，每Replica使用10 GiB WAL PVC并跨不同`platform-worker`。
- 长期Log对象保存到本环境`observability-logs` RGW Bucket Class；首版不部署Loki Distributed、MinIO或Cache组件。
- 普通Log默认14天，Security/Audit热查30天，Hubble Deny/异常Drop 7天。
- Loki Compactor是Log Retention事实源；Bucket Lifecycle不能绕过Index直接删除对象。
- Loki Tenant Header只用于路由，不构成认证。所有入口必须删除客户端提交的`X-Scope-OrgID`、Auth Proxy和其他身份Header，再由受信Loki Gateway/OTel Gateway依据当前环境mTLS Service Identity注入固定且环境独立的Tenant；NetworkPolicy禁止Workload绕过Gateway直连Loki，Sandbox也不能直接查询Observability Backend。

### 12.4 Trace

- Tempo 3 Monolithic `target=all`每环境只运行1个Replica、10 GiB本地恢复PVC，Trace Block保存到`observability-traces`，默认7天。
- 不复制多个`target=all`实例冒充HA，也不在首版引入Kafka、Mimir或Tempo Microservices。
- 两个OpenTelemetry Gateway各有10 GiB RWO持久Queue，目标在已验证峰值下缓冲4小时；达到时间或容量边界后允许丢弃诊断Trace，但必须精确显示Gap和Dropped Count，不能阻塞核心业务或宣称零丢失。
- Tempo首版固定`multitenancy_enabled=false`，不接受或解释客户端Tenant Header；环境隔离依赖DEV/PROD独立Cluster实例、mTLS Workload Identity和NetworkPolicy，不能用可伪造Header替代。

### 12.5 容量与配置

每环境Observability固定Pod稳态Request约为`4.1 CPU / 8 GiB RAM`，RWO PVC总量为`175 GiB`。这些是Environment Capacity Profile输入，不是一台服务器规格。

Retention、采样率、Queue、PVC、Quota、Scrape Interval、Rule、Cardinality与Rate Limit属于`GITOPS_CONFIG`；后台只读显示Desired、Effective、Usage、预测窗口与Drift。扩缩容生成新Capacity Profile Candidate，不能从业务页面即时修改。

## 13. 指标与看板口径

指标至少覆盖：

- Model：调用、Token、估算/结算成本、P50/P95、成功/限流/回退、联网/思考能力使用；
- Requirement：各主状态与Gate等待、Route类型、Lead Time、返修、一次最终验收通过率；
- Delivery：WorkItem分配、dev集成、Formal MR周期、Review轮次、合并；
- Runtime：Attempt/Build状态、Sandbox Provision、Queue、Capacity Units、Kata/KVM和资源超限；
- Storage：Artifact/附件配额、PVC、Bucket Class、Ceph Raw/最满OSD、Backup和恢复演练；
- Platform：API延迟/错误、数据库/Cache/Event Bus/Secret健康、Telemetry Gap和外部Provider状态。

每个指标定义必须包含：

```text
metricCode
definition
formula
numeratorAndDenominator
dimensions
sourceFacts
timeZone
owner
version
knownGap
```

例如“一次最终验收通过率”的分母是首次进入`AWAITING_ACCEPTANCE`且形成有效Integration Baseline的Requirement，分子是该Baseline首次Decision即为`APPROVED`的Requirement。

Dashboard不在Frontend拼接领域表；聚合API返回版本化口径、数据时间和Gap。经理、Leader、管理员和Super Admin都只读取其Capability + Scope允许的数据，管理能力不自动授予源码或Requirement内容读取权。

## 14. 稳定 Query/Command Port

参考Query：

```text
getCurrentSession
listUsers
getOrganizationTree
listWorkspaces
listWorkspaceMembers
listCollaborationAssignments
listAssignments
listConfigurationCatalog
getConfigurationRevision
getEnvironmentOperationsOverview
getComponentOperationsDetail
listAlerts
listAuditEvents
listSecurityBulletins
getDashboardMetrics
resolveConsoleAccess
```

参考受保护Command：

```text
createUser
resetPassword
resetTotp
revokeSessions
changeReportingLine
transferWorkspaceOwnership
changeCapabilityGrant
reassignResponsibility
publishPlatformPolicy
rollbackPlatformPolicy
```

管理Backend不提供Cloud/IaC/Kubernetes/Ceph/OpenBao基础设施写Command。相关Desired State只通过GitOps/运维系统变更。

## 15. 失败与降级

| 场景 | 处理 |
| --- | --- |
| Authorization缓存过期 | 回源PostgreSQL当前Version或拒绝敏感写操作 |
| 成员投影暂时失败 | 权威组织事实仍实时参与授权，页面显示Drift并重试 |
| 协作到期任务延迟 | API按半开时间区间实时拒绝，异步任务随后收敛投影 |
| Audit Consumer失败 | Outbox保留并幂等重试；无法保证关键Audit时Fail Closed |
| Metrics/Log/Trace延迟 | 显示Source Time、Gap和Partial，不伪装实时 |
| Tempo不可用 | OTel Gateway有界缓冲；超界记录Dropped Gap，核心业务继续 |
| Collector/Status Feed失联 | 外部状态转STALE/UNKNOWN；不阻塞无同步依赖的业务 |
| External Watchdog失联 | Cluster外独立告警；平台恢复后显示Incident |
| 单个安全公告源失败 | 有界重试，发布时标注Coverage |
| 所有公告源失败 | 不发布空公告，保留上一期并告警 |
| Console授权或目标登录失败 | 拒绝打开并记录Audit，不返回长期Credential |
| Secret/敏感字段泄漏检测命中 | 拒绝写入/导出并触发安全Incident |

## 16. 验收场景

1. DEV管理后台只展示DEV，未来PROD只展示PROD，二者没有共享Session或环境切换器。
2. 所有用户首次初始化都必须设置正式密码并绑定TOTP；临时密码只能消费一次。
3. 被邀请Leader能参与Workspace业务，但不能邀请/移除其他Leader或转让Owner。
4. 协作关系到期时，即使异步收敛任务延迟，受保护API也立即拒绝访问且不改变正式成员集合。
5. 没有Capability时菜单不可见，直接调用API也被拒绝；已启动Attempt仍按不可变Binding继续。
6. 只有Super Admin能发布Platform Policy，且Super Admin也不能从页面修改GitOps/Cloud/Ceph参数。
7. 运行状态页能够展示组件Desired/Effective、Drift、容量、告警、Gap和Runbook，而不是只有“正常/异常”。
8. Grafana/Hubble/Temporal/OpenBao从平台打开新标签页，并再次校验Session、Capability和Scope。
9. Cluster外Provider状态签名、过期、Replay或环境不匹配时被拒绝，旧绿色状态按Freshness转STALE/UNKNOWN。
10. Cluster、平台API和Collector均不可用时，外部Watchdog仍能告警。
11. Requirement逻辑删除或人员改派不会删除Audit或改写历史Actor/Decision。
12. Loki/Tempo诊断Retention到期不影响365天Audit WORM权威归档。
13. Tempo不可用超过Queue边界时页面显示准确Trace Gap，核心业务不被Observability阻塞。
14. 每周公告部分源失败时明确标注Coverage；全部失败时不发布空公告。
15. 看板指标可追溯到口径版本、来源事实、时间范围、分子分母和已知Gap。
