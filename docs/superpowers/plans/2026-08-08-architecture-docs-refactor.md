# 架构文档重构实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `docs/architecture` 从 28 个文件/约 3500 行重构为约 16 个文件/≤1600 行:每主题一篇、参数唯一附录、README 承载所有权矩阵。

**Architecture:** 三阶段执行。Phase 0 隔离存量修改;Phase 1 机械合并 L1/L2 为平铺单篇(无事实损失,链接用脚本批量重写);Phase 2 建参数附录、重写 README、逐篇按四节模板精简,最后更新 HTML 地图并跑验收脚本。

**Tech Stack:** Markdown、git、macOS bash(BSD sed/grep/awk)。无新工具链。

**Spec:** `docs/superpowers/specs/2026-08-08-architecture-docs-refactor-design.md`

## Global Constraints

- 工作目录:所有命令默认在 `/Users/liulijun/tongyi/unif-code/engineering-platform/docs/architecture` 下执行(cd 一次即可)。
- 总行数:`cat *.md | wc -l` ≤ 1600(不含 `visuals/`)。
- 单篇行数:每篇主题文档 ≤150 行;`00-platform-overview.md` 和 `12-implementation-roadmap.md` ≤180 行。
- 篇内模板(Phase 2 后每篇主题文档只允许这四个二级标题,顺序固定):
  `## 目标与边界`、`## 核心模型`、`## 关键不变量`、`## 与其他模块的关系`。
- 参数唯一性:精确资源数值(如 `2 / 4 vCPU`、`6 / 8 GiB`)、Policy Key(如 `agent.sandbox.active_attempt_limit`)、错误码(如 `CAPACITY_UNAVAILABLE`)、Port 方法清单、Runtime 组件版本、容量数字只允许出现在 `appendix-parameters.md`。
- **不删清单**(精简时必须保留语义):不变量语义、安全边界、Fail Closed 语义、模块间协作规则、Gate 的语义定义。
- 行文:叙述性中文,专有名词保留英文;表格只装可枚举事实,规则写正文。
- 不修改架构语义本身:重构结构,不重新设计平台;吃不准某段是否可删时保留并在 commit message 里注明。
- 提交:Conventional Commits;每条 commit message 结尾加:
  `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
- 新旧文件名映射(目录名即新文件名):`NN-<topic>/` 目录下两个 md 合并为根级 `NN-<topic>.md`,共 13 篇(00~12);`12-implementation-roadmap/environment-capacity-plan.md` 在 Phase 1 平铺为根级 `environment-capacity-plan.md`,Phase 2 并入 `appendix-parameters.md` 后删除。

### 统一合并规程(Phase 1 各合并任务使用)

对每个主题 `NN-<topic>`:

1. `git mv NN-<topic>/<topic>-detail.md NN-<topic>.md`
2. 编辑 `NN-<topic>.md`:标题从"XX 详细说明"改为主题名;删除头部 blockquote 中"文档层级/对应主文"两行(指向 12 的那行保留)。
3. 读 `NN-<topic>/<topic>.md`(L1),逐节对照合并后的文件:与 L2 重复的段落丢弃(以 L2 表述为准);L1 独有内容(常见:总览段、text tree 结构图、主链路图、"不变量与关系"里 L2 没有的条目)插入合并文件对应章节,找不到对应章节的放在第一个章节之后。
4. `git rm NN-<topic>/<topic>.md`(目录随之消失)。
5. 检查合并文件内残留的同主题旧链接(如 `](./<topic>-detail.md)` 或 `](./<topic>.md)`):目标内容已在本篇之内,删除链接、保留链接文字。
6. 验证:`test -f NN-<topic>.md && test ! -d NN-<topic> && echo OK`;`wc -l NN-<topic>.md` 应大于原 detail 行数、小于 L1+L2 之和。

### 统一精简规程(Phase 2 各精简任务使用)

对每篇 `NN-<topic>.md`:

1. 通读全文,按四节模板重排:
   - 现有"责任边界/目标"内容 → `## 目标与边界`(≤3 段;"不拥有什么"压缩为一段带 README 所有权矩阵链接的短文)。
   - 对象表、概念定义、text tree → `## 核心模型`。
   - 散落各节的规则、Gate 语义、Fail Closed 条款 → `## 关键不变量`(列表,每条 = 决策 + 一句理由)。
   - 与其他模块的消费/提供关系 → `## 与其他模块的关系`(一张表:模块 | 消费 | 提供)。
