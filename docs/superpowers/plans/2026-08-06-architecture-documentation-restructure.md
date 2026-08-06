# Architecture Documentation Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将已批准的 `.173` 架构重写为具有唯一事实所有权的 `00～10` 目录体系，并交付一份离线、自包含、可交互的 HTML 架构图。

**Architecture:** 新文档按领域与技术视图拆分，每个编号目录包含主文和 detail；主文负责地图、边界和主流程，detail 负责唯一规范性 Contract。现有完整基线只作为重写事实输入，所有事实归位后删除旧平铺文件；HTML 从新文档路径引用节点详情，不成为新的架构事实源。

**Tech Stack:** Markdown、HTML5、CSS3、原生 JavaScript、内嵌 SVG、Ruby/awk/rg/Node.js 静态验证、Git。

## Global Constraints

- 保持架构基线 `2026-08-06.173` 的业务、安全、环境和容量语义；本计划不新增架构决策。
- 全部正文默认使用中文，API、Agent、Workflow、Capability、Scope、Port 等技术名词保留英文。
- 新文档必须重新归纳，禁止复制旧段落后局部改写。
- 架构正文不出现方案比较、废弃选项、旧名称对照、对话过程、批准过程或迁移过程。
- `<topic>.md` 只负责目标、边界、关系、主流程、不变量与链接；`<topic>-detail.md` 是该主题唯一规范性事实源。
- 同一状态、枚举、默认值、容量数字或不变量只允许一个 detail 拥有；其他文档必须链接到该 owner。
- 技术组件与稳定版本系列保留；精确 Patch、Image Digest、Provider SKU 和实时价格只作为 PCS、部署输入或 TCO Snapshot 引用。
- HTML 必须是单文件、无 CDN、无远程字体、无外部 JavaScript/CSS，离线直接打开可用。
- 不修改 `src/`、`config/`、`mock/`、`package.json` 或生成目录。
- 删除旧文档使用 `apply_patch`，不使用 `rm`；删除内容可从 Git 恢复。

---

### Task 1: 平台总览与身份组织授权

**Files:**
- Create: `docs/architecture/00-platform-overview/platform-overview.md`
- Create: `docs/architecture/00-platform-overview/platform-overview-detail.md`
- Create: `docs/architecture/01-identity-organization-authorization/identity-organization-authorization.md`
- Create: `docs/architecture/01-identity-organization-authorization/identity-organization-authorization-detail.md`

**Interfaces:**
- Consumes: 现有 `00-platform-architecture.md`、`01-organization-workspace-capability*.md` 和 `08` 中 Identity/Organization/Workspace/Authorization 的当前有效事实。
- Produces: 系统上下文、人员与授权模型的唯一文档路径，供后续 Workflow、应用、安全和 HTML 节点引用。

- [ ] **Step 1: 运行结构性失败检查**

Run:

```bash
test -f docs/architecture/00-platform-overview/platform-overview.md
```

Expected: FAIL，因为目标文件尚不存在。

- [ ] **Step 2: 编写 00 主文与 detail**

`platform-overview.md` 固定包含：平台定位、目标用户、系统边界、核心价值、端到端业务主链路、模块地图、当前非目标和阅读导航。

`platform-overview-detail.md` 固定包含：System Context、外部系统、逻辑分层、单个 Platform Environment 总体结构、DEV/PROD 实例语义、端到端责任链、全局依赖方向和架构质量目标；不包含组件精确版本、状态机全集或容量表。

- [ ] **Step 3: 编写 01 主文与 detail**

`identity-organization-authorization.md` 固定包含：本地身份、组织层级、Workspace 成员、Capability/Scope/Assignment、Super Admin 边界和关键不变量。

`identity-organization-authorization-detail.md` 唯一定义：8位员工编号、随机临时密码、15～32位正式密码、全员 TOTP、Session、账号状态；经理→Leader→普通员工；Owner/受邀Leader/动态成员/有时效协作；Capability+Scope+Assignment；Super Admin、配置授权、恢复和 Audit 语义。不得承载 Requirement 状态或基础设施认证细节。

- [ ] **Step 4: 运行该组内容检查**

Run:

