# Configuration Canonical Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Typed Configuration 从 06 拆分为独立 10 号 canonical 主题，将 Architecture Baseline 顺延为 11，并保持全部语义、链接和离线架构图一致。

**Architecture:** Configuration 仍是 Python Control Plane 模块化单体中的独立领域模块，不新增 Deployable 或微服务。新 10 唯一拥有通用 Configuration 生命周期，06 只消费 Effective Configuration Contract，各领域继续拥有自身 Key 的业务语义，11 只负责跨模块索引。

**Tech Stack:** Markdown、单文件 HTML/CSS/JavaScript、Node.js、happy-dom、Vitest、Biome、TypeScript、Git。

## Global Constraints

- 只修改架构文档、离线架构图及本次 Spec/Plan，不实现后端、前端页面、GitOps 或基础设施。
- 不改变任何配置默认值、权限、安全下限、发布、回滚、Promotion、Lineage 或 Divergence 语义。
- `10-configuration-governance` 是 Configuration 生命周期唯一 owner；06 和 11 不复制其状态或算法。
- Configuration 仍位于 `backend/control_plane/app/modules/configuration/`，不是独立微服务。
- Architecture Baseline 始终是最后一个编号主题。
- canonical Markdown 不保留历史选项、对话记录、迁移说明、TODO 或 TBD。
- HTML 保持离线、单文件、无外部资源，并保持键盘交互、打印分页和事实边界。
- 第 2 项“实施路线图与 Contract Applicability Matrix”不在本计划范围内。

---

### Task 1: 建立新编号与 Configuration Canonical Owner

**Files:**
- Create: `docs/architecture/10-configuration-governance/configuration-governance.md`
- Create: `docs/architecture/10-configuration-governance/configuration-governance-detail.md`
- Move: `docs/architecture/10-architecture-baseline/architecture-baseline.md` → `docs/architecture/11-architecture-baseline/architecture-baseline.md`
- Move: `docs/architecture/10-architecture-baseline/architecture-baseline-detail.md` → `docs/architecture/11-architecture-baseline/architecture-baseline-detail.md`
- Modify: `docs/architecture/06-platform-application-integration/platform-application-integration.md`
- Modify: `docs/architecture/06-platform-application-integration/platform-application-integration-detail.md`

**Interfaces:**
- Consumes: 已批准 Spec 中的 owner 边界，以及现有 06 Detail 的完整 Typed Configuration Contract。
- Produces: 新 10 L1/L2、收敛后的 06 L1/L2、顺延后的 11 L1/L2，供所有后续引用使用。

- [x] **Step 1: 记录迁移前 Configuration 契约边界**

Run:

```bash
rg -n '^## 6\. Typed Configuration Contract|^### 6\.[1-7]|^## 7\. External Provider Contract' docs/architecture/06-platform-application-integration/platform-application-integration-detail.md
```

Expected: 起点为 `## 6. Typed Configuration Contract`，终点紧邻 `## 7. External Provider Contract`，包含 6.1～6.7。

- [x] **Step 2: 顺延 Architecture Baseline 目录**

Run:

```bash
git mv docs/architecture/10-architecture-baseline docs/architecture/11-architecture-baseline
```

Expected: `10-architecture-baseline` 不存在，原两份 Baseline 文件位于 `11-architecture-baseline`。

- [x] **Step 3: 创建新 10 L1**

写入 `configuration-governance.md`，必须包含以下一级结构和语义：

```markdown
# Configuration Governance

## 目标与边界
## 配置分类与事实通道
## 生命周期概览
## Effective Snapshot 与消费关系
## DEV→PROD Promotion
## 不变量
```

L1 只提供分类、生命周期、Snapshot、Promotion 与 owner 关系概览，不复制 L2 字段和算法。

- [x] **Step 4: 创建新 10 L2 并完整迁移配置语义**

写入 `configuration-governance-detail.md`，使用以下连续结构：

