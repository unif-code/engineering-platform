# 前端真实 100% Coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `src` 下全部第一方手写浏览器运行时代码纳入分母，并让 Statements、Branches、Functions、Lines 同时达到真实 100%。

**Architecture:** 先取消 22 个 `index.style.ts` 的整体排除并冻结机器基线，再按 transport/service、运行时 shell、治理页面、原型页面与样式构造五个行为切片补测。每个切片使用 focused RED/GREEN 和可运行的 production mutation 证明测试有效；完整报告达到 100% 后才提升阈值，并由 AST 结构门禁固定 include、exclude 与阈值。

**Tech Stack:** TypeScript 5.9、React 19、Umi Max 4、Ant Design 6、Pro Components 3、antd-style 4、Vitest 4、V8 Coverage、Testing Library、Node test、Biome

**Spec:** `docs/superpowers/specs/2026-08-20-frontend-true-coverage-100-design.md`

## Global Constraints

- 基线提交固定为 `a570567e049a03a04e43633c637426bc55d934dc`。
- Production include 精确为 `src/**/*.{ts,tsx}`。
- 唯一合法排除为 `src/.umi*/**`、`src/services/generated/**`、`src/**/*.d.ts`、`src/**/*.{test,spec}.{ts,tsx}`。
- 不允许 coverage ignore pragma、额外 exclude、关闭 branch、per-file 绕过、skip、retry、sleep 或放宽 timeout。
- 测试断言可观察行为；mock 只放在 generated client、网络、时钟、随机数、存储和浏览器平台边界。
- 每个行为切片至少做一次能编译、能运行的 production mutation，目标测试必须因断言失败而 RED；恢复后必须 GREEN。
- 不手改 `src/services/generated`、OpenAPI Artifact 或任何生成目录。
- 未收到 `【同步进度】`，不修改 `docs/superpowers/progress/current.md`。
- 用户主工作区的 `config/proxy.ts`、`src/app.test.ts` 未提交改动不得移动、覆盖或提交。

---

## File Map

- Modify: `vitest.config.ts` — 纳入手写样式并最终把四项阈值设为 100。
- Modify: `scripts/verify-structure.mjs`、`scripts/verify-structure.test.mjs` — 用 TypeScript AST 固定 coverage include/exclude/thresholds，失败时关闭门禁。
- Modify: `src/services/{transport,adminAccounts,adminAudit,adminGrants,adminPolicies,adminWorkspaces,auth}/*.test.ts` — 完整传输与契约边界。
- Modify: `src/app.test.ts`、`src/features/{administration,auth,navigation,shell,theme}/**/*.test.ts(x)` — 应用运行时、认证、导航、主题与错误分支。
- Modify: `src/pages/{AdminGrants,AdminMenus,AdminModels,AdminOrganization,AdminPolicies,AdminRoles,AdminSkills,AdminUsers,AdminWorkspaces,Audit}/**/*.test.ts(x)` — 治理页面行为。
- Create: `src/pages/Bootstrap/index.test.tsx` — Bootstrap 路由装配入口。
- Modify: `src/pages/{Home,TaskDetail,Tasks,TeamBoard,Workspaces}/**/*.test.ts(x)` — 其余页面、弹窗、面板、空态和辅助分支。
- Modify as needed: adjacent `*.tsx`/`*.ts` — 仅允许行为保持的深模块拆分或可测试依赖注入；不得增加 test-only API。
- Create: `docs/superpowers/reports/2026-08-20-frontend-true-coverage-100.md` — 记录 before/after、故障注入、完整命令和排除审计。

### Task 1: 扩大分母并固定真实 baseline

**Files:**
- Modify: `vitest.config.ts`
- Verify: `coverage/coverage-final.json`（ignored generated artifact）

**Interfaces:**
- Produces: coverage include `src/**/*.{ts,tsx}` 与四项合法 exclude。
- Produces: Expanded baseline `93.53 / 84.34 / 94.72 / 93.40`。

- [ ] **Step 1: 删除手写样式排除**

从 `coverage.exclude` 删除：

```ts
'src/**/index.style.ts',
```

并把测试排除收窄为与 spec 一致的：

```ts
'src/**/*.{test,spec}.{ts,tsx}',
```

- [ ] **Step 2: 运行完整 expanded baseline**

Run: `pnpm.cmd test:coverage`

Expected:

