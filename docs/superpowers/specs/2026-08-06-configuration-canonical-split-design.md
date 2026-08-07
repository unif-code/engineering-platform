# Configuration Canonical 拆分设计

> 状态：已批准
> 日期：2026-08-06

## 1. 目标

将 Typed Configuration 从“平台应用与集成”中拆分为独立 canonical 主题，使配置治理的领域边界、唯一事实 owner 和文档入口与目标 Python 模块化单体中的 `configuration` 模块一致。

本次只重构架构文档及离线架构图，不改变任何已经批准的配置业务规则，不创建后端代码、数据库 Schema、GitOps 文件或微服务。

## 2. 目标编号与目录

采用以下编号：

```text
06-platform-application-integration/
10-configuration-governance/
11-architecture-baseline/
```

新增：

```text
docs/architecture/10-configuration-governance/
  configuration-governance.md
  configuration-governance-detail.md
```

现有 `10-architecture-baseline/` 整体重命名为 `11-architecture-baseline/`。其正文只调整编号、索引和引用，不改变跨模块不变量、质量场景或 Evolution Gate 语义。

编号 `00`～`09` 除 06 的内容收敛外不移动，避免对数据、安全和基础设施主题产生无意义的路径变更。Architecture Baseline 始终保持为最后一个编号主题。

## 3. 唯一事实 Owner

### 3.1 Configuration Governance

新 10 主题唯一拥有：

- Configuration Catalog、配置分类与 Schema 注册约束；
- `PLATFORM_POLICY`、`GITOPS_CONFIG`、`SYSTEM_INVARIANT` 的权威通道和边界；
- Draft、Owner、Takeover、Clone、Archive 与 Stale 状态；
- ChangeSet、Validation、Impact Preview、Publish 与 Optimistic Concurrency；
- Effective Snapshot、Composite Revision、Effect Semantics 与 Rollback-as-new-version；
- Schema-aware Three-way Rebase 和 Configuration Schema 兼容演进；
- DEV→PROD Promotion Bundle、签名、Key 生命周期与目标环境 Mapping；
- Import Provenance、Source Lineage、High-water Mark、Rebind 与 Divergence Review；
- 配置生命周期、发布、回滚、Promotion 与 Divergence 的 Audit Trigger。

新主题只拥有通用配置治理 Contract。各领域模块继续拥有自身 Namespace、Typed Schema、默认值、约束、Reader/Migrator、解析器和业务解释。

### 3.2 Platform Application and Integration

06 主题保留：

- Umi Web、Session Bootstrap 与前端目录边界；
- Python Control Plane 模块化单体及模块依赖规则；
- 独立 Deployable、Port/Adapter 和同步/异步一致性；
- External Provider Contract、Operations Collector 与只读状态导入；
- Operations Read Model、Console Access 与安全公告。

06 只消费新 10 提供的 Effective Configuration Contract，不再定义 Draft、Publish、Rollback、Promotion、Lineage 或 Divergence 状态。

### 3.3 相邻 Owner

- 01 继续拥有 Super Admin、`platform.configuration.manage`、配置发布资格、TOTP Challenge 和恢复授权；10 消费其授权结论。
- 02～09 继续拥有各自配置 Key 的业务语义、默认值、安全下限、资源 Envelope 与运行影响；它们引用 10 的统一生命周期。
- 11 只索引跨模块不变量、Fact Owner、Quality Scenario 和 Evolution Gate，不复制 Configuration 状态或字段。

## 4. 模块与部署边界

Configuration 是 Python Control Plane 内的独立领域模块，目标路径仍为：

```text
backend/control_plane/app/modules/configuration/
```

拆分 canonical 文档不产生新的 Deployable，不新增网络跳转、数据库实例、消息通道或独立服务。Configuration 与其他模块仍通过公开 Application Facade、Typed DTO、领域事件和稳定 Port 协作；未来若提取为微服务，继续遵循既有模块提取 Gate。

## 5. 内容迁移规则

现有 06 Detail 的 `Typed Configuration Contract` 全部迁移到新 10 Detail，保持语义完整，不做摘要式复制。迁移后：

- 06 L1 只保留对 Configuration Contract 的关系说明；
- 10 L1 提供分类、生命周期、Snapshot、Promotion 和依赖关系概览；
- 10 Detail 成为通用配置治理规则的唯一规范事实源；
- 其他主题中的配置默认值和领域规则保留原位，只更新生命周期 owner 链接；
- 相同规则不得同时存在于 06 和 10。

新 10 Detail 使用连续章节组织：责任边界、Catalog 与分类、Draft 生命周期、发布与快照、Rebase 与 Schema 演进、跨环境 Promotion、Lineage 与 Divergence、Audit 与不变量。

## 6. 索引与引用迁移

必须同步更新：

- `docs/architecture/README.md` 的主题数量、编号、职责和入口；
- 00 总览中的模块地图和文档导航；
- 01 的配置授权消费者链接；
- 02～09 中所有指向 06 Configuration Contract 的链接；
- 原 10 Architecture Baseline 的全部路径和文本编号引用；
- 新 11 的 Fact Owner Index、依赖方向、不变量矩阵和 Evolution Gate；
- Spec、Plan 和 HTML 中受此次编号或 owner 变化影响的 canonical 引用。

所有链接使用相对路径。迁移完成后不得残留 `10-architecture-baseline` 旧路径，也不得将配置生命周期继续归属 06。

## 7. 离线 HTML 架构图

`platform-architecture-map.html` 保持单文件、离线、无外部资源，并进行以下调整：

- 文档索引新增 Configuration Governance，并将 Architecture Baseline 改为 11；
- 逻辑视图增加 `Configuration module` 节点，明确标注“位于 Python Control Plane 内，不是独立微服务”；
- Configuration 节点链接新 10 Detail；
- Python Control Plane 与 Configuration 使用模块内关系，不在部署视图增加服务或跨环境连接；
- 节点详情、边端点、键盘操作、辅助层、打印分页与既有业务链保持有效。

## 8. 验证标准

完成条件为：

1. 架构目录包含 `00`～`11` 共 12 个编号主题，每个主题严格只有一份 L1 与一份 L2。
2. 06 不再拥有 Configuration 生命周期，10 不复制各领域配置值，11 不复制领域规则。
3. 全部 Markdown 相对链接和 HTML 文档链接可解析。
4. 不存在旧 `10-architecture-baseline` 路径或将配置生命周期指向 06 的陈旧引用。
5. HTML 无外部依赖，节点 ID 唯一，全部边端点存在，DEV/PROD 无跨环境边，Jenkins 仍无平台数据边。
6. HTML 在桌面浏览器中节点与边对齐，打印视图按业务、逻辑、部署、文档索引分页。
7. canonical 文档不包含历史选项、对话记录、TODO、TBD 或迁移说明。
8. `pnpm test`、`pnpm lint`、TypeScript 和 `git diff --check` 通过。

## 9. 非目标

- 不编写实施路线图或 Contract Applicability Matrix；该工作必须在本次拆分完成后另行确认。
- 不创建机器可读 PCS、Capacity Profile、Resource Profile 或 GitOps Contract。
- 不重新决定 Self-managed、Managed-first 或 Hybrid 部署路线。
- 不修改现有配置默认值、权限、安全下限、发布语义或 DEV→PROD Promotion 规则。
- 不实现 Python Control Plane、Configuration API、数据库表、前端页面或微服务。