```markdown
# Configuration Governance 详细说明

## 1. 目的与边界
## 2. Catalog、分类与 Schema
## 3. Draft、Owner 与归档
## 4. ChangeSet、发布、快照与回滚
## 5. Stale Draft、Rebase 与 Schema 演进
## 6. DEV→PROD Promotion
## 7. Import、Lineage、Rebind 与 Divergence
## 8. Audit Trigger 与业务摘要
## 9. 不变量
```

将现有 06 的 Configuration Contract 按上述责任重新编排，保留 Draft、Takeover、Clone、Archive、Validation、Preview、Optimistic Concurrency、Effective Snapshot、Rollback、Three-way Rebase、Schema 演进、签名 Bundle、Key 生命周期、Import、High-water、Rebind 与 Divergence 的全部规则。

- [x] **Step 5: 收敛 06 L1/L2**

从 06 L2 删除完整 Typed Configuration 章节，将后续章节连续编号；06 只保留一段消费新 10 Effective Configuration Contract 的关系说明。06 L1 删除其对 Configuration 生命周期的 owner 声明，保留模块地图中的 `configuration` 模块以及到新 10 的链接。

- [x] **Step 6: 验证 owner 唯一性**

Run:

```bash
rg -n 'Draft|Takeover|Three-way Rebase|Promotion Divergence|Source Lineage Rebind' docs/architecture/06-platform-application-integration
rg -n 'Draft|Takeover|Three-way Rebase|Promotion Divergence|Source Lineage Rebind' docs/architecture/10-configuration-governance
```

Expected: 第一条不返回 Configuration 生命周期定义；第二条覆盖全部关键规则。

- [x] **Step 7: 提交主题拆分**

```bash
git add docs/architecture/06-platform-application-integration docs/architecture/10-configuration-governance docs/architecture/11-architecture-baseline
git commit -m "docs(architecture): split configuration canonical owner"
```

---

### Task 2: 迁移跨模块 Owner 引用与编号索引

**Files:**
- Modify: `docs/architecture/README.md`
- Modify: `docs/architecture/00-platform-overview/platform-overview.md`
- Modify: `docs/architecture/00-platform-overview/platform-overview-detail.md`
- Modify: `docs/architecture/01-identity-organization-authorization/identity-organization-authorization-detail.md`
- Modify: `docs/architecture/04-sandbox-runtime/sandbox-runtime-detail.md`
- Modify: `docs/architecture/07-data-messaging-storage/data-messaging-storage.md`
- Modify: `docs/architecture/07-data-messaging-storage/data-messaging-storage-detail.md`
- Modify: `docs/architecture/08-security-audit-governance/security-audit-governance.md`
- Modify: `docs/architecture/09-infrastructure-operations/infrastructure-operations.md`
- Modify: `docs/architecture/09-infrastructure-operations/infrastructure-operations-detail.md`
- Modify: `docs/architecture/11-architecture-baseline/architecture-baseline.md`
- Modify: `docs/architecture/11-architecture-baseline/architecture-baseline-detail.md`
- Modify: `docs/superpowers/specs/2026-08-06-architecture-documentation-restructure-design.md`
- Modify: `docs/superpowers/plans/2026-08-06-architecture-documentation-restructure.md`

**Interfaces:**
- Consumes: Task 1 产生的新 10/11 路径和 owner。
- Produces: 唯一、无陈旧路径的主题索引与跨模块引用图。

- [x] **Step 1: 更新 README 与总览主题地图**

README 改为 `00`～`11` 共 12 个主题，增加 Configuration Governance，Architecture Baseline 改为 11。00 的系统上下文和导航明确 Configuration 是 Control Plane 内独立模块，并链接新 10，不描述为 Deployable。

- [x] **Step 2: 更新配置生命周期消费者**

将 01、04、07、08、09 中关于 Configuration Catalog、Policy 生命周期、发布、Snapshot、Effect Semantics 或 Promotion 的 owner 链接改为：

```markdown
[Configuration Governance](../10-configuration-governance/configuration-governance-detail.md)
```