```text
Test Files  62 passed (62)
Tests       407 passed (407)
Statements  93.53% (1995/2133)
Branches    84.34% (1126/1335)
Functions   94.72% (736/777)
Lines       93.40% (1940/2077)
```

- [ ] **Step 3: 校验分母扩大而不是替换**

Run: `git diff -- vitest.config.ts && git status --short`

Expected: 只有上述两个 exclude 调整；没有新增 ignore、reporter 过滤或 threshold 变化。

- [ ] **Step 4: 提交分母变更**

```powershell
git add vitest.config.ts
git commit -m "test(coverage): include handwritten runtime styles" -m "样式构造属于第一方运行时代码；取消整体排除，先固定完整分母再补缺口，避免看到报告后调整口径。"
```

### Task 2: 补齐 transport 与领域 service 行为

**Files:**
- Create: `src/services/transport/envelope.test.ts`
- Modify: `src/services/transport/index.test.ts`
- Modify: `src/services/adminAccounts/index.test.ts`
- Modify: `src/services/adminAudit/index.test.ts`
- Modify: `src/services/adminGrants/index.test.ts`
- Modify: `src/services/adminPolicies/index.test.ts`
- Modify: `src/services/adminWorkspaces/index.test.ts`
- Modify: `src/services/auth/index.test.ts`

**Interfaces:**
- Consumes: generated `api` test double、真实 `resolveApiEnvelope`、`normalizeApiError`、`requireApiData`。
- Produces: service/transport 模块四项 100%，不改变生产契约。

- [ ] **Step 1: 为 envelope 写失败与透传 RED**

新增表驱动测试，使用 literal 输入断言：

```ts
await expect(resolveApiEnvelope(Promise.resolve({ code: 200, data: 7, message: 'ok' }))).resolves.toBe(7);
await expect(resolveApiEnvelope(Promise.resolve({ code: 422, data: null, message: 'invalid' }))).rejects.toThrow('invalid');
await expect(resolveApiEnvelope(Promise.reject({ response: { data: { message: 'server detail' } } }))).rejects.toThrow('server detail');
await expect(resolveApiEnvelope(Promise.reject(new Error('network')))).rejects.toThrow('network');
await expect(resolveApiEnvelope(Promise.reject('offline'))).rejects.toMatchObject({ message: 'Request failed', cause: 'offline' });
```

Run: `node_modules/.bin/vitest.cmd run src/services/transport/envelope.test.ts --reporter=verbose`

Expected: 首轮因测试文件不存在而无目标用例；添加用例后 GREEN，覆盖 `envelope.ts` 的 success、business、response-message、Error 与 non-Error 五条路径。

- [ ] **Step 2: 补齐 transport defensive branches**

在 `index.test.ts` 追加：字符串/数组/空 data HTTP error、缺失 statusText、已有 Problem status、401 auth endpoint 不触发 handler、unauthorized handler 自身抛错仍保留 Problem、`requireApiData(undefined)`、AbortError 和 non-Error network 输入。断言 Problem Details、requestId、cause、handler 次数和禁止副作用。

Run: `node_modules/.bin/vitest.cmd run src/services/transport --reporter=verbose`

Expected: PASS 且成功输出无 console/warning。

- [ ] **Step 3: 补齐 adminAccounts cursor 与 action 矩阵**

在 `adminAccounts/index.test.ts` 使用两页 literal response 覆盖 cursor 遍历、重复 cursor 拒绝、employeeNo/displayName/profession/status 的空值与匹配、四种 sort field 的 asc/desc、空 profession、create/enable/disable/totp-reset 的精确 path/header/body。失败用例断言重复 cursor 后不发第三次请求。

Run: `node_modules/.bin/vitest.cmd run src/services/adminAccounts/index.test.ts --reporter=verbose`

- [ ] **Step 4: 补齐其他 service 映射边界**

逐文件追加 literal cases：

- `adminAudit`: requestId 缺失显示 `—`；SUCCESS 大小写；grant/policy/publish/rollback 为 high，其余 low；所有 optional query 均透传。
- `adminGrants`: `scopeId=null` 显示“全平台”；capability/principal 双筛选缺省与命中。
- `adminPolicies`: 未知 key fallback；enum label 已知/未知；无 enum/min/max；ETag header 存在/缺失 fallback；preview changed true/false；versions 第一项 current、后续 false。
- `adminWorkspaces`: keyword/status 缺省与过滤；archivedAt ACTIVE/ARCHIVED；create 精确 body/header。
- `auth`: capabilities 缺失返回空数组；各 auth/bootstrap endpoint 的 body/header 与响应解包。

