# 上线优先架构与实施路线图重构 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在保留完整目标架构的同时，将 V1.0 上线必需能力、Capability Activation Gate 和上线后 Triggered Evolution 明确分离，并建立唯一实施路线图与容量规划入口。

**Architecture:** `00～11` 继续拥有稳定的目标架构 Contract，按照核心 Contract、能力激活条件、增强能力和触发式演进组织，但不复制版本号或实施状态。新增 `12-implementation-roadmap` 作为版本、优先级、验收、环境推广和容量场景的唯一事实源；GitOps、PCS 与 Operations Read Model 继续证明实际运行状态。

**Tech Stack:** Markdown、HTML5、CSS3、原生 JavaScript、内嵌 SVG、rg、Ruby/Node.js 静态验证、Git。

## Global Constraints

- 默认使用中文；API、Agent、Skill、Workflow、Capability、Scope、Gate、Profile、Contract 等技术名词保留英文。
- `00～11` 必须覆盖完整目标架构，不能为了首发删除未来能力、Port/Adapter、迁移方向或安全边界。
- `00～11` 不记录版本排期、实施百分比或环境部署状态；只允许固定链接到 `12`。
- `12` 是版本、阶段、状态、环境推广、Launch Profile 和人数容量场景的唯一计划事实源。
- DEV/PROD 是独立 Platform Environment，不是产品版本；同一 Image Digest/Bundle 经过 DEV Acceptance 后才能 Promotion 到 PROD。
- Gate 分类固定为 `Release Gate`、`Capability Activation Gate` 和 `Evolution Trigger`。
- 未实施的目标能力必须保持关闭，不允许以不满足安全 Contract 的半成品方式启用。
- V1.0 必须做到故障时安全停止、形成证据并可恢复；不要求所有单点故障下无感继续。
- V0.1～V0.3 DEV 使用 `1 × core`，基线为 `16 vCPU / 64 GiB / 200～256 GiB OS + 500 GiB Data`。
- 正式 Agent Sandbox 验收前必须增加专用 `sandbox-worker`；同机 Sandbox 只能标记为 `LAB_ONLY`。
- V1.0 首批 10 人 Launch Profile 为每环境 `3 × core + 1 × sandbox-worker`；完整四类 Node Role、DEV 12/PROD 15 Node 与 Sandbox N+1 属于 Hardened Target Profile。
- 首批已知活跃研发成员为 8 人，按 10 人档规划；经理等只读账号不进入 Sandbox 并发系数。
- 当前工作区中 `@ant-design/x`、promptfoo、EvalScope、OSV-Scanner 与 Flux GitOps 的已批准未提交内容必须保留并归入正确阶段。
- 正式架构文档不保留方案比较、对话过程、旧规则、迁移历史、TODO、TBD 或未决占位符。
- HTML 只提供视图、摘要和导航，不成为新的架构事实源；必须保持单文件、离线、无 CDN/远程字体/远程脚本。
- 不修改 `src/`、`config/`、`mock/`、依赖或生成目录。
- 每次 Git 提交只包含明确列出的路径，不能带入无关工作区修改。

---

### Task 1: 建立实施路线图唯一事实源

**Files:**
- Create: `docs/architecture/12-implementation-roadmap/implementation-roadmap.md`
- Create: `docs/architecture/12-implementation-roadmap/implementation-roadmap-detail.md`
- Modify: `docs/architecture/12-implementation-roadmap/environment-capacity-plan.md`

**Interfaces:**
- Consumes: 已批准的 V0.1～V1.0 纵向里程碑、三类 Gate、环境 Promotion 语义和容量规划。
- Produces: `00～11`、README 和 HTML 唯一引用的版本与实施状态入口。

- [ ] **Step 1: 编写 L1 路线图**