保留指向 06 的 Web、Port/Adapter、External Provider、Operations Read Model、Console 和公告引用。

- [x] **Step 3: 更新 11 Architecture Baseline**

依赖方向调整为：00 总览；01～05 领域；06 应用与集成；07 数据；08 安全；09 基础设施；10 Configuration Governance；11 跨模块索引。Fact Owner Index 增加 10 并将自身改为 11；配置不变量和 Integration/configuration Evolution Gate 链接新 10。

- [x] **Step 4: 更新既有文档重构 Spec/Plan 的最终路径**

只更新受编号与 owner 变化影响的最终文件路径和数量，不加入迁移对话、备选方案或实施路线图内容。

- [x] **Step 5: 扫描陈旧引用**

Run:

```bash
rg -n '10-architecture-baseline|10 架构基线|00～10|Configuration Contract.*06-platform|配置生命周期.*06-platform' \
  docs/architecture --glob '*.md' \
  docs/superpowers/specs/2026-08-06-architecture-documentation-restructure-design.md \
  docs/superpowers/plans/2026-08-06-architecture-documentation-restructure.md
```

Expected: 无返回。本次拆分设计 Spec 明确记录 source 与 target，不在该陈旧引用检查范围内。

- [x] **Step 6: 验证引用语义没有被过度迁移**

Run:

```bash
rg -n 'External Provider|Operations Read Model|Console Access|安全公告' docs/architecture/06-platform-application-integration
rg -n 'PLATFORM_POLICY|GITOPS_CONFIG|SYSTEM_INVARIANT|Promotion Divergence' docs/architecture/10-configuration-governance
```

Expected: 应用/集成责任仍在 06，配置治理责任只在 10。

- [x] **Step 7: 提交引用迁移**

```bash
git add docs/architecture docs/superpowers/specs/2026-08-06-architecture-documentation-restructure-design.md docs/superpowers/plans/2026-08-06-architecture-documentation-restructure.md
git commit -m "docs(architecture): migrate configuration owner references"
```

---

### Task 3: 更新离线交互式架构图

**Files:**
- Modify: `docs/architecture/visuals/platform-architecture-map.html`

**Interfaces:**
- Consumes: 新 10/11 文档路径和“Configuration 是 Control Plane 内模块”的边界。
- Produces: 具有 Configuration 直接入口、无新增部署实例的离线架构图。

- [x] **Step 1: 扩展逻辑视图几何**

增加稳定节点 ID `logical-configuration`，标签为 `Configuration module`，说明“位于 Python Control Plane 内，不是独立微服务”。增加从 `logical-control` 到 `logical-configuration` 的模块内关系，并调整 SVG viewBox、固定宽高和节点位置，使边端点与节点边界对齐。

- [x] **Step 2: 增加节点详情与 canonical 链接**

`logical-configuration` 的 `data-doc-href` 指向：

```text
../10-configuration-governance/configuration-governance-detail.md
```

`nodeDetails` 必须说明其拥有配置治理生命周期、消费领域 Schema、仍属于模块化单体。三个详情面板的默认链接改为 11 Architecture Baseline。

- [x] **Step 3: 更新文档索引**

文档索引增加 10 Configuration Governance，并把 Architecture Baseline 改为 11；保持数字顺序和打印索引单页布局。

- [x] **Step 4: 静态验证 HTML Contract**

Run:

```bash
node <<'NODE'
const fs = require('fs');
const path = require('path');
const file = path.resolve('docs/architecture/visuals/platform-architecture-map.html');
const html = fs.readFileSync(file, 'utf8');
const errors = [];
if (/(?:src|href)=["']https?:/i.test(html)) errors.push('external resource');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
if (new Set(ids).size !== ids.length) errors.push('duplicate id');
const nodes = [...html.matchAll(/data-node-id="([^"]+)"/g)].map((match) => match[1]);
const nodeSet = new Set(nodes);
const edges = [...html.matchAll(/data-from="([^"]+)"\s+data-to="([^"]+)"/g)].map((match) => [match[1], match[2]]);
for (const [from, to] of edges) {
  if (!nodeSet.has(from) || !nodeSet.has(to)) errors.push(`missing endpoint ${from} -> ${to}`);
  if ((from.includes('deploy-dev-') && to.includes('deploy-prod-')) || (from.includes('deploy-prod-') && to.includes('deploy-dev-'))) errors.push(`cross environment ${from} -> ${to}`);
  if (from === 'business-jenkins' || to === 'business-jenkins') errors.push('Jenkins data edge');
}
for (const match of html.matchAll(/(?:href|data-doc-href)="([^"]+)"/g)) {
  const target = match[1].split('#')[0];
  if (!target || /^(?:https?:|mailto:|#)/.test(target)) continue;
  if (!fs.existsSync(path.resolve(path.dirname(file), target))) errors.push(`broken link ${target}`);
}
new Function(html.match(/<script>([\s\S]*?)<\/script>/)?.[1] || '');
if (nodes.length !== 48) errors.push(`node count ${nodes.length}`);
if (errors.length) throw new Error(errors.join('\n'));
console.log(JSON.stringify({ nodes: nodes.length, edges: edges.length, errors: 0 }));
NODE
```

Expected: `nodes=48`，`errors=0`。

- [x] **Step 5: 使用 happy-dom 验证交互**

模拟点击 `logical-configuration`，验证详情标题和链接更新；再验证业务 Selection、部署 DEV GitLab、Tab 切换、辅助层开关和 Escape Reset 均继续工作。

- [x] **Step 6: 浏览器与打印检查**