```bash
test -s docs/architecture/00-platform-overview/platform-overview.md
test -s docs/architecture/00-platform-overview/platform-overview-detail.md
test -s docs/architecture/01-identity-organization-authorization/identity-organization-authorization.md
test -s docs/architecture/01-identity-organization-authorization/identity-organization-authorization-detail.md
rg -q '经理.*Leader.*普通员工' docs/architecture/01-identity-organization-authorization/identity-organization-authorization-detail.md
rg -q 'Capability.*Scope.*Assignment' docs/architecture/01-identity-organization-authorization/identity-organization-authorization-detail.md
```

Expected: 全部 PASS。

- [ ] **Step 5: 提交该组新文档**

```bash
git add docs/architecture/00-platform-overview docs/architecture/01-identity-organization-authorization
git commit -m "docs(architecture): rewrite overview and access model"
```

### Task 2: Requirement Workflow 与 Agent/Model

**Files:**
- Create: `docs/architecture/02-requirement-workflow/requirement-workflow.md`
- Create: `docs/architecture/02-requirement-workflow/requirement-workflow-detail.md`
- Create: `docs/architecture/03-agent-skill-model/agent-skill-model.md`
- Create: `docs/architecture/03-agent-skill-model/agent-skill-model-detail.md`

**Interfaces:**
- Consumes: 现有 `02-*`、`03-*`、`08` 的 Requirement/SDD/Gate/Agent/Model 有效事实，以及 Task 1 的身份与 Assignment 链接。
- Produces: Requirement、Artifact、Agent Attempt、Model Route 的唯一业务语义。

- [ ] **Step 1: 运行结构性失败检查**

```bash
test -f docs/architecture/02-requirement-workflow/requirement-workflow-detail.md
```

Expected: FAIL。

- [ ] **Step 2: 编写 Requirement Workflow 文档**

主文包含对象地图、创建与仓库选择、Route、SDD/Human Gate、WorkItem/Attempt、Artifact、集成验收、归档恢复和生命周期概览。

detail 唯一定义 Requirement/WorkItem/Route/Gate/Assignment/Decision/Artifact 的状态与版本语义；SDD 默认创建人审核及异步改派；`feat/fix/refactor/chore` Route；逻辑删除与恢复；并发、幂等、失败、外部验证证据和最终验收。GitLab 分支/MR 细节只链接 05，Agent 内部执行只链接 03。

- [ ] **Step 3: 编写 Agent/Skill/Model 文档**

主文包含 Agent、Skill、Chat Model、Execution Model、Run/Attempt/Execution Binding 和 Sandbox 关系。

detail 唯一定义 Agent Definition、Superpowers Runtime Bundle、Model Catalog/Capability/Route、百炼 `compatible-mode`、搜索/思考 Adapter、Run/Attempt 状态、不可变 Execution Binding、Child Execution、等待/恢复、Context/Tool/Network Policy、事件与失败语义。不得重复 Requirement Gate 或 Sandbox 物理实现。

- [ ] **Step 4: 运行该组内容检查**

```bash
rg -q '默认审核人.*创建人' docs/architecture/02-requirement-workflow/requirement-workflow-detail.md
rg -q 'systematic-debugging' docs/architecture/02-requirement-workflow/requirement-workflow-detail.md
rg -q 'Chat Model.*Execution Model' docs/architecture/03-agent-skill-model/agent-skill-model-detail.md
rg -q 'compatible-mode' docs/architecture/03-agent-skill-model/agent-skill-model-detail.md
```

Expected: 全部 PASS。

- [ ] **Step 5: 提交该组新文档**

```bash
git add docs/architecture/02-requirement-workflow docs/architecture/03-agent-skill-model
git commit -m "docs(architecture): rewrite workflow and agent model"
```

### Task 3: Sandbox Runtime 与 Source Control Delivery

**Files:**
- Create: `docs/architecture/04-sandbox-runtime/sandbox-runtime.md`
- Create: `docs/architecture/04-sandbox-runtime/sandbox-runtime-detail.md`
- Create: `docs/architecture/05-source-control-delivery/source-control-delivery.md`
- Create: `docs/architecture/05-source-control-delivery/source-control-delivery-detail.md`

**Interfaces:**
- Consumes: 现有 `04-*`、`05-*`、`08` 的 Sandbox/GitLab/KVM/Kata/MR 有效事实，以及 Task 2 的 Attempt/WorkItem 链接。
- Produces: 隔离执行和代码交付的唯一 Contract。

- [ ] **Step 1: 运行结构性失败检查**

```bash
test -f docs/architecture/04-sandbox-runtime/sandbox-runtime-detail.md
```

Expected: FAIL。

