# 架构文档重构与可视化设计

> 状态：已实施并通过验证
> 日期：2026-08-06
> 范围：`docs/architecture/` 文档信息架构与 HTML 架构图

## 1. 目标

将现有平铺的架构 Markdown 重构为按领域与技术视图组织的目录体系，并基于已批准架构基线生成一份自包含 HTML 架构图。

重构后的文档必须满足：

- 每类架构事实只有一个所有者；
- 主文与 detail 不互相复制；
- 不保留方案比较、废弃选项、对话过程或迁移历史；
- 开发人员、运维人员和 Agent 能从 README 快速定位权威内容；
- 保持架构基线 `2026-08-06.173` 的语义，不在文档重写中引入新架构决策；
- HTML 无外部依赖，离线打开即可使用。

## 2. 目标目录

```text
docs/architecture/
├── README.md
├── 00-platform-overview/
│   ├── platform-overview.md
│   └── platform-overview-detail.md
├── 01-identity-organization-authorization/
│   ├── identity-organization-authorization.md
│   └── identity-organization-authorization-detail.md
├── 02-requirement-workflow/
│   ├── requirement-workflow.md
│   └── requirement-workflow-detail.md
├── 03-agent-skill-model/
│   ├── agent-skill-model.md
│   └── agent-skill-model-detail.md
├── 04-sandbox-runtime/
│   ├── sandbox-runtime.md
│   └── sandbox-runtime-detail.md
├── 05-source-control-delivery/
│   ├── source-control-delivery.md
│   └── source-control-delivery-detail.md
├── 06-platform-application-integration/
│   ├── platform-application-integration.md
│   └── platform-application-integration-detail.md
├── 07-data-messaging-storage/
│   ├── data-messaging-storage.md
│   └── data-messaging-storage-detail.md
├── 08-security-audit-governance/
│   ├── security-audit-governance.md
│   └── security-audit-governance-detail.md
├── 09-infrastructure-operations/
│   ├── infrastructure-operations.md
│   └── infrastructure-operations-detail.md
├── 10-architecture-baseline/
│   ├── architecture-baseline.md
│   └── architecture-baseline-detail.md
└── visuals/
    └── platform-architecture-map.html
```

所有编号主题都使用目录。目录名表达主题，目录内部文件名不再重复编号。

## 3. 文档层级 Contract

### 3.1 主文

`<topic>.md` 只负责：

- 目标和范围；
- 系统或模块边界；
- 关键概念及组件关系；
- 主流程；
- 少量不可缺失的架构不变量；
- detail 和其他事实所有者的链接。

主文不是 detail 的缩写副本，不重复完整状态枚举、配置默认值、容量表或失败矩阵。

### 3.2 Detail

`<topic>-detail.md` 负责该主题的规范性 Contract：

- 领域对象与状态语义；
- Port、事件和依赖方向；
- 数据所有权与一致性；
- 授权、安全和信任边界；
- 失败、降级、恢复和并发语义；
- 可验证的质量与准入条件；
- 属于该主题唯一所有权的参数和默认值。

### 3.3 引用规则

- 同一状态、枚举、默认值、容量数字或不变量只在一个 detail 中定义；
- 其他文档使用相对链接指向权威章节，不重新抄写；
- 跨模块流程只描述交互顺序，不重新定义参与对象的状态含义；
- README 只提供导航、阅读顺序和文档 Contract，不承载架构规则。

## 4. 内容所有权

| 目录 | 唯一负责内容 |
| --- | --- |
| `00` | 平台目标、参与者、系统上下文、边界、端到端主流程和模块地图 |
| `01` | 本地账号、密码、TOTP、Session、组织、Workspace、Capability、Scope、Assignment、Super Admin |
| `02` | Requirement、WorkItem、Route、SDD、Human Gate、业务状态机、归档恢复与 Artifact 业务语义 |
| `03` | Agent、Skill、Model、Run、Attempt、Execution Binding 与 Model Gateway |
| `04` | Kata/KVM Sandbox、Image Build、Runtime Profile、资源、网络、Egress 与 Secret 注入 |
| `05` | GitLab Project、Repository、Branch、Integration MR、Formal MR 与 Jenkins 外部边界 |
| `06` | Umi Web、Python Control Plane、模块化单体、Deployable、Port/Adapter、配置后台与外部应用集成 |
| `07` | PostgreSQL、Valkey、NATS、Temporal、Ceph、Object Storage、数据事实源、一致性和组件级备份 |
| `08` | Security Floor、Trust Boundary、OpenBao、PKI、加密、Audit、文件与镜像供应链安全 |
| `09` | Platform Environment、Cloud Account、VPC、Kubernetes、网络、Observability、HA/DR、容量和 TCO |
| `10` | 架构版本、全局不变量、模块依赖方向、质量属性、事实所有权索引和演进规则 |