2. 删除逐段所有权声明:`grep -n '只由\|唯一拥有\|唯一规范事实源\|唯一事实源' NN-<topic>.md` 找到的段落删除或压缩成矩阵链接;正文只在读者需要跳转处保留 `[模块名](./NN-x.md)` 链接。
3. 迁参数:含精确数值/Key/错误码/方法清单的表格和代码块删除,替换为一句定性规则 + `具体见[参数附录](./appendix-parameters.md#对应锚点)`。(内容此前已由 Task 8 复制进附录,删除前用 grep 在附录确认存在。)
4. 验证(每篇必跑):

```bash
f=NN-<topic>.md; max=150   # 00/12 用 180
wc -l "$f"                                              # ≤ max
grep -cE '^## ' "$f"                                    # = 4
grep -nE '[0-9]+ ?/ ?[0-9]+ ?vCPU|[0-9]+ ?GiB|active_attempt_limit|active_build_limit|CAPACITY_UNAVAILABLE|POLICY_LIMIT_REACHED|POLICY_DISABLED|RESOURCE_EXHAUSTED' "$f"   # 无输出
```

5. Commit:`docs(architecture): condense NN-<topic> to template`

### 精简示例(取自 04,定风格用)

所有权声明段(删除,归矩阵):

> 删除前:"本文是 Sandbox Environment、Kata/KVM 物理隔离…的唯一规范事实源。Requirement、WorkItem、Gate、Decision…只由 `Requirement Workflow` 拥有；`IntegrationBaselineEvidence` 只由 `Source Control 与交付` 拥有；…"
>
> 删除后(目标与边界节一句话):"业务状态、代码事实与审计规则的归属见 `README` 的事实所有权矩阵。"

参数表(迁附录):

> 删除前:`| resource/standard-v1 | 2 / 4 vCPU | 6 / 8 GiB | 30 / 50 GiB | 1 |` 整表
>
> 删除后:"Resource Profile 是不可变的 `GITOPS_CONFIG`，用户不可自选规格；资源向量与 Unit 权重见参数附录的 `resource-profile`。"

不变量写法:

> "- Kata 启动失败绝不降级为普通容器 Runtime——隔离保证优先于可用性。"

---

## Phase 0

### Task 1: 提交存量修改

**Files:**
- Modify: 无(只提交工作区已有改动:CLAUDE.md + 14 个 docs 文件)

**Interfaces:**
- Produces: 干净工作区,后续重构 diff 不混入存量修改

- [ ] **Step 1: 确认改动清单**

```bash
cd /Users/liulijun/tongyi/unif-code/engineering-platform
git status --porcelain
```

预期:只有以 ` M ` 开头的行(CLAUDE.md 与 docs/architecture 下文件);若出现未预期的未跟踪文件,停下来问用户。

- [ ] **Step 2: 提交**