- [ ] **Step 2: 编写 Sandbox Runtime 文档**

主文包含 Sandbox 目标、Kata/KVM 隔离、Materialization、Resource Profile、网络/Secret、Image Build 和生命周期。

detail 唯一定义 Sandbox Environment 与 Platform Environment 区分；KVM Gate、不可变 Node Image、Kata Runtime、Controller Materialization、Capacity Unit、磁盘/内存/CPU、N+1、Egress、Secret tmpfs、Preview、Image Build、失败和清理。基础设施 Node 数与总容量只链接 09。

- [ ] **Step 3: 编写 Source Control Delivery 文档**

主文包含 GitLab Project、Requirement/WorkItem 仓库绑定、任务分支、Integration MR、外部 Jenkins、验收和 Formal MR。

detail 唯一定义 GitLab Binding、Branch Saga、`task → dev → task → main`、Integration Baseline、Formal Review Assignment、`headSha` 失效、分支保护、Webhook/Reconciliation、失败和多仓语义。明确 Jenkins 无 Adapter、Webhook 或状态投影。

- [ ] **Step 4: 运行该组内容检查**

```bash
rg -q 'Kata.*QEMU/KVM' docs/architecture/04-sandbox-runtime/sandbox-runtime-detail.md
rg -q 'N+1' docs/architecture/04-sandbox-runtime/sandbox-runtime-detail.md
rg -q 'task.*dev.*task.*main' docs/architecture/05-source-control-delivery/source-control-delivery-detail.md
rg -q '不存在 Jenkins Adapter' docs/architecture/05-source-control-delivery/source-control-delivery-detail.md
```

Expected: 全部 PASS。

- [ ] **Step 5: 提交该组新文档**

```bash
git add docs/architecture/04-sandbox-runtime docs/architecture/05-source-control-delivery
git commit -m "docs(architecture): rewrite sandbox and delivery"
```

### Task 4: Platform Application、Integration 与 Data Services

**Files:**
- Create: `docs/architecture/06-platform-application-integration/platform-application-integration.md`
- Create: `docs/architecture/06-platform-application-integration/platform-application-integration-detail.md`
- Create: `docs/architecture/07-data-messaging-storage/data-messaging-storage.md`
- Create: `docs/architecture/07-data-messaging-storage/data-messaging-storage-detail.md`

**Interfaces:**
- Consumes: 现有 `06-*`、`07-*`、`08` 的 Web/Control Plane/Port/Adapter/Configuration/PostgreSQL/Valkey/NATS/Temporal/Ceph 有效事实。
- Produces: 应用组件边界、集成 Contract、数据事实源和一致性的唯一技术文档。

- [ ] **Step 1: 运行结构性失败检查**

```bash
test -f docs/architecture/06-platform-application-integration/platform-application-integration-detail.md
```

Expected: FAIL。

- [ ] **Step 2: 编写 Platform Application/Integration 文档**

主文包含 Umi Web、platform-gateway、Python Control Plane、模块化单体、独立 Deployable、Port/Adapter、Typed Configuration、管理后台和集成边界。

detail 唯一定义前端应用边界、Session Bootstrap、Python 3.12/FastAPI/Pydantic/SQLAlchemy/Alembic 技术系列、模块依赖规则、Deployable、同步/异步通信、Outbox/Inbox、External Provider Contract、Operations Read Model、安全公告和 Console Access。不得重新定义领域状态或基础设施拓扑。

- [ ] **Step 3: 编写 Data/Messaging/Storage 文档**

主文包含事实源地图、PostgreSQL、Valkey、NATS、Temporal、Ceph/Object Storage、数据流和恢复关系。

detail 唯一定义 CloudNativePG、PgBouncer、Valkey/Sentinel、NATS JetStream、Temporal Persistence、Rook-Ceph RGW、Bucket Class、Artifact 存储、`stateful-rwo-lowlatency`、应用级备份、Retention Reconciler、数据一致性和组件故障语义。安全密钥机制只链接 08，Cluster/SKU/Node 容量只链接 09。

- [ ] **Step 4: 运行该组内容检查**

```bash
rg -q '模块化单体' docs/architecture/06-platform-application-integration/platform-application-integration-detail.md
rg -q 'External Provider Contract' docs/architecture/06-platform-application-integration/platform-application-integration-detail.md
rg -q 'PostgreSQL.*Valkey.*NATS.*Temporal' docs/architecture/07-data-messaging-storage/data-messaging-storage.md
rg -q 'stateful-rwo-lowlatency' docs/architecture/07-data-messaging-storage/data-messaging-storage-detail.md
```

