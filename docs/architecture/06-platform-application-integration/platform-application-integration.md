# 平台应用与集成

> 文档层级：L1 架构地图
> 规范事实源：[平台应用与集成详细说明](./platform-application-integration-detail.md)

## 目标与边界

本视图定义平台应用的完整 Target Architecture、组件边界、集成 Contract 与运行时关系，不声明任何 Platform Environment 的实际部署状态。环境中的 Image、Bundle、拓扑与健康状态由 GitOps Desired State、Platform Configuration Snapshot（PCS）和运行证据证明；实施阶段、Capability 激活状态与 Release 验收只见[实施路线图](../12-implementation-roadmap/implementation-roadmap.md)。

目标 Control Plane 交付为一个 Python 项目中的**模块化单体**；模块保有自己的领域模型、Application Service、数据和迁移，并以公开 Port/DTO/事件协作。模块可在未来提取为独立服务，但可提取性不表示当前已有领域微服务。

本文不拥有 Identity、Requirement、Agent、Sandbox 或 GitLab 的领域状态；它们分别由 [01](../01-identity-organization-authorization/identity-organization-authorization-detail.md)、[02](../02-requirement-workflow/requirement-workflow-detail.md)、[03](../03-agent-skill-model/agent-skill-model-detail.md)、[04](../04-sandbox-runtime/sandbox-runtime-detail.md) 与 [05](../05-source-control-delivery/source-control-delivery-detail.md) 定义。Configuration 的通用治理协议与生命周期状态语义由 [10](../10-configuration-governance/configuration-governance-detail.md) 定义，各 Namespace 的 Policy 数据仍归对应领域模块；数据事实与持久化基线由 [07](../07-data-messaging-storage/data-messaging-storage-detail.md) 定义。

## 组件地图

以下是完整目标组件地图；图中节点不表示必须同时部署：

```text
Browser
  → platform-gateway
    ├── Umi Web（用户端 + 平台管理后台）
    └── Python Control Plane（模块化单体）
          ├── 领域模块（含独立 Configuration 模块）
          ├── 公开 Application Facade / Port
          ├── Transactional Outbox / Inbox
          └── Operations Read Model / Console Access（按需增强）
                ↕ 按 Capability 激活的 Port / Adapter
       GitLab · Model · Sandbox · Object · Security Feed · Operations Feed

按 Capability 激活的独立 Deployable：Platform Orchestrator Worker、Model Gateway、
Sandbox Controller、GitLab Connector、File Security Worker、Operations Adapter
```

- `platform-gateway` 是当前 Platform Environment 的唯一北向应用入口，负责 TLS、路由、限流和受控 Console 入口，不承载领域决策。
- 同一 Umi Web 构建产物承载用户端和 `/admin` 管理路由；对话交互复用 `@ant-design/x` 组件而不引入独立 Chat 应用，后端返回受限菜单数据，静态 Route Registry 决定可加载页面。
- Python Control Plane 是业务事实的应用协调者；独立 Deployable 通过稳定 Contract 工作，不能直读其私有表。
- 未启用的 Capability 不部署其专属 Deployable；保留 Port/Adapter Contract 不等于预先安装 Worker、Controller、Scanner、Feed 或 Console。
- DEV 与 PROD 使用同源代码、Contract、Flux GitOps 模板和 PCS，但各自实例化 Web、gateway、Control Plane、Session 与全部状态，不共享运行时组件或状态。

## 会话与请求主流程

1. Browser 以 Secure、HttpOnly、SameSite Cookie 访问当前环境 `platform-gateway`。
2. Web 取得当前 Principal、Workspace 摘要、有效 Capability 与导航数据，并由静态 Route Registry 渲染页面。
3. 每个受保护 API 仍由 Control Plane 使用当前身份、权限、范围、成员资格、责任与资源条件判定；前端隐藏菜单只改善体验。
4. 长任务同步返回受理结果，后续状态以 Query、SSE 或事件更新；外部副作用由 Outbox、Inbox 与 Effect Ledger 收敛。

## 核心应用与激活边界

Umi Web、Python 模块化单体、OpenAPI、单模块事务和 Port/Adapter 是应用基础边界。领域写入、Audit 与 Outbox 在同一 PostgreSQL Transaction 提交；跨模块或外部 Effect 使用 Inbox、Effect Ledger 与 Reconciliation 收敛。GitLab、Model、Sandbox、File Security、Object Storage 与编排能力只在对应 Capability Package 首次消费并通过 Capability Activation Gate 后启用其 Adapter 或专属 Deployable。

Flux 只 Reconcile 当前环境受保护 Git 路径中的 Desired State；Control Plane、Operations Read Model 和管理后台都不能反向改写 Flux 或将 Observed Status 变成第二事实源。

## Configuration、管理与增强能力

每个领域模块拥有自己的 Typed Configuration Schema、默认值、约束、解析器与业务解释；Configuration 模块位于同一 Python 模块化单体内，通过稳定 Port 提供 Effective Configuration。Catalog、Draft、Publish、Rollback、Snapshot、Schema 演进与 Promotion 生命周期由 [Configuration Governance](../10-configuration-governance/configuration-governance-detail.md)统一约束；发布资格与 Super Admin 边界由 [01](../01-identity-organization-authorization/identity-organization-authorization-detail.md)拥有。

Operations Read Model、安全公告、复杂管理 Console 与高级 External Provider 治理是完整 Target Architecture 中按需激活的增强能力。平台管理后台只展示当前环境；启用后消费 Operations Read Model 展示健康、容量、告警、Drift 与 Runbook，并通过预注册、允许列表内且逐次授权的新标签页入口打开专业 Console。它不接受任意目标 URL，也不成为基础设施写控制面。密钥、加密与安全审计机制见 [安全、审计与治理](../08-security-audit-governance/security-audit-governance-detail.md)；Cluster、Node 与容量基线见 [基础设施与运维](../09-infrastructure-operations/infrastructure-operations-detail.md)。

安全公告继续由平台拥有采集编排、筛选、去重、发布和 Audit；依赖与 SBOM 漏洞匹配复用版本锁定的 `OSV-Scanner` 一次性 Job，并只对 Source Adapter 固化的数据快照执行离线扫描，不建设独立漏洞管理平台、外部数据通道或常驻扫描服务。

## 不变量

1. Browser 不直连数据库、NATS、Kubernetes、OpenBao、Model Gateway 或基础设施管理接口。
2. Web、gateway、Control Plane 和所有外部调用始终限制在单一当前环境；DEV 与 PROD 不共享实例、凭据或状态。
3. 模块不得导入其他模块的 ORM Model、Repository 或内部实体；跨模块只经公开 Facade、DTO 或事件协作。
4. 领域事务、Audit 与待发布消息原子写入；消息传输至少一次，业务效果由 Inbox/Effect Ledger 幂等化。
5. External Provider Contract 只导入可验证的只读状态，平台不以 Dashboard 或投影反写 IaC、Provider Desired State 或恢复事实。
6. 外部状态 Feed 只影响可见性；其 `STALE/UNKNOWN` 不等于真实依赖故障，也不阻塞没有同步依赖该 Feed 的既有业务运行。
7. Configuration 是 Control Plane 内独立领域模块；Platform Application and Integration 只消费其公开 Contract，Configuration 不形成独立 Deployable 或微服务。