```bash
git add -A
git commit -m "docs: checkpoint pending architecture edits before restructure

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

- [ ] **Step 3: 验证工作区干净**

```bash
git status --porcelain   # 无输出
```

---

## Phase 1(机械合并,无事实损失)

### Task 2: 批量重写跨文档链接为平铺路径

**Files:**
- Modify: `docs/architecture/*.md`、`docs/architecture/*/*.md`(全部 Markdown)

**Interfaces:**
- Produces: 所有 `](../NN-x/file.md)` 和 `](./NN-x/file.md)` 形式的链接统一变为 `](./NN-x.md)`;容量规划链接变为 `](./environment-capacity-plan.md)`。链接在本任务完成时暂时指向尚不存在的文件,属预期中间态,Task 7 验证收敛。

- [ ] **Step 1: 记录重写前链接清单(供对照)**

```bash
cd /Users/liulijun/tongyi/unif-code/engineering-platform/docs/architecture
grep -horE '\]\((\.\./|\./)[^)]+\.md' *.md */*.md | sort | uniq -c | sort -rn > /tmp/links-before.txt
wc -l /tmp/links-before.txt
```

- [ ] **Step 2: 执行 sed 重写(BSD sed)**

```bash
sed -E -i '' \
  -e 's#\]\((\.\./|\./)12-implementation-roadmap/environment-capacity-plan\.md#](./environment-capacity-plan.md#g' \
  -e 's#\]\((\.\./|\./)([0-9]{2}-[a-z-]+)/[a-z0-9-]+\.md#](./\2.md#g' \
  *.md */*.md
