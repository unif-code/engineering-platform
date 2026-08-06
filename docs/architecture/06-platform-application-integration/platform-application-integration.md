# 平台应用与集成

> 文档层级：L1 架构地图
> 规范事实源：[平台应用与集成详细说明](./platform-application-integration-detail.md)

## 目标与边界

本视图定义平台应用的组件边界、集成 Contract 与运行时关系。当前后端是一个 Python 项目中的**模块化单体**；模块保有自己的领域模型、Application Service、数据和迁移，并以公开 Port/DTO/事件协作。它可在未来提取为独立服务，但当前不把可提取模块描述为既有微服务。

本文不拥有 Identity、Requirement、Agent、Sandbox 或 GitLab 的领域状态；它们分别由 [01](../01-identity-organization-authorization/identity-organization-authorization-detail.md)、[02](../02-requirement-workflow/requirement-workflow-detail.md)、[03](../03-agent-skill-model/agent-skill-model-detail.md)、[04](../04-sandbox-runtime/sandbox-runtime-detail.md) 与 [05](../05-source-control-delivery/source-control-delivery-detail.md) 定义。数据事实与持久化由 [07](../07-data-messaging-storage/data-messaging-storage-detail.md) 定义。

## 组件地图

```text
Browser
  → platform-gateway
    ├── Umi Web（用户端 + 平台管理后台）
    └── Python Control Plane（模块化单体）
          ├── 领域模块与 Typed Configuration
          ├── 公开 Application Facade / Port
          ├── Transactional Outbox / Inbox
          └── Operations Read Model / Console Access
                ↕ Adapter
       GitLab · Model · Sandbox · Object · Security Feed · Operations Feed

独立 Deployable：Platform Orchestrator Worker、Model Gateway、Sandbox Controller、
GitLab Connector、File Security Worker、Operations Adapter
```

- `platform-gateway` 是当前 Platform Environment 的唯一北向应用入口，负责 TLS、路由、限流和受控 Console 入口，不承载领域决策。
- 同一 Umi Web 构建产物承载用户端和 `/admin` 管理路由；后端返回受限菜单数据，静态 Route Registry 决定可加载页面。
- Python Control Plane 是业务事实的应用协调者；独立 Deployable 通过稳定 Contract 工作，不能直读其私有表。
- DEV 与 PROD 使用同源代码、Contract 和模板，但各自实例化 Web、gateway、Control Plane、Session 与全部状态，不共享运行时组件或状态。

## 会话与请求主流程

1. Browser 以 Secure、HttpOnly、SameSite Cookie 访问当前环境 `platform-gateway`。
2. Web 取得当前 Principal、Workspace 摘要、有效 Capability 与导航数据，并由静态 Route Registry 渲染页面。
3. 每个受保护 API 仍由 Control Plane 使用当前身份、权限、范围、成员资格、责任与资源条件判定；前端隐藏菜单只改善体验。
4. 长任务同步返回受理结果，后续状态以 Query、SSE 或事件更新；外部副作用由 Outbox、Inbox 与 Effect Ledger 收敛。

## 配置、管理与运维关系

每个领域模块拥有自己的 Typed Configuration Schema、Policy 与解析器；Configuration Catalog 仅聚合已注册配置。`PLATFORM_POLICY` 的发布、回滚、权限和 Effective Snapshot 由本视图的 Configuration Contract 统一约束，具体领域取值仍由其 owner 定义。发布权限与 Super Admin 边界由 [01](../01-identity-organization-authorization/identity-organization-authorization-detail.md) 拥有。

平台管理后台只展示当前环境。它消费 Operations Read Model 展示健康、容量、告警、Drift 与 Runbook，并通过授权的新标签页打开专业 Console；它不成为基础设施写控制面。密钥、加密与安全审计机制见 [安全、审计与治理](../08-security-audit-governance/security-audit-governance-detail.md)；Cluster、Node 与容量基线见 [基础设施与运维](../09-infrastructure-operations/infrastructure-operations-detail.md)。

## 不变量

1. Browser 不直连数据库、NATS、Kubernetes、OpenBao、Model Gateway 或基础设施管理接口。
2. Web、gateway、Control Plane 和所有外部调用始终限制在单一当前环境；DEV 与 PROD 不共享实例、凭据或状态。
3. 模块不得导入其他模块的 ORM Model、Repository 或内部实体；跨模块只经公开 Facade、DTO 或事件协作。
4. 领域事务、Audit 与待发布消息原子写入；消息传输至少一次，业务效果由 Inbox/Effect Ledger 幂等化。
5. External Provider Contract 只导入可验证的只读状态，平台不以 Dashboard 或投影反写 IaC、Provider Desired State 或恢复事实。