## 5. 重写规则

所有新文件根据权威事实重新归纳，不复制旧文档段落。重写时：

- 只使用当前有效架构的陈述语气；
- 删除 A/B/C 方案、选择过程、旧名称、旧默认值和废弃组件；
- 删除“之前”“改为”“本次讨论”“用户确认”“审查发现”“下一组”等过程语言；
- 将“首版”统一表达为“当前架构基线”，将未来能力写入明确的演进边界或非目标；
- 不把产品需求、页面交互、API Schema、数据库表或实施步骤混入架构正文；
- Umi、Python、PostgreSQL、Valkey、NATS、Temporal、OpenBao、Ceph、Kubernetes、Kata 等技术选型及稳定版本系列保留在对应事实所有者中；精确 Patch、Image Digest、Provider SKU 和实时价格只作为 PCS、部署输入或 TCO Snapshot 引用，不成为业务领域常量；
- 架构重写不得改变已经批准的业务、安全、容量和环境语义。若发现真实矛盾，停止相关主题重写并单独提出架构修订。

## 6. 原完整基线的处理

现有 `08-rolling-architecture-decision-baseline.md` 不原样迁移。

- 领域规则进入 `01～05` 对应 detail；
- 应用和集成规则进入 `06`；
- 数据组件规则进入 `07`；
- 安全和 Audit 规则进入 `08`；
- 基础设施、Observability、HA/DR、容量和 TCO 进入 `09`；
- 只有真正跨模块的不变量、依赖约束和事实所有权留在 `10`。

新 `10` 不再成为覆盖其他文档的第三份完整副本。

## 7. HTML 架构图

文件固定为：

```text
docs/architecture/visuals/platform-architecture-map.html
```

页面采用单文件内嵌 HTML、CSS、JavaScript 与 SVG，不加载 CDN、远程字体或在线资源。

页面包含三个可切换视图：

1. **业务交付链路**：平台责任链分别展示 05 owner 的 IntegrationBaselineEvidence/Integration MR 与 02 owner 的 RequirementIntegrationBaselineSelection，再进入验收、Formal MR 与 `main`；用户到 Jenkins 另以独立人工动作线呈现；
2. **逻辑架构**：用户、Gateway、Web、Control Plane、Workflow、Agent、Sandbox、Adapter、数据组件和 Observability；
3. **部署与信任边界**：当前 DEV、未来独立 PROD、Cloud Account、VPC、Kubernetes、Node Role、外部系统和运维边界。

交互要求：

- 点击节点展示职责、事实边界、主要依赖和对应 Markdown 链接；
- Hover 高亮上下游；
- 支持视图切换、层级显示、重置、深浅色和打印；
- 键盘可操作，颜色不是唯一语义；
- DEV 和 PROD 不绘制运行时共享连线；
- 用户到 Jenkins 使用人工动作线，平台与 Jenkins 之间不绘制 API/Webhook；
- 主图不展示完整状态枚举、精确 Patch、PVC、Bucket 配额、SKU 或价格。

## 8. 迁移与验证边界

实施时先建立全部新文件并完成内容重写，再统一修正链接，最后删除旧平铺文件。不得留下兼容副本或 Redirect Markdown，以免形成重复事实源。

必须验证：

- 所有 Markdown 相对链接可解析；
- HTML 中的文档链接可解析；
- 没有旧平铺文件和旧路径引用；
- 没有历史选项、对话痕迹、待办标记或未决占位符；
- 每类事实可以从事实所有权索引定位到唯一 detail；
- HTML 可离线打开、无网络请求，并在常见桌面宽度与打印模式下可读；
- `git diff --check` 通过；
- 仅改变文档组织与表达，不改变 `.173` 架构语义。

## 9. 完成标准

- `docs/architecture/` 与目标目录完全一致；
- README 能引导业务、开发、运维和 Agent 进入正确视图；
- `00～10` 主文与 detail 职责清晰且不重复；
- 旧 `00～08` 平铺 Markdown 全部删除；
- HTML 架构图完整表达主链路、逻辑架构、环境与信任边界；
- 文档与 HTML 的引用、格式和事实所有权检查全部通过。