`implementation-roadmap.md` 固定包含三条互不混淆的轴：Capability Release、Environment Promotion、Reliability/Capacity Profile。使用一张依赖图展示 V0.1、V0.2、V0.3、V0.4、V0.5、V1.0；明确 V1.0 不增加功能，只 Promotion 已在 DEV 验收的候选制品。

- [ ] **Step 2: 编写 L2 版本 Contract**

`implementation-roadmap-detail.md` 对每个版本唯一记录：用户旅程、包含范围、不包含范围、前置依赖、Release Gate、验收证据与状态。版本固定为：

```text
V0.1 可运行基础
V0.2 访问治理闭环
V0.3 人工交付闭环
V0.4 Agent 纵向试点
V0.5 Production Candidate
V1.0 首次正式发布
```

实现状态使用 `NOT_STARTED | IN_PROGRESS | ACCEPTED | DEFERRED_POST_LAUNCH | BLOCKED`；环境推广状态独立使用 `NOT_DEPLOYED | DEV_ACCEPTED | PROD_CANDIDATE | PROD_RELEASED`。禁止百分比进度。

- [ ] **Step 3: 收口容量文档关系**

在 `environment-capacity-plan.md` 明确其只拥有容量场景与采购计划；路线图 detail 只引用选定 Profile，不抄写服务器表；09 只拥有容量不变量、准入方法和目标拓扑。

- [ ] **Step 4: 验证路线图结构**

```bash
test -s docs/architecture/12-implementation-roadmap/implementation-roadmap.md
test -s docs/architecture/12-implementation-roadmap/implementation-roadmap-detail.md
rg -q 'Capability Release.*Environment Promotion.*Reliability' docs/architecture/12-implementation-roadmap/implementation-roadmap.md
rg -q 'V0\.1.*V0\.2.*V0\.3.*V0\.4.*V0\.5.*V1\.0' docs/architecture/12-implementation-roadmap/implementation-roadmap-detail.md
```

Expected: 全部 PASS。

### Task 2: 重构导航、平台总览和架构基线

**Files:**
- Modify: `docs/architecture/README.md`
- Modify: `docs/architecture/00-platform-overview/platform-overview.md`
- Modify: `docs/architecture/00-platform-overview/platform-overview-detail.md`
- Modify: `docs/architecture/11-architecture-baseline/architecture-baseline.md`
- Modify: `docs/architecture/11-architecture-baseline/architecture-baseline-detail.md`

**Interfaces:**
- Consumes: Task 1 路线图路径和三层事实模型。
- Produces: 全文档共享的阅读规则、Gate 分类和基线版本。

- [ ] **Step 1: 重写 README 的事实层级与导航**

README 增加 Target Architecture、Implementation Roadmap、Deployed State 三层事实源；导航扩展到 12；开发阅读路径优先 `00 → 12 → 对应领域 detail`，架构评审仍使用 `00 → 11`。

- [ ] **Step 2: 重构 00 的总体表达**

00 继续完整显示全部目标模块和端到端责任链，同时明确 Core Platform、Launch Profile、Hardened Target Profile 与 Future Evolution。它不得复制版本范围、服务器数字或路线图状态。

- [ ] **Step 3: 将 11 的 Gate 拆成三类**

11 detail 分别定义 `Release Gate`、`Capability Activation Gate` 与 `Evolution Trigger`。删除“全部目标 Contract 自基线生效起都直接约束当前验收”的歧义；改为“被路线图选入当前 Release 的能力必须满足其目标 Contract，未选能力保持关闭”。

- [ ] **Step 4: 升级架构基线**

将基线更新为 `2026-08-06.175`，并确保 README、11 与 HTML 一致。

- [ ] **Step 5: 验证导航和 Gate**

```bash
rg -q '12.*实施路线' docs/architecture/README.md
rg -q 'Release Gate' docs/architecture/11-architecture-baseline/architecture-baseline-detail.md
rg -q 'Capability Activation Gate' docs/architecture/11-architecture-baseline/architecture-baseline-detail.md
rg -q 'Evolution Trigger' docs/architecture/11-architecture-baseline/architecture-baseline-detail.md
```