Run: `node_modules/.bin/vitest.cmd run src/services/adminAudit src/services/adminGrants src/services/adminPolicies src/services/adminWorkspaces src/services/auth --reporter=verbose`

- [ ] **Step 5: 做 transport/service 故障注入**

临时把 `resolveApiEnvelope` 的 `envelope.code !== 200` 反转为 `=== 200`，运行 envelope focused test，Expected: success 与 business 用例因错误返回/错误抛出而 FAIL。恢复源文件后重跑 Task 2 全部 focused tests，Expected: PASS。

- [ ] **Step 6: 静态检查并提交**

```powershell
pnpm.cmd exec biome check src/services
pnpm.cmd tsc
git diff --check
git add src/services
git commit -m "test(services): cover transport and governance contracts" -m "完整覆盖错误归一、cursor 防环、ETag 与 DTO 映射；失败断言同时固定禁止继续请求和错误 cause，避免只命中代码。"
```

### Task 3: 补齐 app、认证、导航、主题与 shell

**Files:**
- Modify: `src/app.test.ts`
- Modify: `src/components/SemanticTag/index.test.tsx`
- Modify: `src/features/administration/error.test.ts`
- Modify: `src/features/auth/{BootstrapWizard,LoginFlow,LoginShell}.test.tsx`
- Modify: `src/features/navigation/{menu,redirect}.test.ts`
- Modify: `src/features/shell/index.test.tsx`
- Modify: `src/features/theme/{model,ThemeProvider}.test.ts(x)`

**Interfaces:**
- Consumes: sessionStorage/localStorage/matchMedia/navigation service mocks at browser boundaries。
- Produces: application runtime and shell modules four-metric 100%。

- [ ] **Step 1: 覆盖 app runtime 分支**

在 `app.test.ts` 覆盖：缺少浏览器 storage、bootstrap state 读取/清除、login/bootstrap/public route layout、无 current user、logout 成功/失败、401 refresh 成功/失败、redirect query 缺失与非法值。每例断言 initialState、location 或 service side effect，不断言 mock 元素。

Run: `node_modules/.bin/vitest.cmd run src/app.test.ts --reporter=verbose`

- [ ] **Step 2: 覆盖认证与中文错误 fallback**

追加 Bootstrap invalid phase、缺少 challenge/enrollment、无 requestId、generic Error、TOTP retry/exhausted、成功回调缺省；Login credential/TOTP generic Error 与 title/detail 映射。`login.style.ts` 通过显式 light/dark token 分支的真实 LoginShell render 覆盖。

Run: `node_modules/.bin/vitest.cmd run src/features/auth --reporter=verbose`

- [ ] **Step 3: 覆盖导航、主题与 HeaderActions**

追加：未知/空 routeKey、叶子/目录混合、redirect 无 fallback、受控外链拒绝；theme 无 DOM/storage、非法持久化值、system matchMedia 缺失/变化、受控 mode；HeaderActions 无 user、无 capability、缺头像/员工号、theme mode 各分支与 logout error。

Run: `node_modules/.bin/vitest.cmd run src/features/navigation src/features/theme src/features/shell src/components/SemanticTag --reporter=verbose`

- [ ] **Step 4: 做 runtime 故障注入**

临时把 `features/navigation/menu.ts` 未知 route 的拒绝分支改为继续投影，运行 `menu.test.ts`，Expected: 未知 route 不可见断言 FAIL。恢复后运行 Task 3 全部 focused tests，Expected: PASS。

- [ ] **Step 5: 静态检查并提交**

```powershell
pnpm.cmd exec biome check src/app.test.ts src/components/SemanticTag src/features/administration src/features/auth src/features/navigation src/features/shell src/features/theme
pnpm.cmd tsc
git diff --check
git add src/app.test.ts src/components/SemanticTag src/features
git commit -m "test(runtime): cover authentication shell edge cases" -m "Session、导航、主题和错误 fallback 是全局安全边界；补齐允许与拒绝路径，并用未知 route 变异证明测试能阻止菜单泄漏。"
```

### Task 4: 补齐账号、Workspace、组织与 Audit