Expected: 全部 PASS。

- [ ] **Step 5: 提交该组新文档**

```bash
git add docs/architecture/06-platform-application-integration docs/architecture/07-data-messaging-storage
git commit -m "docs(architecture): rewrite application and data views"
```

### Task 5: Security/Audit/Governance 与 Infrastructure/Operations

**Files:**
- Create: `docs/architecture/08-security-audit-governance/security-audit-governance.md`
- Create: `docs/architecture/08-security-audit-governance/security-audit-governance-detail.md`
- Create: `docs/architecture/09-infrastructure-operations/infrastructure-operations.md`
- Create: `docs/architecture/09-infrastructure-operations/infrastructure-operations-detail.md`

**Interfaces:**
- Consumes: 现有 `06-*`、`07-*`、`08` 中 Security/Audit/OpenBao/PKI/Kubernetes/Environment/Observability/HA/DR/Capacity/TCO 有效事实。
- Produces: 安全控制与基础设施运行基线的唯一事实源。

- [ ] **Step 1: 运行结构性失败检查**

```bash
test -f docs/architecture/08-security-audit-governance/security-audit-governance-detail.md
```

Expected: FAIL。

- [ ] **Step 2: 编写 Security/Audit/Governance 文档**

主文包含 Trust Boundary、Security Floor、身份安全引用、OpenBao/PKI、加密、Audit、文件和镜像供应链安全。

detail 唯一定义密码/TOTP存储安全引用、Secret Manager、Agent Injector、Shamir、Transit、PKI/CRL/OCSP/Trust Bundle、Kubernetes secretbox、Volume/Ceph/Object 加密、Audit WORM、File/Image Security、Provider Envelope Replay、Break-glass 和恢复信任顺序。业务身份语义只链接 01。

- [ ] **Step 3: 编写 Infrastructure/Operations 文档**

主文包含 DEV/PROD、Resource Account/VPC/Kubernetes、四类 Node Role、Gateway/Network、Observability、Cluster HA/DR、Capacity/TCO 和演进边界。

detail 唯一定义 CloudEnvironmentBinding、Single-Region/Single-Zone、Private API NLB、Kubernetes/Ubuntu/containerd/Cilium/Kata/cert-manager 技术系列、Node Pool、Storage Topology、Operations Collector/Watchdog、Observability 组件组、备份恢复、DEV 12/PROD 15 Node、Sandbox 5/8 Units、磁盘 BOM 与 TCO Contract。Region/Zone/SKU/价格保持部署输入。

- [ ] **Step 4: 运行该组内容检查**

```bash
rg -q 'OpenBao.*PKI' docs/architecture/08-security-audit-governance/security-audit-governance-detail.md
rg -q 'Audit.*WORM' docs/architecture/08-security-audit-governance/security-audit-governance-detail.md
rg -q 'DEV.*12.*PROD.*15' docs/architecture/09-infrastructure-operations/infrastructure-operations-detail.md
rg -q 'Cluster DR' docs/architecture/09-infrastructure-operations/infrastructure-operations-detail.md
```

Expected: 全部 PASS。

- [ ] **Step 5: 提交该组新文档**

```bash
git add docs/architecture/08-security-audit-governance docs/architecture/09-infrastructure-operations
git commit -m "docs(architecture): rewrite security and operations views"
```

### Task 6: Architecture Baseline、README 与旧文件收口

**Files:**
- Create: `docs/architecture/10-architecture-baseline/architecture-baseline.md`
- Create: `docs/architecture/10-architecture-baseline/architecture-baseline-detail.md`
- Rewrite: `docs/architecture/README.md`
- Delete: `docs/architecture/00-platform-architecture.md`
- Delete: `docs/architecture/01-organization-workspace-capability.md`
- Delete: `docs/architecture/01-organization-workspace-capability-detail.md`
- Delete: `docs/architecture/02-requirement-sdd-workflow.md`
- Delete: `docs/architecture/02-requirement-sdd-workflow-detail.md`
- Delete: `docs/architecture/03-agent-skill-model.md`
- Delete: `docs/architecture/03-agent-skill-model-detail.md`
- Delete: `docs/architecture/04-remote-sandbox.md`
- Delete: `docs/architecture/04-remote-sandbox-detail.md`
- Delete: `docs/architecture/05-source-control-delivery.md`
- Delete: `docs/architecture/05-source-control-delivery-detail.md`
- Delete: `docs/architecture/06-admin-audit-observability.md`
- Delete: `docs/architecture/06-admin-audit-observability-detail.md`
- Delete: `docs/architecture/07-platform-technical-architecture.md`
- Delete: `docs/architecture/07-platform-technical-architecture-detail.md`
- Delete: `docs/architecture/08-rolling-architecture-decision-baseline.md`