Expected: 全部 PASS。

### Task 3: 重构业务与执行领域的实施层次

**Files:**
- Modify: `docs/architecture/01-identity-organization-authorization/*.md`
- Modify: `docs/architecture/02-requirement-workflow/*.md`
- Modify: `docs/architecture/03-agent-skill-model/*.md`
- Modify: `docs/architecture/04-sandbox-runtime/*.md`
- Modify: `docs/architecture/05-source-control-delivery/*.md`

**Interfaces:**
- Consumes: Task 1 的版本边界和 Task 2 的 Gate 语义。
- Produces: 01～05 稳定目标 Contract；12 可引用其 Capability Package，而无需复制规则。

- [ ] **Step 1: 增加统一路线图入口**

每个 main/detail 只增加固定链接“实施阶段、激活状态和 Release 验收见 12”，不得写具体 V0.x/V1.x 编号。

- [ ] **Step 2: 按核心到演进顺序整理 01～03**

01 将本地身份、TOTP、Session、Organization、Workspace 和服务端授权置前，Passkey/WebAuthn 保持后置演进边界。02 将 Requirement/SDD/人工责任链置前，多仓与高级 Artifact 协作后置。03 将 Model Route、Run/Attempt、不可变 Binding 置前，Evaluation、WAITING_CHILD、Child Execution 和高级恢复后置；保留当前 promptfoo/EvalScope 内容。

- [ ] **Step 3: 修正 Sandbox Gate 语义**

04 保留 Kata/KVM、专用 Sandbox Host、Request/Limit、Deadline、Fencing、Network/Secret 和 Fail Closed 作为正式 Agent 的 Activation Gate。将“每个环境无条件 N+1”和固定 DEV 5/PROD 8 的物理 Ceiling 改为 Hardened Target；Launch Profile 读取 12 的有效 Capacity Profile。

- [ ] **Step 4: 保持人工交付先于 Agent 自动化**

05 先描述 GitLab Project/Repository、Branch、Integration MR、人工 Jenkins Evidence、Acceptance、Formal MR 与 Review，再描述 Agent 产生 Commit/Push 的受控来源；不得把 Jenkins 变成平台 Adapter。

- [ ] **Step 5: 验证领域层不复制版本状态**

```bash
if rg -n 'V0\.[1-9]|V1\.0|NOT_STARTED|PROD_RELEASED' docs/architecture/{01-identity-organization-authorization,02-requirement-workflow,03-agent-skill-model,04-sandbox-runtime,05-source-control-delivery} --glob '*.md'; then exit 1; fi
rg -q 'Hardened Target' docs/architecture/04-sandbox-runtime/sandbox-runtime-detail.md
```

Expected: 第一个命令无输出且 exit 0；第二个 PASS。

### Task 4: 重构应用、数据、安全与配置的激活边界

**Files:**
- Modify: `docs/architecture/06-platform-application-integration/*.md`
- Modify: `docs/architecture/07-data-messaging-storage/*.md`
- Modify: `docs/architecture/08-security-audit-governance/*.md`
- Modify: `docs/architecture/10-configuration-governance/*.md`

**Interfaces:**
- Consumes: Task 1 的 Capability Package、Task 2 Gate 分类和 09 的 Profile 名称。
- Produces: 组件在首次被能力消费时才激活的目标 Contract，不形成“开发初期安装全部组件”的误读。

- [ ] **Step 1: 重构应用与集成顺序**

06 先描述 Umi Web、Python 模块化单体、OpenAPI、事务与 Port/Adapter；将 Operations Read Model、安全公告、复杂 Console 和高级 Provider 治理置后。保留 `@ant-design/x`、Flux、OSV-Scanner 的已批准内容，并明确未启用能力不需要部署其专属 Deployable。

- [ ] **Step 2: 将数据服务分成 Launch 与 Hardened Profile**