**Files:**
- Modify: `src/pages/AdminUsers/{index,util}.test.ts(x)`
- Modify: `src/pages/AdminWorkspaces/{index,util}.test.ts(x)`
- Modify: `src/pages/AdminOrganization/index.test.tsx`
- Modify: `src/pages/Audit/{index,util}.test.ts(x)`

**Interfaces:**
- Consumes: administration feature public-entry mocks with complete DTOs。
- Produces: corresponding page/modal/drawer modules four-metric 100%。

- [ ] **Step 1: 补齐 AdminUsers**

追加 CredentialModal 无 navigator.clipboard、copy success/failure、关闭清理、create/reset 标题；列表 reload 403、缺 profession、空 search、各 sort/filter combination、动作 target 缺失安全返回。断言凭据只在运行时局部生成，关闭后不可再见。

- [ ] **Step 2: 补齐 AdminWorkspaces 与 Organization**

追加 leader/owner 缺失、ARCHIVED 展示、detail drawer 无成员/成员错误、Modal 默认 owner 缺失、邀请/移除/转让 target 缺失、Organization 无 leader/空 children/静态创建入口/权限错误保持。

- [ ] **Step 3: 补齐 Audit**

追加 AuditRequestId clipboard 缺失、copy success/failure；空 event、rejected/high/low、筛选清空、无 requestId、invalid date range 与图表空值。继续冻结 Date 到 fixture 时间，不放宽 timeout。

- [ ] **Step 4: 做治理页故障注入并 GREEN**

临时移除 CredentialModal 复制失败提示，运行 AdminUsers focused test，Expected: 用户可见失败反馈断言 FAIL。恢复后运行：

```powershell
node_modules/.bin/vitest.cmd run src/pages/AdminUsers src/pages/AdminWorkspaces src/pages/AdminOrganization src/pages/Audit --reporter=verbose
```

Expected: PASS。

- [ ] **Step 5: 静态检查并提交**

```powershell
pnpm.cmd exec biome check src/pages/AdminUsers src/pages/AdminWorkspaces src/pages/AdminOrganization src/pages/Audit
pnpm.cmd tsc
git diff --check
git add src/pages/AdminUsers src/pages/AdminWorkspaces src/pages/AdminOrganization src/pages/Audit
git commit -m "test(governance): cover account workspace and audit edges" -m "覆盖复制失败、空投影、并发错误与筛选边界；所有页面仍只 mock Feature 公开入口，不恢复 HTTP Mock。"
```

### Task 5: 补齐 Grant、Policy 与原型治理页

**Files:**
- Modify: `src/pages/AdminGrants/index.test.tsx`
- Modify: `src/pages/AdminPolicies/index.test.tsx`
- Modify: `src/pages/AdminMenus/{index,util}.test.ts(x)`
- Modify: `src/pages/AdminModels/index.test.tsx`
- Modify: `src/pages/AdminRoles/index.test.tsx`
- Modify: `src/pages/AdminSkills/index.test.tsx`

**Interfaces:**
- Consumes: immutable governance fixtures and page-local prototype fixtures。
- Produces: all listed page, modal and helper modules four-metric 100%。

- [ ] **Step 1: 补齐 Grant modal 和行操作**

覆盖 principal/scope 全部必填拒绝、workspace scope 无 id、validFrom/validTo optional、create/revoke 403/422/409、缺 target 安全返回、空列表、status/source/valueEnum fallback。断言失败不关闭 Modal 且不 reload。

- [ ] **Step 2: 补齐 Policy 生命周期**

覆盖 unknown catalog key、无 active draft、create/update/validate/preview/publish/rollback 的每个失败保持分支、stale draft、empty issues、version history 空/非 current、编辑器 invalid numeric/enum input 和清空 optional value。

- [ ] **Step 3: 补齐 Menus/Models/Roles/Skills**

覆盖空 children、未知 capability、无 selected model、usage panel action、无 leader、skill create submit/cancel、空列表和静态 prototype action 的 success/failure presentation。

- [ ] **Step 4: 做 Policy 故障注入并 GREEN**

临时让 validate failure 关闭编辑器，运行 AdminPolicies focused test，Expected: “失败时编辑器仍可见”断言 FAIL。恢复后运行六页 focused tests，Expected: PASS。

- [ ] **Step 5: 静态检查并提交**