```

- [ ] **Step 3: 验证无残留旧式链接**

```bash
grep -nE '\]\((\.\./|\./)[0-9]{2}-[a-z-]+/' *.md */*.md   # 无输出
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "docs(architecture): rewrite cross-doc links to flat paths

链接指向的平铺文件由后续合并任务创建,本提交为中间态。

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 3: 合并主题 00~03

**Files:**
- Create: `00-platform-overview.md`、`01-identity-organization-authorization.md`、`02-requirement-workflow.md`、`03-agent-skill-model.md`
- Delete: 对应四个子目录及其中两个 md

**Interfaces:**
- Consumes: Task 2 重写后的链接
- Produces: 四篇平铺合并文档(供 Phase 2 精简)

- [ ] **Step 1: 按"统一合并规程"依次合并 00、01、02、03**

00 的 L1 独有内容较多(平台定位、模块地图 text tree、端到端主链路、Profile 与演进边界、稳定边界),全部并入;它们是总览的主体。

- [ ] **Step 2: 逐主题跑合并规程第 6 步验证**

- [ ] **Step 3: 人工核对无事实损失**

对每个主题:`git show HEAD:docs/architecture/NN-<topic>/<topic>.md` 输出 L1 原文,逐节确认其内容要么已在合并文件中、要么是与 L2 重复而被丢弃的段落。

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "docs(architecture): merge 00-03 L1/L2 into single docs

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 4: 合并主题 04~07

**Files:**
- Create: `04-sandbox-runtime.md`、`05-source-control-delivery.md`、`06-platform-application-integration.md`、`07-data-messaging-storage.md`
- Delete: 对应四个子目录

**Interfaces:**
- Consumes: Task 2 重写后的链接
- Produces: 四篇平铺合并文档

- [ ] **Step 1: 按"统一合并规程"依次合并 04、05、06、07**

04 已知重复:L1"正式 Agent Capability Activation Gate"一节与 L2 §1.1/§2 重复,丢弃 L1 版本;L1 的逻辑环境 text tree 是独有内容,并入 L2 §1。

- [ ] **Step 2: 逐主题跑合并规程第 6 步验证**

- [ ] **Step 3: 人工核对无事实损失**(方法同 Task 3 Step 3)

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "docs(architecture): merge 04-07 L1/L2 into single docs

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 5: 合并主题 08~11

**Files:**
- Create: `08-security-audit-governance.md`、`09-infrastructure-operations.md`、`10-configuration-governance.md`、`11-architecture-baseline.md`
- Delete: 对应四个子目录

**Interfaces:**
- Consumes: Task 2 重写后的链接
- Produces: 四篇平铺合并文档

- [ ] **Step 1: 按"统一合并规程"依次合并 08、09、10、11**

11 是跨模块索引(约 50 个链接),合并时不做任何链接删减,留给 Phase 2 的 Task 16。

- [ ] **Step 2: 逐主题跑合并规程第 6 步验证**

- [ ] **Step 3: 人工核对无事实损失**(方法同 Task 3 Step 3)

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "docs(architecture): merge 08-11 L1/L2 into single docs

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 6: 合并主题 12 并平铺容量规划

**Files:**
- Create: `12-implementation-roadmap.md`、`environment-capacity-plan.md`(平铺,内容暂不动)
- Delete: `12-implementation-roadmap/` 子目录

**Interfaces:**
- Consumes: Task 2 重写后的链接
- Produces: `12-implementation-roadmap.md`;根级 `environment-capacity-plan.md`(Task 8 将其并入附录)

- [ ] **Step 1: 按"统一合并规程"合并 12 的主文与 detail**

- [ ] **Step 2: 平铺容量规划**

```bash
git mv 12-implementation-roadmap/environment-capacity-plan.md environment-capacity-plan.md
```

(若目录中仍有残留文件,先处理完再确认目录消失。)

- [ ] **Step 3: 验证**

```bash
test -f 12-implementation-roadmap.md && test -f environment-capacity-plan.md && test ! -d 12-implementation-roadmap && echo OK
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "docs(architecture): merge 12 L1/L2 and flatten capacity plan

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 7: 更新 HTML 地图链接并验证 Phase 1 收敛

**Files:**
- Modify: `visuals/platform-architecture-map.html`

**Interfaces:**
- Consumes: Tasks 3~6 产出的全部平铺文件
- Produces: Phase 1 完成态——平铺布局、全部链接可达

- [ ] **Step 1: 摸清 HTML 内链接格式**

```bash
grep -oE '(href|data-[a-z-]+)="[^"]*\.md[^"]*"' visuals/platform-architecture-map.html | sort -u
```

- [ ] **Step 2: 按同一映射重写 HTML 链接**

以 Step 1 实际格式为准调整;若是 `../NN-x/file.md` 形式则:

```bash
sed -E -i '' \
  -e 's#(\.\./)12-implementation-roadmap/environment-capacity-plan\.md#\1environment-capacity-plan.md#g' \
  -e 's#(\.\./)([0-9]{2}-[a-z-]+)/[a-z0-9-]+\.md#\1\2.md#g' \
  visuals/platform-architecture-map.html
```

- [ ] **Step 3: 全量链接存在性检查**

```bash
status=0
for f in *.md; do
  for t in $(grep -oE '\]\(\./[^)#]+' "$f" | sed 's/](\.\///'); do
    [ -e "$t" ] || { echo "BROKEN: $f -> $t"; status=1; }
  done
done
for t in $(grep -oE '"\.\./[^"#]+\.md' visuals/platform-architecture-map.html | sed 's/"\.\.\///' | sort -u); do
  [ -e "$t" ] || { echo "BROKEN(html): $t"; status=1; }
done
echo "link check exit=$status"   # 期望 0
grep -n '](\.\./' *.md            # 无输出(根级 md 不应再有 ../ 链接)
ls -d */                          # 只剩 visuals/
```

- [ ] **Step 4: 检查带锚点的链接**

```bash
grep -nE '\]\([^)]*\.md#[^)]+\)' *.md
```

对每条输出,确认目标文件中对应标题仍存在;不存在的把锚点去掉只留文件链接。

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "docs(architecture): update architecture map links for flat layout

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Phase 2(精简压缩)

### Task 8: 创建参数附录

**Files:**
- Create: `appendix-parameters.md`
- Delete: `environment-capacity-plan.md`(内容并入附录)

**Interfaces:**
- Consumes: Phase 1 合并文档中的参数表/代码块、`environment-capacity-plan.md`
- Produces: `appendix-parameters.md`,固定锚点:`## 容量与服务器规划`、`## Resource Profile`、`## Platform Policy Key`、`## 错误码`、`## Port 方法清单`、`## Runtime 组件清单`(后续任务用 `#resource-profile` 等锚点引用)

- [ ] **Step 1: 定位全部待迁参数**