07 保留 PostgreSQL、Valkey、NATS、Temporal、Object Storage 的完整目标 Contract；明确 PostgreSQL 是最早权威事实源，Valkey/NATS/Temporal/Object Storage 只在对应 Capability Package 首次消费时激活。单实例 Launch Profile 必须保留 Backup/Restore、TLS、身份、资源硬上限和 Fail Closed；完整 Replica/Standby/Sentinel/Quorum 是 Hardened Target Profile。

- [ ] **Step 3: 将安全底线与 HA 拆开**

08 将 Password/TOTP、Secret 不落环境变量、Workload Identity、TLS、Audit、供应链检查和恢复能力列为 Security Floor；OpenBao 多 Voting Server、完整 PKI 轮换、Scanner 多副本和更高 DR 频率列入 Hardened Target，但不得弱化启用能力时的安全判定。

- [ ] **Step 4: 将 Configuration 基础生命周期与高级治理拆开**

10 将 Typed Schema、Super Admin、Publish、Effective Snapshot、Audit 和 Rollback 置前；Draft Takeover、Three-way Rebase、DEV→PROD Bundle Promotion、Lineage High-water 和 Divergence Review 后置为增强 Contract。版本归属仍只见 12。

- [ ] **Step 5: 验证激活边界**

```bash
rg -q '首次消费.*激活' docs/architecture/07-data-messaging-storage/data-messaging-storage-detail.md
rg -q 'Security Floor' docs/architecture/08-security-audit-governance/security-audit-governance-detail.md
rg -q '增强 Contract' docs/architecture/10-configuration-governance/configuration-governance-detail.md
```

Expected: 全部 PASS。

### Task 5: 将基础设施拆为 Launch 与 Hardened Target

**Files:**
- Modify: `docs/architecture/09-infrastructure-operations/infrastructure-operations.md`
- Modify: `docs/architecture/09-infrastructure-operations/infrastructure-operations-detail.md`

**Interfaces:**
- Consumes: `environment-capacity-plan.md` 的阶段和人数场景，以及 04/07/08 的 Activation Gate。
- Produces: 基础设施不变量、Compact Launch Profile、Hardened Target Profile 和触发迁移 Contract。

- [ ] **Step 1: 重写 Node Role 语义**

逻辑 Role 始终保持 Control Plane、Platform、Sandbox、Storage 边界；物理放置允许 Launch Profile 使用融合 `core` Node，但 Sandbox 正式验收后必须物理独立。Hardened Target 再拆为四类专用 Node Pool。

- [ ] **Step 2: 定义阶段 Profile**

09 detail 固定包含以下阶段，但 CPU、RAM、Disk 和人数矩阵只链接容量规划文件，不在 09 重抄：

```text
V0.1～V0.3 DEV：1 × core，NON_HA
V0.4 验收：1 × core + 1 × sandbox-worker
V0.5 DEV Candidate：3 × core + 1 × sandbox-worker
V1.0 PROD Launch：3 × core + 1 × sandbox-worker
Hardened Target：DEV 12 Node / PROD 15 Node
```

- [ ] **Step 3: 拆分 Observability、DR 与 Tool Job Profile**

Launch Profile 使用最小 Metrics/Logs/Alert、Backup/Restore 和只读 Operations Health；完整 Prometheus/Alertmanager/Loki Replica、Thanos、外部 Collector/Watchdog 和高级 DR 放入 Hardened Target。promptfoo、EvalScope、OSV-Scanner 仍按一次性受限 Job 保留，不要求在尚未启用其能力时常驻。

- [ ] **Step 4: 定义触发迁移**

保留 Queue、Capacity Rejection、Sandbox/Storage p95、SLO、维护窗口、Recovery 与 TCO 证据。Trigger 未达到时不要求物理拆分；发布前已达到 Trigger 时，对应增强自动成为 Release Blocker。

- [ ] **Step 5: 验证旧首发语义清零**