```powershell
pnpm.cmd exec biome check src/pages/AdminGrants src/pages/AdminPolicies src/pages/AdminMenus src/pages/AdminModels src/pages/AdminRoles src/pages/AdminSkills
pnpm.cmd tsc
git diff --check
git add src/pages/AdminGrants src/pages/AdminPolicies src/pages/AdminMenus src/pages/AdminModels src/pages/AdminRoles src/pages/AdminSkills
git commit -m "test(governance): cover grant policy and prototype branches" -m "Grant 与 Policy 覆盖完整成功失败状态机；原型治理页补空态和交互边界，不引入新的后端契约。"
```

### Task 6: 补齐其余页面、入口与样式构造

**Files:**
- Create: `src/pages/Bootstrap/index.test.tsx`
- Modify: `src/pages/Home/index.test.tsx`
- Modify: `src/pages/TaskDetail/index.test.tsx`
- Modify: `src/pages/Tasks/{index,util}.test.ts(x)`
- Modify: `src/pages/TeamBoard/index.test.tsx`
- Modify: `src/pages/Workspaces/index.test.tsx`
- Verify: all 22 `src/**/index.style.ts`

**Interfaces:**
- Consumes: page-local fixtures and real components; mocks only external state owners。
- Produces: every remaining production file four-metric 100%。

- [ ] **Step 1: 覆盖路由入口与任务页面**

Bootstrap entry 测试渲染真实 `BootstrapWizard` shell 并断言中文标题；TaskDetail 覆盖 missing task、approve/reject cancel/submit、无 inspector；Tasks 覆盖 assign steps empty/custom、row click、empty archive、optional owner/deadline；Home 覆盖无 displayName fallback。

- [ ] **Step 2: 覆盖 TeamBoard 与 Workspaces 面板**

覆盖 TeamBoard empty members/activities 与 action callback；MemberPanel 无 avatar/optional role、RepositoryPanel empty branches/permissions/status、SettingsPanel submit、WorkspaceSelector empty/single/multi、workspace owner/leader 条件分支。

- [ ] **Step 3: 校验全部 style modules**

运行完整 coverage 后，从 `coverage-final.json` 筛选 `index.style.ts` 与 `login.style.ts`。任何未达到 100 的样式必须通过真实 light/dark/compact/empty 组件渲染补齐；不直接调用 antd-style 私有 callback，不新增 style exclude。

- [ ] **Step 4: 做页面故障注入并 GREEN**

临时让 Workspaces 的无权限分支显示仓库操作按钮，运行 Workspaces focused test，Expected: 权限拒绝断言 FAIL。恢复后运行 Task 6 focused tests，Expected: PASS。

- [ ] **Step 5: 静态检查并提交**

```powershell
pnpm.cmd exec biome check src/pages/Bootstrap src/pages/Home src/pages/TaskDetail src/pages/Tasks src/pages/TeamBoard src/pages/Workspaces
pnpm.cmd tsc
git diff --check
git add src/pages/Bootstrap src/pages/Home src/pages/TaskDetail src/pages/Tasks src/pages/TeamBoard src/pages/Workspaces
git commit -m "test(pages): cover remaining runtime branches" -m "入口、任务、团队与工作区原型补齐空态、权限和操作反馈；样式通过真实组件主题分支进入 production 分母。"
```

### Task 7: 收敛最终缺口并锁定 100% 契约

**Files:**
- Modify: residual adjacent test files reported by current `coverage-final.json`
- Modify: `vitest.config.ts`
- Modify: `scripts/verify-structure.mjs`
- Modify: `scripts/verify-structure.test.mjs`

**Interfaces:**
- Consumes: latest complete `coverage-final.json`。
- Produces: four metrics 100/100/100/100 and AST-enforced config contract。

- [ ] **Step 1: 运行完整 coverage 并生成零缺口 ledger**

Run: `pnpm.cmd test:coverage`

Expected: 若任一指标不足 100，使用 `coverage-final.json` 的 statementMap/fnMap/branchMap 定位具体未覆盖行为；只能补行为测试，不得修改 scope。

- [ ] **Step 2: 对每个 residual 做 RED/GREEN**

逐条记录：行为、可观察结果、禁止副作用、production mutation。focused test GREEN 后再运行完整 coverage，直到四项原始分子等于分母。

- [ ] **Step 3: 写 coverage 结构门禁 RED**

扩展结构 fixture 写入 `vitest.config.ts`，新增测试分别把 include 改窄、追加 style exclude、把任一 threshold 改为 99。三例都必须先因实现未检查而 RED，错误文本分别匹配：