```bash
grep -nE '[0-9]+ ?/ ?[0-9]+ ?vCPU|[0-9]+ ?(GiB|GB|TB)' [0-9]*.md
grep -n 'active_attempt_limit\|active_build_limit\|PLATFORM_POLICY' [0-9]*.md
grep -nE '`[A-Z_]{4,}(/[A-Z_]+)?`' [0-9]*.md          # 错误码,如 CAPACITY_UNAVAILABLE、RESOURCE_EXHAUSTED/MEMORY
grep -n 'Port 仅提供\|Port 提供\|^provisionMaterialization' [0-9]*.md   # Port 方法清单代码块
grep -n 'runtime-rs\|containerd-shim\|QEMU\|BuildKit' [0-9]*.md          # Runtime 组件
```

把命中位置记成清单;本任务只**复制**进附录,原文删除留给各精简任务。

- [ ] **Step 2: 写 `appendix-parameters.md`**

结构如下,各节内容从命中位置原样搬运(表格保持原表头),每节开头一句说明该节参数被哪些主题消费:

```markdown
# 参数附录

> 本文是全部精确参数的唯一事实源:正文只写定性规则并链接到这里。
> 修改参数只改本文;新增参数必须归入下列章节之一。

## 容量与服务器规划
(原 environment-capacity-plan.md 全部内容,标题降一级)

## Resource Profile
(04 的 Resource Profile 表:CPU/Memory/Ephemeral/Unit)

## Platform Policy Key
(04 的 Policy 表:Key、Minimum、Maximum、准入效果;含其他主题的 PLATFORM_POLICY Key)

## 错误码
(表:错误码 | 语义 | 产生模块,收录 CAPACITY_UNAVAILABLE、POLICY_LIMIT_REACHED、POLICY_DISABLED、RESOURCE_EXHAUSTED/* 等全部命中项)

## Port 方法清单
(各 Port 的方法列表代码块,如 SandboxPort)

## Runtime 组件清单
(Kata Containers、runtime-rs、containerd-shim-kata-v2、QEMU/KVM、Rootless BuildKit、OpenBao 等及其角色一句话)
```

- [ ] **Step 3: 删除容量规划旧文件**

```bash
git rm environment-capacity-plan.md
grep -rn 'environment-capacity-plan' *.md visuals/*.html
```

对每条命中把链接改为 `./appendix-parameters.md#容量与服务器规划`(HTML 里为 `../appendix-parameters.md`)。

- [ ] **Step 4: 验证**

```bash
test -f appendix-parameters.md && test ! -f environment-capacity-plan.md && echo OK
grep -c '^## ' appendix-parameters.md   # = 6
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "docs(architecture): add parameter appendix as single source for values

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 9: 重写 README(导航 + 所有权矩阵 + 维护规则)

**Files:**
- Modify: `README.md`(整体重写)

**Interfaces:**
- Consumes: 合并文档中现存的所有权声明(`grep -n '只由\|唯一拥有\|唯一事实源' [0-9]*.md` 逐条核对,矩阵必须覆盖全部命中的事实类别)——本任务必须在各精简任务**之前**完成,否则声明已被删除、无从提取
- Produces: `README.md` 含 `## 事实所有权矩阵` 锚点(各精简任务的"目标与边界"节链接到它)

- [ ] **Step 1: 提取所有权声明清单**

```bash
grep -n '只由\|唯一拥有\|唯一规范事实源\|唯一事实源' [0-9]*.md > /tmp/ownership-claims.txt
wc -l /tmp/ownership-claims.txt
```

- [ ] **Step 2: 重写 README**

以下结构与初始矩阵直接使用,再按 Step 1 清单补齐遗漏行(导航表"一句职责"沿用旧 README 文案):