**Interfaces:**
- Consumes: Tasks 1～5 的最终文档路径和事实所有权。
- Produces: 唯一导航、全局不变量索引和无重复的最终目录树。

- [ ] **Step 1: 运行完整结构的失败检查**

```bash
test -f docs/architecture/10-architecture-baseline/architecture-baseline-detail.md
test ! -f docs/architecture/00-platform-architecture.md
```

Expected: FAIL。

- [ ] **Step 2: 编写 Architecture Baseline 主文与 detail**

主文只包含 `.173` 版本、架构状态、系统级原则、全局模块地图、阅读优先级和变更规则。

detail 只包含跨模块不变量矩阵、模块依赖方向、事实所有权索引、质量属性场景、环境/授权/安全/执行等跨模块约束及演进 Gate；不得复制任何模块状态机、组件配置表、容量 BOM 或历史批准过程。

- [ ] **Step 3: 重写 README**

README 只包含文档目标、四类受众阅读路径、`00～10` 导航、main/detail Contract、HTML入口和维护规则。不得重复身份、Workflow、技术选型或容量结论。

- [ ] **Step 4: 验证事实覆盖后删除旧平铺文件**

使用 `apply_patch` 删除上述16个旧架构 Markdown。删除前必须逐项确认 Tasks 1～5 的20个新文档和本 Task 的2个基线文档均存在且非空。

- [ ] **Step 5: 验证旧路径清零**

```bash
if rg -n '00-platform-architecture\.md|01-organization-workspace-capability|02-requirement-sdd-workflow|03-agent-skill-model\.md|04-remote-sandbox|05-source-control-delivery\.md|06-admin-audit-observability|07-platform-technical-architecture|08-rolling-architecture-decision-baseline' docs README.md --glob '*.md'; then exit 1; fi
```

Expected: 无输出，exit 0。

- [ ] **Step 6: 提交目录收口**

```bash
git add docs/architecture
git commit -m "docs(architecture): establish canonical document structure"
```

### Task 7: 自包含 HTML 架构图

**Files:**
- Create: `docs/architecture/visuals/platform-architecture-map.html`

**Interfaces:**
- Consumes: Task 6 的最终 Markdown 路径、模块名称和 `.173` 基线。
- Produces: 三视图交互架构图；节点只保存摘要和文档链接，不拥有规范性事实。

- [ ] **Step 1: 运行 HTML 结构性失败检查**

```bash
test -f docs/architecture/visuals/platform-architecture-map.html
```

Expected: FAIL。

- [ ] **Step 2: 编写页面语义结构与样式**

页面必须内嵌 Header、基线元数据、视图切换器、图例、主画布、详情侧栏和 Footer。CSS 必须实现响应式桌面布局、`prefers-color-scheme`、手工主题切换、Focus 样式、Reduced Motion 和 `@media print` A3横向友好输出。

- [ ] **Step 3: 编写三个 SVG/HTML 视图**

业务视图包含 Requirement→Route/SDD→Human Gate→WorkItem/Attempt→Integration MR→Jenkins人工验证→验收→Formal MR→main。

逻辑视图包含参与者、Edge/Gateway、Umi Web、Python Control Plane模块、Temporal/Orchestrator、Model Gateway、Sandbox Controller、Adapter、PostgreSQL/Valkey/NATS/OpenBao/Ceph和Observability。

部署视图包含当前DEV和未来PROD的独立Resource Account/VPC/Kubernetes边界、四类Node Role、外部Edge、Operations Collector、Watchdog、Cluster外备份、GitLab、Model Provider与Jenkins；两个环境之间不得有运行时共享连线。

- [ ] **Step 4: 编写原生交互**

内嵌 JavaScript 必须实现视图切换、节点点击详情、Hover/Focus上下游高亮、层级显示、重置、主题切换和键盘 Enter/Space 激活。详情链接必须指向最终 Markdown 相对路径。