```text
Coverage include 必须覆盖全部 src 运行时代码
Coverage exclude 只允许生成、类型与测试文件
Coverage 四项阈值必须为 100
```

- [ ] **Step 4: 用 TypeScript AST 实现 fail-closed 检查**

解析 `export default defineConfig({ test: { coverage: ... } })` 的 effective object literal；computed property、unknown spread 或非 literal array/number 一律视为 unknown 并报错。精确接受：

```ts
include: ['src/**/*.{ts,tsx}'],
exclude: [
  'src/.umi*/**',
  'src/services/generated/**',
  'src/**/*.d.ts',
  'src/**/*.{test,spec}.{ts,tsx}',
],
thresholds: {
  statements: 100,
  branches: 100,
  functions: 100,
  lines: 100,
},
```

Run: `node --test scripts/verify-structure.test.mjs`

Expected: GREEN；再把实际 `vitest.config.ts` threshold 从 80 提升到 100。

- [ ] **Step 5: 运行 tooling 与 fresh coverage**

```powershell
pnpm.cmd test:tooling
pnpm.cmd verify:structure
pnpm.cmd test:coverage
```

Expected: tooling/structure exit 0；62+ test files 全部通过；四项精确 100%。

- [ ] **Step 6: 提交覆盖率契约**

```powershell
git add vitest.config.ts scripts/verify-structure.mjs scripts/verify-structure.test.mjs src
git commit -m "test(coverage): enforce complete runtime protection" -m "完整 V8 报告已达到四项 100%；AST 门禁固定分母和阈值，阻止后续通过排除样式或降低 branch 门槛回退。"
```

### Task 8: 完整验证、报告、审查与交付

**Files:**
- Create: `docs/superpowers/reports/2026-08-20-frontend-true-coverage-100.md`
- Verify: `.github/workflows/ci.yml`

**Interfaces:**
- Produces: latest-SHA local CI evidence, review findings, merged/pushed main。

- [ ] **Step 1: 写最终报告**

报告必须记录 expanded baseline、最终四项分子分母、测试文件/测试数、每个切片 mutation RED/GREEN、零 skip/retry/未声明 warning、合法排除与 `coverage-final.json` SHA-256。

- [ ] **Step 2: 在最新 HEAD 运行 CI 原样门禁**

```powershell
node --version
pnpm.cmd --version
pnpm.cmd install --frozen-lockfile
pnpm.cmd verify
pnpm.cmd openapi:check:release
git diff --check
git status --short
```

Expected: Node `v24.12.0`、pnpm `11.18.0`；全部 exit 0；完整 coverage 四项 100%；工作树只含待提交报告时先提交报告，最终 clean。

- [ ] **Step 3: 正常 hooks 提交报告并做 fresh verification**

```powershell
git add docs/superpowers/reports/2026-08-20-frontend-true-coverage-100.md
git commit -m "docs(testing): record complete coverage evidence" -m "记录完整分母、反事实失败与本机 CI 门禁，避免只用百分比截图替代可复核证据。"
pnpm.cmd test:coverage
git status --short
```

- [ ] **Step 4: 只读审查**

按 Spec 与仓库 Standards 两轴审查 `a570567..HEAD`：重点拒绝弱断言、mock 自测、新增 ignore/exclude、测试专用 production API、未恢复 mutation 和被吞掉的 warning。Important/Critical 必须修复并 fresh 重跑相关门禁。

- [ ] **Step 5: 合并、推送与清理**

确认 `main`、`origin/main` 仍为 `a570567` 的祖先，主工作区仍只有用户的两个已知改动。使用 `git merge --ff-only test/frontend-coverage-100` 更新本地 main 和主工作区分支，推送 `main`，用 `git ls-remote` 核对远端 SHA。随后删除临时 worktree、删除已合并分支并 `git worktree prune`；最终恢复本地前端与后端开发服务并在外部 Chrome 保留登录页。

## Self-Review

- Spec 的 production scope、合法排除、反事实验证、最终阈值、完整门禁和用户工作区保护均有对应 Task。
- transport/service、runtime shell、治理页面、其余页面/style 五个切片可以独立 RED/GREEN 与提交。
- 所有命令、路径、指标与 mutation 都是可执行的明确值；没有未决占位或模糊转引。
- 阈值只在完整报告实际达到 100 后提升；没有先抬门槛再缩分母。