```markdown
# 内部研发平台架构文档

本目录是平台架构的唯一文档入口:13 篇主题文档(00~12)+ 1 篇参数附录。
每篇主题固定四节:目标与边界 / 核心模型 / 关键不变量 / 与其他模块的关系。
离线导航:[平台架构地图](./visuals/platform-architecture-map.html)(只导航,不承载事实)。

## 文档导航

| 编号 | 主题 | 一句职责 |
| --- | --- | --- |
| 00 | [平台总览](./00-platform-overview.md) | 说明 System Context、总体边界和责任链。 |
| 01 | [身份、组织与授权](./01-identity-organization-authorization.md) | 说明身份、组织、成员与服务端授权。 |
| 02 | [Requirement Workflow](./02-requirement-workflow.md) | 说明业务责任、审核、验收与证据。 |
| 03 | [Agent、Skill 与 Model](./03-agent-skill-model.md) | 说明受控执行、模型路由、评测工具链和不可变 Binding。 |
| 04 | [Sandbox Runtime](./04-sandbox-runtime.md) | 说明隔离执行环境、容量与恢复。 |
| 05 | [Source Control 与交付](./05-source-control-delivery.md) | 说明代码绑定、交付证据和 MR 协作。 |
| 06 | [平台应用与集成](./06-platform-application-integration.md) | 说明应用边界、集成、安全公告和运维可见性。 |
| 07 | [数据、消息与存储](./07-data-messaging-storage.md) | 说明数据事实、消息、Artifact 与组件恢复。 |
| 08 | [安全、审计与治理](./08-security-audit-governance.md) | 说明 Trust、Secret、加密、Audit 与安全恢复。 |
| 09 | [基础设施与运维](./09-infrastructure-operations.md) | 说明环境、Flux GitOps、Kubernetes、可观测性、DR 与容量。 |
| 10 | [Configuration Governance](./10-configuration-governance.md) | 说明配置分类、生命周期、Effective Snapshot 与 Promotion。 |
| 11 | [架构基线](./11-architecture-baseline.md) | 索引跨模块不变量、质量场景和三类 Gate。 |
| 12 | [实施路线图](./12-implementation-roadmap.md) | 唯一记录 Release Scope、实施状态、环境 Promotion 与 Profile 选择。 |
| 附录 | [参数附录](./appendix-parameters.md) | 全部精确参数的唯一事实源。 |

## 事实所有权矩阵

改任何事实前先在此定位 owner;其他文档只链接、不复制。

| 事实类别 | Owner |
| --- | --- |
| 身份、组织、Workspace、成员、服务端授权、Super Admin 边界 | [01](./01-identity-organization-authorization.md) |
| Requirement、WorkItem、Gate、Decision、验收与业务证据 | [02](./02-requirement-workflow.md) |
| Run、Attempt、Execution Binding、Child 状态与等待语义、模型路由、Skill | [03](./03-agent-skill-model.md) |
| Sandbox Environment、Materialization、Capacity Lease、运行时隔离与清理 | [04](./04-sandbox-runtime.md) |
| 分支、保护、MR、交付证据、GitLab 对账、IntegrationBaselineEvidence | [05](./05-source-control-delivery.md) |
| 平台应用边界、API 集成、安全公告、运维可见性 | [06](./06-platform-application-integration.md) |
| 领域数据事实、消息、Artifact Store、组件恢复 | [07](./07-data-messaging-storage.md) |
| Trust、Secret、加密、Audit、保留与访问、安全恢复 | [08](./08-security-audit-governance.md) |
| Platform Environment、GitOps Desired State、Kubernetes、可观测性、DR、物理拓扑准入 | [09](./09-infrastructure-operations.md) |
| 配置分类、生命周期、Effective Snapshot、Promotion 工作流 | [10](./10-configuration-governance.md) |
| 跨模块不变量、质量场景、Gate 分类 | [11](./11-architecture-baseline.md) |
| Release Scope、实施状态、环境 Promotion、Launch/Hardened Profile 选择、容量场景 | [12](./12-implementation-roadmap.md) |
| 全部精确参数:资源数值、Policy Key、错误码、Port 方法清单、Runtime 组件、容量数字 | [附录](./appendix-parameters.md) |

## 维护规则

1. 改动前先在所有权矩阵定位 owner,只在 owner 文档修改,再更新引用处链接。
2. 参数数值只改参数附录;正文不复制数值,只写定性规则。
3. 每篇保持四节模板;主题文档 ≤150 行(00、12 ≤180)。
4. 不在 README、HTML 地图或外部系统复制规范事实;HTML 地图只做导航。
5. 过期规则直接删除,不保留方案比较、对话记录或历史规则。
```