- [ ] **Step 5: 运行静态 HTML 验证**

Run:

```bash
node -e "const fs=require('fs'); const p='docs/architecture/visuals/platform-architecture-map.html'; const h=fs.readFileSync(p,'utf8'); if (/(?:src|href)=['\"]https?:\\/\\//.test(h)) throw new Error('external dependency'); for (const id of ['business-view','logical-view','deployment-view','detail-panel','theme-toggle']) if (!h.includes('id=\"'+id+'\"')) throw new Error('missing '+id); const scripts=[...h.matchAll(/<script>([\\s\\S]*?)<\\/script>/g)].map(function(m){return m[1]}); scripts.forEach(function(s){new Function(s)}); console.log('html-contract=ok')"
```

Expected: `html-contract=ok`。

- [ ] **Step 6: 提交 HTML**

```bash
git add docs/architecture/visuals/platform-architecture-map.html
git commit -m "docs(architecture): add interactive architecture map"
```

### Task 8: 全库一致性与完成验证

**Files:**
- Verify: `docs/architecture/**/*.md`
- Verify: `docs/architecture/visuals/platform-architecture-map.html`
- Delete if still present: `docs/superpowers/specs/2026-08-02-platform-architecture-revision-design.md`

**Interfaces:**
- Consumes: Tasks 1～7 的全部交付物。
- Produces: 可证明的最终架构文档树和验证结果。

- [ ] **Step 1: 验证目标文件数量和目录**

```bash
test "$(find docs/architecture -mindepth 1 -maxdepth 1 -type d -name '[0-9][0-9]-*' | wc -l | tr -d ' ')" = 11
test "$(find docs/architecture -mindepth 2 -maxdepth 2 -type f -name '*.md' | wc -l | tr -d ' ')" = 22
test -f docs/architecture/visuals/platform-architecture-map.html
```

Expected: 全部 PASS。

- [ ] **Step 2: 验证 Markdown 链接和 Fence**

```bash
ruby -rpathname -e 'broken=[]; Dir["docs/architecture/**/*.md"].each { |f| File.read(f).scan(/\[[^\]]+\]\(([^)#]+\.md)(?:#[^)]*)?\)/).flatten.each { |link| next if link =~ %r{^[a-z]+://}; target=File.expand_path(link, File.dirname(f)); broken << "#{f} -> #{link}" unless File.file?(target) } }; abort(broken.join("\n")) unless broken.empty?; puts "relative_links=ok"'
awk 'FNR==1 { if (NR>1 && fence%2) bad=1; fence=0 } /^```/ { fence++ } END { if (fence%2) bad=1; exit bad }' $(find docs/architecture -type f -name '*.md' | sort)
```

Expected: `relative_links=ok` 且 exit 0。

- [ ] **Step 3: 验证纯粹性与唯一结构**

```bash
if rg -n '方案[[:space:]]*[A-C]|之前|改为|本次讨论|用户确认|用户已|审查发现|下一组|待最终|TO[D]O|TB[D]|FIX[M]E|rolling-architecture' docs/architecture --glob '*.md'; then exit 1; fi
```

Expected: 无输出，exit 0。若“之前”“改为”是必要业务语义，必须改写为不依赖历史上下文的当前态陈述。

- [ ] **Step 4: 验证 HTML 无外部依赖且文档链接存在**

```bash
node -e "const fs=require('fs'),path=require('path'); const p='docs/architecture/visuals/platform-architecture-map.html',h=fs.readFileSync(p,'utf8'); if (/(?:src|href)=['\"]https?:\\/\\//.test(h)) throw new Error('network dependency'); const links=[...h.matchAll(/href=['\"]([^'\"]+\\.md(?:#[^'\"]*)?)['\"]/g)].map(function(m){return m[1].split('#')[0]}); for(const l of links){if(!fs.existsSync(path.resolve(path.dirname(p),l))) throw new Error('broken '+l)} console.log('html_links='+links.length)"
```

Expected: 输出链接数量且 exit 0。

- [ ] **Step 5: 运行 Git 与范围检查**

```bash
git diff --check
git status --short
```

Expected: 无格式错误；变更范围仅为架构文档重构、HTML、计划/设计文档及旧Spec删除，不包含应用代码。

- [ ] **Step 6: 提交最终审查修正**

```bash
git add docs/architecture docs/superpowers/specs docs/superpowers/plans
git commit -m "docs(architecture): finalize canonical architecture set"
```