Run:

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --hide-scrollbars --window-size=1440,1100 --user-data-dir=/tmp/configuration-map-chrome --screenshot=/tmp/configuration-map.png file:///Users/liulijun/tongyi/unif-code/engineering-platform/.worktrees/configuration-canonical-split/docs/architecture/visuals/platform-architecture-map.html
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --user-data-dir=/tmp/configuration-map-print --print-to-pdf=/tmp/configuration-map.pdf --no-pdf-header-footer file:///Users/liulijun/tongyi/unif-code/engineering-platform/.worktrees/configuration-canonical-split/docs/architecture/visuals/platform-architecture-map.html
swift -e 'import Foundation; import PDFKit; let d = PDFDocument(url: URL(fileURLWithPath: "/tmp/configuration-map.pdf"))!; print(d.pageCount)'
```

Expected: 截图中节点与边对齐；PDF 页数为 `4`，业务、逻辑、部署、文档索引各一页，Configuration 节点不使逻辑页溢出。

- [ ] **Step 7: 提交 HTML 更新**

```bash
git add docs/architecture/visuals/platform-architecture-map.html
git commit -m "docs(architecture): expose configuration in architecture map"
```

---

### Task 4: 执行全量验证与独立审查

**Files:**
- Modify: `docs/superpowers/plans/2026-08-06-configuration-canonical-split.md`

**Interfaces:**
- Consumes: Tasks 1～3 的完整文档树和 HTML。
- Produces: 可审计的完成状态、干净分支和可合并结果。

- [ ] **Step 1: 验证目录契约**

Run:

```bash
node <<'NODE'
const fs = require('fs');
const path = require('path');
const root = path.resolve('docs/architecture');
const dirs = fs.readdirSync(root, { withFileTypes: true }).filter((entry) => entry.isDirectory() && /^\d{2}-/.test(entry.name)).map((entry) => entry.name).sort();
if (dirs.length !== 12) throw new Error(`expected 12 numbered directories, got ${dirs.length}`);
for (let index = 0; index < 12; index += 1) {
  const prefix = String(index).padStart(2, '0') + '-';
  const dir = dirs[index];
  if (!dir.startsWith(prefix)) throw new Error(`expected ${prefix}, got ${dir}`);
  const topic = dir.replace(/^\d{2}-/, '');
  const actual = fs.readdirSync(path.join(root, dir)).sort();
  const expected = [`${topic}-detail.md`, `${topic}.md`].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${dir}: ${actual.join(', ')}`);
}
let markdownCount = 0;
const walk = (directory) => fs.readdirSync(directory, { withFileTypes: true }).forEach((entry) => {
  const target = path.join(directory, entry.name);
  if (entry.isDirectory()) walk(target); else if (target.endsWith('.md')) markdownCount += 1;
});
walk(root);
if (markdownCount !== 25) throw new Error(`expected 25 Markdown files, got ${markdownCount}`);
console.log(JSON.stringify({ numberedDirectories: dirs.length, markdownFiles: markdownCount }));
NODE
```

Expected: `numberedDirectories=12`、`markdownFiles=25`。

- [ ] **Step 2: 验证全部相对链接和 Markdown 结构**

Run:

```bash
node <<'NODE'
const fs = require('fs');
const path = require('path');
const root = path.resolve('docs');
const files = [];
const walk = (directory) => fs.readdirSync(directory, { withFileTypes: true }).forEach((entry) => {
  const target = path.join(directory, entry.name);
  entry.isDirectory() ? walk(target) : files.push(target);
});
walk(root);
const errors = [];
for (const file of files.filter((item) => item.endsWith('.md'))) {
  const text = fs.readFileSync(file, 'utf8');
  if ((text.match(/^(?:\x60){3}/gm) || []).length % 2 !== 0) errors.push(`unclosed fence ${file}`);
  const prose = text.replace(/^```[^\n]*\n[\s\S]*?^```[^\n]*$/gm, '');
  for (const match of prose.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) {
    const target = match[1].trim().replace(/^<|>$/g, '').split('#')[0];
    if (!target || /^(?:https?:|mailto:|#)/.test(target)) continue;
    if (!fs.existsSync(path.resolve(path.dirname(file), decodeURIComponent(target)))) errors.push(`broken link ${file} -> ${target}`);
  }
}
if (errors.length) throw new Error(errors.join('\n'));
console.log(JSON.stringify({ checkedFiles: files.length, errors: 0 }));
NODE
git diff --check
```

Expected: `errors=0`；`git diff --check` 无输出。

- [ ] **Step 3: 扫描 canonical 纯净度**

Run:

```bash
rg -n '方案[[:space:]]*[A-C]|之前|本次讨论|用户确认|审查发现|待实施|首版|首发|TO[D]O|TB[D]|FIX[M]E|rolling-architecture|新[[:space:]]*10|文档.*拆分' docs/architecture --glob '*.md'
```

Expected: 无返回。

- [ ] **Step 4: 运行项目验证**

Run:

```bash
pnpm test
pnpm lint
```

Expected: Vitest 全部通过；Biome 和 `tsc --noEmit` exit 0。

- [ ] **Step 5: 执行两类独立审查**

分别审查：

1. Configuration 语义是否完整迁移、owner 是否唯一、规则是否无弱化；
2. 目录/链接/HTML 节点、几何、交互和打印是否正确。

任一审查发现阻断或重要问题时修正并重新运行相应验证。

- [ ] **Step 6: 标记计划完成并提交**

将本计划全部 checkbox 更新为 `[x]`，运行 `git diff --check`，然后：

```bash
git add docs/superpowers/plans/2026-08-06-configuration-canonical-split.md
git commit -m "docs(architecture): complete configuration canonical split"
```

- [ ] **Step 7: 合并前最终核对**

Run:

```bash
git status --short --branch
git diff --name-only main...HEAD
git log --oneline main..HEAD
```

Expected: 工作区干净；差异仅位于 `docs/`；提交历史包含设计、owner 拆分、引用迁移、HTML 更新和完成验证。

完成后按本地快进方式合并回 `main`，删除临时 worktree 和已合并分支。随后停止，不开始实施路线图，先向用户确认第 2 项的范围和启动时机。