- [ ] **Step 3: 核对矩阵覆盖**

逐行核对 `/tmp/ownership-claims.txt`:每条声明的事实类别都能在矩阵中找到归属行,缺的加行。

- [ ] **Step 4: 验证与提交**

```bash
wc -l README.md            # ≤ 80
grep -c '^## ' README.md   # = 3
git add README.md && git commit -m "docs(architecture): rewrite README with ownership matrix

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 10: 精简 00-platform-overview

**Files:**
- Modify: `00-platform-overview.md`

**Interfaces:**
- Consumes: Task 9 的 `README.md#事实所有权矩阵`、Task 8 的附录锚点
- Produces: 模板化的 00(≤180 行)

- [ ] **Step 1: 按"统一精简规程"执行**

00 特有处理:平台定位/系统边界/主链路 → `目标与边界`;模块地图 text tree 与 Profile 四层定义 → `核心模型`;稳定边界列表 → `关键不变量`;"阅读导航"整节删除(README 导航表已覆盖)。

- [ ] **Step 2: 跑精简规程第 4 步验证(max=180)并提交**

```bash
git add 00-platform-overview.md && git commit -m "docs(architecture): condense 00-platform-overview to template

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 11: 精简 01、02

**Files:**
- Modify: `01-identity-organization-authorization.md`、`02-requirement-workflow.md`

**Interfaces:**
- Consumes: 同 Task 10
- Produces: 模板化的 01、02(各 ≤150 行)

- [ ] **Step 1: 按"统一精简规程"分别精简 01、02**
- [ ] **Step 2: 每篇跑精简规程第 4 步验证**
- [ ] **Step 3: 分别提交**(`condense 01-identity-organization-authorization to template`、`condense 02-requirement-workflow to template`,格式同规程第 5 步)

### Task 12: 精简 03、04

**Files:**
- Modify: `03-agent-skill-model.md`、`04-sandbox-runtime.md`

**Interfaces:**
- Consumes: 同 Task 10;04 的参数迁移目标锚点:`#resource-profile`、`#platform-policy-key`、`#错误码`、`#port-方法清单`、`#runtime-组件清单`
- Produces: 模板化的 03、04(各 ≤150 行)

- [ ] **Step 1: 按"统一精简规程"分别精简 03、04**

04 是参数最密的一篇,直接套用"精简示例":Resource Profile 表、Policy 表、SandboxPort 方法块、错误码全部替换为定性规则 + 附录链接;`LAB_ONLY`、Fail Closed、"不降级 runc"等 Gate 语义保留(不删清单)。

- [ ] **Step 2: 每篇跑精简规程第 4 步验证**
- [ ] **Step 3: 分别提交**(commit 格式同规程第 5 步)

### Task 13: 精简 05、06

**Files:**
- Modify: `05-source-control-delivery.md`、`06-platform-application-integration.md`

**Interfaces:**
- Consumes: 同 Task 10
- Produces: 模板化的 05、06(各 ≤150 行)

- [ ] **Step 1: 按"统一精简规程"分别精简 05、06**
- [ ] **Step 2: 每篇跑精简规程第 4 步验证**
- [ ] **Step 3: 分别提交**(commit 格式同规程第 5 步)

### Task 14: 精简 07、08

**Files:**
- Modify: `07-data-messaging-storage.md`、`08-security-audit-governance.md`

**Interfaces:**
- Consumes: 同 Task 10
- Produces: 模板化的 07、08(各 ≤150 行)

- [ ] **Step 1: 按"统一精简规程"分别精简 07、08**
- [ ] **Step 2: 每篇跑精简规程第 4 步验证**
- [ ] **Step 3: 分别提交**(commit 格式同规程第 5 步)

### Task 15: 精简 09、10

