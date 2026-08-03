# 平台技术架构

> 文档层级：L1 精简版
> 状态：设计基线（待整体评审）
> 详细设计：[平台技术架构详细设计](./07-platform-technical-architecture-detail.md)

## 1. 当前态

当前仓库是 Umi Max、React 和 TypeScript 前端模板，已经具备 Ant Design、Pro Components、Ant Design X、React Query、Umi Access、Biome 和 Vitest，但尚无真实认证、动态菜单、业务模块和 Python 后端。

## 2. 目标架构

```text
Web App
  │
  ▼
Python Control Plane API
  ├── Identity
  ├── Organization
  ├── Workspace
  ├── Authorization
  ├── Requirement Workflow
  ├── Agent Run
  └── Audit
       │
       ├── Agent Orchestrator
       ├── Model Gateway
       ├── Sandbox Controller
       ├── GitLab Adapter
       └── Jenkins Adapter
```

## 3. 前端

用户端和管理端使用当前同一个 Umi Max 应用：

- 后端返回用户、Workspace、Capability 和菜单；
- Umi Access 负责界面级访问体验；
- API 仍由后端独立鉴权；
- React Query 管理服务端状态；
- Umi Model 只保存轻量全局客户端状态；
- Ant Design X 用于 Requirement Chat 和 Agent 过程展示；
- Pro Components 用于列表、表单和管理页面。

## 4. 后端

第一阶段采用一个 Python 模块化单体项目承载 Control Plane。它是一个部署单元，内部模块拥有独立领域模型、Application Service 和数据表，并通过明确接口或领域事件交互。高风险和高负载部分独立部署：

- Agent Orchestrator；
- Model Gateway；
- Sandbox Controller 和 Worker。

后续只有在容量、团队边界或发布节奏确实需要时，才把控制平面模块拆成独立服务。

## 5. 数据与事件

- 关系数据库保存用户、权限、Workspace、Requirement 和 Workflow 状态；
- Redis 保存短期缓存、锁和运行状态；
- Object Storage 保存 Spec、Plan、日志、测试报告和其他 Artifact；
- Secret Manager 保存 GitLab、Model 和 Sandbox 凭据；
- Transactional Outbox 保证领域事件与业务事务一致；
- Search/Analytics Store 按规模承载审计检索和指标分析。

## 6. 解耦方式

核心 Workflow 依赖稳定 Port：

- `SourceControlPort`；
- `ModelProviderPort`；
- `SandboxPort`；
- `RuntimeBundlePort`；
- `DeliveryPort`；
- `NotificationPort`。

GitLab、Model Provider、Kubernetes 和 Jenkins 都只是 Adapter，替换时不修改 Requirement 领域规则。第一阶段没有 SSO/HR Adapter，身份与组织均由 Control Plane 内部维护。

## 7. 质量与安全

- API Contract 优先；
- 状态转换带版本检查和幂等键；
- 外部 Webhook 去重并可重放；
- 权限撤销优先保证安全；
- 关键数据版本化，不原地覆盖；
- 单元、契约、集成、Workflow 和端到端测试分层；
- 日志、Trace、Metrics 使用统一 Correlation ID。