```bash
if rg -n '首个 Active Capacity Profile.*DEV.*5.*PROD.*8|每个环境使用.*四类专用 Node' docs/architecture/09-infrastructure-operations --glob '*.md'; then exit 1; fi
rg -q 'Launch Profile' docs/architecture/09-infrastructure-operations/infrastructure-operations-detail.md
rg -q 'Hardened Target Profile' docs/architecture/09-infrastructure-operations/infrastructure-operations-detail.md
```

Expected: 第一个命令无输出且 exit 0；其余 PASS。

### Task 6: 更新 HTML 架构图

**Files:**
- Modify: `docs/architecture/visuals/platform-architecture-map.html`

**Interfaces:**
- Consumes: Tasks 1～5 的最终路径、Profile 和 Gate 名称。
- Produces: 目标架构、V1.0 Launch 和 Triggered Evolution 可切换的离线视图。

- [ ] **Step 1: 增加路线图视图或 Profile 过滤器**

页面必须能区分完整 Target Architecture、V1.0 Launch Scope 和 Triggered Evolution；不能通过删除目标节点来表达首发范围。

- [ ] **Step 2: 更新部署视图**

部署视图同时展示融合 Core Launch Profile 与四类 Node Pool Hardened Target，并明确 DEV/PROD 是相同组件模板的独立实例，不共享运行时资源。

- [ ] **Step 3: 更新导航和基线**

增加 12 的 Markdown 导航；将基线统一为 `2026-08-06.175`；详情面板只显示摘要、Owner 和文档链接。

- [ ] **Step 4: 验证 HTML**

```bash
node -e "const fs=require('fs');const p='docs/architecture/visuals/platform-architecture-map.html';const h=fs.readFileSync(p,'utf8');if(/(?:src|href)=['\"]https?:\/\//.test(h))throw new Error('external dependency');for(const s of ['2026-08-06.175','Launch Profile','Hardened Target','12-implementation-roadmap'])if(!h.includes(s))throw new Error('missing '+s);for(const m of h.matchAll(/<script>([\s\S]*?)<\/script>/g))new Function(m[1]);console.log('html-contract=ok')"
```

Expected: `html-contract=ok`。

### Task 7: 全量一致性验证与路径限定提交

**Files:**
- Verify: `docs/architecture/**/*.md`
- Verify: `docs/architecture/visuals/platform-architecture-map.html`

**Interfaces:**
- Consumes: Tasks 1～6 的全部结果。
- Produces: 可交付、无重复事实、无断链的 `.175` 架构文档集。

- [ ] **Step 1: 验证 Markdown 相对链接**

使用 Ruby 扫描全部 Markdown 中非 HTTP、非锚点链接，以当前文件目录解析目标并检查存在。任何断链都必须在提交前修正。

- [ ] **Step 2: 验证历史语言与占位符**

```bash
if rg -n 'TBD|TODO|待定|旧方案|用户确认|本次讨论|之前选择|方案[ABC]' docs/architecture --glob '*.md'; then exit 1; fi
```

Expected: 无输出，exit 0。

- [ ] **Step 3: 验证事实源边界**

确认具体 V0.x/V1.0 版本号只存在于 `12`、README 的导航说明和 HTML 路线视图；01～10 不包含实施状态枚举。确认服务器人数矩阵只存在于 `environment-capacity-plan.md`。

- [ ] **Step 4: 运行格式与仓库检查**

```bash
git diff --check
git status --short
```

Expected: `git diff --check` 无输出；`git status` 只列出本轮明确修改和先前已知架构文件。

- [ ] **Step 5: 路径限定提交**

```bash
git add docs/architecture docs/superpowers/plans/2026-08-06-launch-first-architecture-roadmap-restructure.md
git commit -m "docs(architecture): separate launch roadmap from target baseline"
```

提交前用 `git diff --cached --name-status` 确认不包含 `src/`、配置、依赖或其他无关文件。