**Files:**
- Modify: `09-infrastructure-operations.md`、`10-configuration-governance.md`

**Interfaces:**
- Consumes: 同 Task 10
- Produces: 模板化的 09、10(各 ≤150 行)

- [ ] **Step 1: 按"统一精简规程"分别精简 09、10**

09 中的服务器/节点数字、SKU、容量数值迁附录"容量与服务器规划"节;GitOps/DR 的语义规则保留。

- [ ] **Step 2: 每篇跑精简规程第 4 步验证**
- [ ] **Step 3: 分别提交**(commit 格式同规程第 5 步)

### Task 16: 精简 11-architecture-baseline

**Files:**
- Modify: `11-architecture-baseline.md`

**Interfaces:**
- Consumes: 同 Task 10
- Produces: 模板化的 11(≤150 行)

- [ ] **Step 1: 按"统一精简规程"执行**

11 特有处理:它是跨模块索引,约 50 个链接大半与所有权矩阵重复——凡"指向 owner"性质的链接删除(矩阵已承载),只保留跨模块不变量本体、质量场景和 Gate 分类语义;每条不变量后最多留一个必要链接。

- [ ] **Step 2: 跑精简规程第 4 步验证并提交**(commit 格式同规程第 5 步)

### Task 17: 精简 12-implementation-roadmap

**Files:**
- Modify: `12-implementation-roadmap.md`

**Interfaces:**
- Consumes: 同 Task 10;容量数字的迁移目标 `appendix-parameters.md#容量与服务器规划`
- Produces: 模板化的 12(≤180 行)

- [ ] **Step 1: 按"统一精简规程"执行**

12 特有处理:Release Scope、实施状态、Promotion 流程、Profile 选择是本篇的"核心模型"(它拥有这些事实,保留);人数容量场景与服务器数字迁附录;`核心模型` 节可用状态表呈现 Release/Capability/状态。

- [ ] **Step 2: 跑精简规程第 4 步验证(max=180)并提交**(commit 格式同规程第 5 步)

### Task 18: HTML 地图收尾 + 全量验收

**Files:**
- Modify: `visuals/platform-architecture-map.html`(容量规划链接 → 附录;抽查节点摘要与新结构无矛盾)

**Interfaces:**
- Consumes: 全部前序任务产出
- Produces: 验收通过的最终状态

- [ ] **Step 1: HTML 残留链接检查**

```bash
grep -n 'environment-capacity-plan\|-detail\.md' visuals/platform-architecture-map.html *.md   # 无输出;有则修复
```

- [ ] **Step 2: 验收 1——总行数**(2026-08-08 用户裁决修订:正文 ≤2000,附录单列)

```bash
cat README.md [0-9]*.md | wc -l   # ≤ 2000(正文)
wc -l appendix-parameters.md       # 附录单列报告,不计入正文预算
```

- [ ] **Step 3: 验收 2——单篇行数**

```bash
for f in [0-9]*.md; do n=$(wc -l < "$f"); max=150; case "$f" in 00-*|12-*) max=180;; esac
  [ "$n" -le "$max" ] || echo "OVER: $f $n"; done   # 无 OVER 输出
```

- [ ] **Step 4: 验收 3——链接检查**(复用 Task 7 Step 3 脚本,期望 exit=0)

- [ ] **Step 5: 验收 4——参数唯一性**

```bash
grep -lE '[0-9]+ ?/ ?[0-9]+ ?vCPU|[0-9]+ ?GiB|active_attempt_limit|active_build_limit|CAPACITY_UNAVAILABLE|POLICY_LIMIT_REACHED|POLICY_DISABLED|RESOURCE_EXHAUSTED|runtime-rs|containerd-shim' [0-9]*.md README.md   # 无输出
```

- [ ] **Step 6: 超标处理**

任一验收不过:回到对应篇按精简规程再压缩(优先删所有权残留和与附录重复的内容,不碰"不删清单"),重跑验收。

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "docs(architecture): finalize map links and acceptance checks

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```
