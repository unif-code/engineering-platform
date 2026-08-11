# Frontend Code Quality Deep Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不改变原型视觉、文案、路由、权限、数据契约和可观察交互的前提下，把全部手写前端代码收敛到长期可维护的 Feature 架构，并修复审计确认的 React、Ant Design、Mock 与工具链问题。

**Architecture:** 路由目录最终只从 Feature public index 导出页面；用户能力各自形成 Feature，所有管理域进入单一 `features/administration` 边界并在内部按领域拆分。共享组件保持无业务依赖，V0.2 Mock-only service seam 在 OpenAPI 0.2 Artifact 到来前原样保留，transport 只保留 Problem Details、认证与 mutation 基建。

**Tech Stack:** React 19.2、Umi Max 4、TypeScript、Ant Design 6.4.4、Pro Components 3.1.14-6、Ant Design X 2.9.0、antd-style、TanStack Query 5、Vitest 4、Testing Library、Biome 2、dependency-cruiser。

## Global Constraints

- 开始前完整读取 `AGENTS.md`、`../engineering-platform-docs/architecture/06-platform-application-integration.md`、本计划与对应审计报告。
- 当前用户规则明确不采用 generic `umi` Skill；Ant Design 组件修改前使用 `NO_UPDATE_CHECK=1 pnpm exec antd info <Component>`，必要时再查 `semantic` / `doc` / 官方 LLM 文档。
- 不修改 `src/.umi*`、`src/services/generated/`、`dist/`、`coverage/`、`openapi/spec.json` 或其他生成物。
- 不猜测 V0.2 后端 DTO；`src/services/admin*` Mock-only seam 保留到 api-v0.2.0 Artifact 锁定后的独立 Task 10。
- 不改变现有 URL、routeKey、菜单、权限、原型文案、fixture 内容、主题、DOM 可观察行为或业务动作语义。
- 不删除已审计为有职责的 `minWidth: 0`、表格 `scroll.x`、Drawer/Inspector 尺寸、内部 overflow、reduced-motion 和 flex/grid 规则。
- 不删除 AdminModels/AdminWorkspaces 的 `key={JSON.stringify(queryParams)}`，除非先以确定性 race test 证明同等可靠替代。
- 不把 Audit cursor flow 强行接入普通分页 Hook，不改 AdminPolicies 已有 generation/dirty guard。
- 缺陷修复严格 RED → GREEN；纯目录移动先记录 focused GREEN，移动后原命令再次 GREEN。禁止 sleep、retry、扩大全局 timeout 或降低断言。
- 每个 Task 只提交自己的精确文件，使用 Conventional Commits；不得 stage 其他会话的在途文件。
- `docs/superpowers/plans/2026-08-11-engineering-baseline-sync.md` 若正在执行，必须先自然完成并清洁工作树；两份计划不得并发改相同配置。其 generic Umi Skill/AGENTS overlay 文字已被最新用户规则覆盖，不得照旧落地。
- 每个阶段结束执行 `pnpm lint` 与 `pnpm test`；最终再执行 doctor、Ant checks、build 和浏览器 smoke。

## Audit Artifacts

- Design: `docs/superpowers/specs/2026-08-11-frontend-code-quality-deep-audit-design.md`
- Coverage/findings: `docs/superpowers/reports/2026-08-11-frontend-code-quality-audit.md`
- Baseline: 317 audited tracked files；68/68 Vitest files、454/454 tests；React Doctor exit 0；Ant lint 0 deprecated / 0 a11y / 0 usage。

---

### Task 1: 收紧手写代码质量门禁与组件知识源

**Files:**
- Modify: `biome.json`
- Modify: `tsconfig.json`
- Modify: `config/proxy.ts`
- Modify: `config/config.ts`
- Modify: `src/components/DetailDrawer/index.tsx`
- Modify: `src/pages/AdminModels/ModelCatalog.tsx`
- Modify: `mock/*.ts`
- Modify: `skills-lock.json`

**Interfaces:**
- Consumes: 当前 Biome/TypeScript 配置、Ant Design CLI、最新 `AGENTS.md`。
- Produces: 覆盖全部手写 Mock 的 Biome 门禁；`noUnusedLocals` / `noUnusedParameters`；无无解释 `any`、无错误 Effect deps；`ant-design` + `antd` Skill lock。

- [ ] **Step 1: 记录关闭规则的真实诊断基线**

Run separately:

```bash
pnpm exec biome lint --only=lint/correctness/useExhaustiveDependencies src/pages/AdminModels/ModelCatalog.tsx
pnpm exec biome lint --only=lint/suspicious/noExplicitAny config/proxy.ts src/components/DetailDrawer/index.tsx
pnpm exec biome lint --only=lint/a11y/noStaticElementInteractions src
pnpm exec biome lint --only=lint/a11y/useValidAnchor src
pnpm exec biome lint --only=lint/a11y/useKeyWithClickEvents src
pnpm exec tsc --noEmit --noUnusedLocals --noUnusedParameters
```

Expected: exhaustive-deps 只报告 `setModalState` 冗余；noExplicitAny 只报告 proxy 与上游 ProDescriptions 泛型边界；三项 a11y 规则和 TypeScript no-unused 均 exit 0。

- [ ] **Step 2: 删除本地可消除的诊断根因**

`config/proxy.ts` 使用推断类型：

```ts
const proxy = {
  dev: {},
  test: {},
  pre: {},
};

export type ProxyEnvironment = keyof typeof proxy;
export default proxy;
```

`config/config.ts` 在读取环境时做显式 key 收窄并提供 dev fallback：

```ts
const proxyEnvironment =
  REACT_APP_ENV in proxy ? (REACT_APP_ENV as keyof typeof proxy) : 'dev';

// defineConfig 内
proxy: proxy[proxyEnvironment],
```

从 `ModelCatalog` columns 的 dependency array 删除稳定 setter。`DetailDrawer` 只在 `ProDescriptionsProps` 要求的泛型行保留一条带原因的 `biome-ignore lint/suspicious/noExplicitAny`，不得关闭整个文件或项目规则。

- [ ] **Step 3: 启用已通过探针的规则并覆盖 Mock**

从 `biome.json.files.includes` 删除 `!**/mock`，保留 generated/coverage/dist exclusion；规则结果固定为：

```json
{
  "suspicious": {
    "noExplicitAny": "error",
    "noUnknownAtRules": "off"
  },
  "correctness": {
    "useExhaustiveDependencies": "error",
    "useUniqueElementIds": "off"
  },
  "a11y": {
    "noStaticElementInteractions": "error",
    "useKeyWithClickEvents": "error",
    "useValidAnchor": "error"
  }
}
```

在根 `tsconfig.json.compilerOptions` 加入：

```json
{
  "noUnusedLocals": true,
  "noUnusedParameters": true
}
```

若 engineering-baseline-sync 已把根 tsconfig 改为独立配置，就在该新配置内加入，不恢复 `.umi` extends。

- [ ] **Step 4: 机械格式化新纳入的 Mock**

Run:

```bash
pnpm exec biome check --write mock config/proxy.ts config/config.ts src/components/DetailDrawer/index.tsx src/pages/AdminModels/ModelCatalog.tsx
pnpm exec biome check mock config src/components/DetailDrawer src/pages/AdminModels/ModelCatalog.tsx
pnpm tsc
```

Expected: 只发生格式/import 顺序变化；全部 exit 0。

- [ ] **Step 5: 用 installer 对齐 Skill lock**

Run:

```bash
npx skills add unif-design/skills --skill ant-design --skill antd
```

Expected: `skills-lock.json` 不再只锁 generic `umi`；生成的 hash 由 installer 写入。`.agents/` 保持 ignored，不提交本地 Skill 内容。

- [ ] **Step 6: 运行 focused 与完整质量门**

Run:

```bash
pnpm exec vitest run src/components/DetailDrawer src/pages/AdminModels
pnpm lint
pnpm test
git diff --check
```

Expected: focused、lint、68+ test files 全绿；无新增 warning。

- [ ] **Step 7: 提交门禁收紧**

```bash
git add biome.json tsconfig.json config/proxy.ts config/config.ts src/components/DetailDrawer/index.tsx src/pages/AdminModels/ModelCatalog.tsx mock skills-lock.json
git commit -m "chore(quality): tighten handwritten code checks"
```

Expected: commit 不包含 `.agents/`、generated 目录或其他会话文件。

---

### Task 2: 修复 OpenAPI breaking baseline 诊断

**Files:**
- Create: `scripts/openapi-baseline.mjs`
- Create: `scripts/openapi-baseline.test.mjs`
- Modify: `scripts/openapi.mjs`
- Modify: `package.json` only if the engineering baseline tooling test script does not already include the new Node test。

**Interfaces:**
- Consumes: `ref: string`、breaking messages、base/current semantic versions。
- Produces: `describeBaselineCompatibility(input): { allowed: boolean; message: string }`；CLI 总是输出真实 ref，不再访问未定义标识符。

- [ ] **Step 1: 写会复现错误分支的 Node test**

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { describeBaselineCompatibility } from './openapi-baseline.mjs';

test('reports the resolved baseline ref when a breaking change is rejected', () => {
  const result = describeBaselineCompatibility({
    baseVersion: '1.4.0',
    breaking: ['删除 operation GET /api/v1/me'],
    currentVersion: '1.5.0',
    ref: 'origin/main',
  });

  assert.equal(result.allowed, false);
  assert.match(result.message, /相对 origin\/main/);
  assert.match(result.message, /主版本未升级/);
});

test('accepts an explicitly declared major breaking release', () => {
  const result = describeBaselineCompatibility({
    baseVersion: '1.4.0',
    breaking: ['删除 path /api/v1/legacy'],
    currentVersion: '2.0.0',
    ref: 'v1.4.0',
  });

  assert.equal(result.allowed, true);
  assert.match(result.message, /相对 v1\.4\.0/);
});
```

- [ ] **Step 2: 运行测试确认 RED**

Run:

```bash
node --test scripts/openapi-baseline.test.mjs
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND`。

- [ ] **Step 3: 实现纯格式化边界并接回 CLI**

`openapi-baseline.mjs` 实现：

```js
const majorOf = (version) => {
  const major = Number.parseInt(String(version ?? ''), 10);
  return Number.isNaN(major) ? null : major;
};

export function describeBaselineCompatibility({
  baseVersion,
  breaking,
  currentVersion,
  ref,
}) {
  const baseMajor = majorOf(baseVersion);
  const currentMajor = majorOf(currentVersion);
  const allowed =
    baseMajor !== null && currentMajor !== null && currentMajor > baseMajor;
  const message = allowed
    ? `相对 ${ref} 存在 breaking change，已由主版本升级（${baseVersion} → ${currentVersion}）显式声明。`
    : `相对 ${ref} 检测到 breaking change 但主版本未升级（${baseVersion} → ${currentVersion}）：${breaking.join('；')}。breaking 变更必须以 Artifact 主版本发布，审批随后端 Release 流程。`;
  return { allowed, message };
}
```

`checkBaselineCompatibility()` 把已经解构的 `ref` 传入；allowed 时 `console.log('[openapi] ' + message)`，否则 `fail(message)`。删除旧的 `baseRef` 两处引用和重复 `majorOf`。

- [ ] **Step 4: 运行 GREEN 与真实 OpenAPI check**

Run:

```bash
node --test scripts/openapi-baseline.test.mjs
pnpm openapi:check
pnpm exec biome check scripts/openapi.mjs scripts/openapi-baseline.mjs scripts/openapi-baseline.test.mjs
git diff --check
```

Expected: Node tests 与当前 0.1.0 Artifact check 全绿。

- [ ] **Step 5: 提交脚本修复**

```bash
git add scripts/openapi.mjs scripts/openapi-baseline.mjs scripts/openapi-baseline.test.mjs package.json
git commit -m "fix(openapi): report breaking baseline ref"
```

---

### Task 3: 删除无消费者的 Access 与 RouteGuard 兼容层

**Files:**
- Delete: `src/access.ts`
- Delete: `src/access.test.ts`
- Delete: `src/features/auth/RouteGuard.tsx`
- Delete: `src/features/auth/RouteGuard.test.tsx`
- Modify: `src/features/auth/index.ts`
- Modify: `config/config.ts`

**Interfaces:**
- Consumes: `features/navigation/RouteGuard`，它仍是 `config/routes.ts` 唯一 protected wrapper。
- Produces: 单一 Session/navigation authorization owner；无 unused Umi access plugin registration。

- [ ] **Step 1: 证明兼容层没有运行时消费者并记录 GREEN**

Run:

```bash
rg -n "canAccessAdmin|features/auth/RouteGuard|default as RouteGuard" src config
pnpm exec vitest run src/access.test.ts src/features/auth/RouteGuard.test.tsx src/features/navigation src/app.test.ts src/routes.test.ts
```

Expected: rg 只命中待删实现/测试/export；focused tests 全绿。

- [ ] **Step 2: 删除兼容层与空注册**

删除四个文件，从 Auth public index 删除：

```ts
export { default as RouteGuard } from './RouteGuard';
```

从 Umi config 删除：

```ts
access: {},
```

`config/routes.ts` 的 wrapper 保持 `@/features/navigation/RouteGuard` 不变。

- [ ] **Step 3: 验证唯一 guard**

Run:

```bash
rg -n "canAccessAdmin|features/auth/RouteGuard" src config
pnpm exec vitest run src/features/navigation src/app.test.ts src/routes.test.ts
pnpm tsc
pnpm depcruise
```

Expected: rg 0 命中；tests、types、dependency contract 全绿。

- [ ] **Step 4: 提交删除**

```bash
git add config/config.ts src/access.ts src/access.test.ts src/features/auth
git commit -m "refactor(access): remove obsolete visibility shim"
```

---

### Task 4: 删除 V0.1 API envelope

**Files:**
- Delete: `src/services/transport/envelope.ts`
- Delete: `src/types/api.ts`
- Modify: `src/services/transport/index.ts`

**Interfaces:**
- Consumes: current `ApiError` / `ProblemDetails` transport contract。
- Produces: transport public API 只包含 `createApiClient`、`normalizeApiError`、`onUnauthorized`、`mutationHeaders` 和相关类型。

- [ ] **Step 1: 记录无引用证据与 transport GREEN**

Run:

```bash
rg -n "ApiEnvelope|resolveApiEnvelope|transport/envelope" src config mock tests
pnpm exec vitest run src/services/transport
```

Expected: rg 只命中两个待删文件和 public export；transport tests 全绿。

- [ ] **Step 2: 删除文件与 export**

从 `src/services/transport/index.ts` 删除：

```ts
export { resolveApiEnvelope } from './envelope';
```

删除 `envelope.ts` 和 `types/api.ts`。

- [ ] **Step 3: 重跑 transport 与依赖门**

Run:

```bash
pnpm exec vitest run src/services/transport src/services/auth src/services/navigation
pnpm tsc
pnpm depcruise
git diff --check
```

Expected: 全绿，rg 对 legacy symbol 0 命中。

- [ ] **Step 4: 提交删除**

```bash
git add src/services/transport src/types/api.ts
git commit -m "refactor(transport): remove legacy response envelope"
```

---

### Task 5: 收正 Theme 全局声明并删除 placeholder

**Files:**
- Move: `src/types/theme.d.ts` → `src/features/theme/global.d.ts`
- Delete: `src/assets/.gitkeep`
- Delete: `src/components/.gitkeep`
- Delete: `src/constants/.gitkeep`
- Delete: `src/hooks/.gitkeep`
- Delete: `src/models/.gitkeep`
- Delete: `src/types/.gitkeep`
- Delete: `src/utils/.gitkeep`

**Interfaces:**
- Consumes: `ThemeSnapshot` private Theme type。
- Produces: Theme 全局 bootstrap 声明不再由 shared types 反向依赖 Feature；无无效目录 placeholder。

- [ ] **Step 1: 记录 Theme 与类型基线**

Run:

```bash
pnpm exec vitest run src/features/theme
pnpm tsc
```

Expected: 全绿。

- [ ] **Step 2: 移动 declaration 并删除 placeholders**

移动后的 `global.d.ts` 内容使用同目录 import：

```ts
import type { ThemeSnapshot } from './type';

declare global {
  interface Window {
    __ENGINEERING_PLATFORM_THEME__?: ThemeSnapshot;
  }
}
```

删除七个 `.gitkeep`；不创建空目录替代品。

- [ ] **Step 3: 验证 Theme 和 tracked placeholders**

Run:

```bash
pnpm exec vitest run src/features/theme src/app.test.ts
pnpm tsc
test -z "$(git ls-files 'src/**/.gitkeep')"
git diff --check
```

Expected: Theme/app 全绿；命令确认没有 tracked `.gitkeep`。

- [ ] **Step 4: 运行应用壳阶段完整门**

```bash
pnpm lint
pnpm test
```

Expected: 全量静态门和测试均绿；删除兼容层、legacy envelope、声明移动与 placeholder 清理没有破坏现有入口。

- [ ] **Step 5: 提交结构清理**

```bash
git add src/features/theme/global.d.ts src/types/theme.d.ts src/**/.gitkeep
git commit -m "refactor(theme): colocate global theme declaration"
```

---

### Task 6: 将 Login 与 Bootstrap 路由编排归入 Auth Feature

**Files:**
- Create: `src/features/auth/LoginPage.tsx`
- Move: `src/pages/Login/index.test.tsx` → `src/features/auth/LoginPage.test.tsx`
- Create: `src/features/auth/BootstrapPage.tsx`
- Modify: `src/features/auth/BootstrapWizard.tsx`
- Modify: `src/features/auth/index.ts`
- Modify: `src/pages/Login/index.tsx`
- Modify: `src/pages/Bootstrap/index.tsx`

**Interfaces:**
- Consumes: `LoginFlow`、`LoginShell`、`fetchMe`、Navigation public API、Theme public API、Umi Initial State。
- Produces: `LoginPage`、`BootstrapPage` public exports；两个 route pages 只装配 public Feature。

- [ ] **Step 1: 记录移动前登录基线**

Run:

```bash
pnpm exec vitest run src/features/auth src/pages/Login/index.test.tsx src/routes.test.ts
```

Expected: 全绿；保存 test count。

- [ ] **Step 2: 把页面编排与测试移动到 Feature**

`LoginPage.tsx` 采用原页面 JSX，但删除 `loginSucceeded` state 与 Effect；成功链固定为：

```ts
const refreshSession = async () => {
  const [me, navigation] = await Promise.all([fetchMe(), fetchNavigation()]);
  if (me === null) {
    message.error('登录状态刷新失败');
    return;
  }
  const { capabilities, ...principal } = me;
  await setInitialState({ capabilities, navigation, principal });
  history.push(postLoginPath);
};
```

`BootstrapPage.tsx` 接收原 `<main><BootstrapWizard /></main>` 装配。从 `Steps` 删除默认值等价的 `responsive` prop。

- [ ] **Step 3: 收敛 Auth public exports 与薄 pages**

`features/auth/index.ts` 增加：

```ts
export { BootstrapPage } from './BootstrapPage';
export { LoginPage } from './LoginPage';
```

两个 route entry 精确为：

```ts
// src/pages/Login/index.tsx
export { LoginPage as default } from '@/features/auth';
```

```ts
// src/pages/Bootstrap/index.tsx
export { BootstrapPage as default } from '@/features/auth';
```

- [ ] **Step 4: 运行移动后相同测试与 API lint**

Run:

```bash
pnpm exec vitest run src/features/auth src/pages/Login src/routes.test.ts
NO_UPDATE_CHECK=1 pnpm exec antd lint ./src/features/auth
pnpm exec biome check src/features/auth src/pages/Login src/pages/Bootstrap
pnpm tsc
pnpm depcruise
```

Expected: 原 test count 不减少；Login redirect、Initial State commit、BOOTSTRAP 和主题行为全部通过。

- [ ] **Step 5: 提交 Auth 迁移**

```bash
git add src/features/auth src/pages/Login src/pages/Bootstrap
git commit -m "refactor(auth): move route orchestration into feature"
```

---

### Task 7: 将工作台迁入 Dashboard Feature

**Files:**
- Move: `src/pages/Home/constant.ts` → `src/features/dashboard/constant.ts`
- Move: `src/pages/Home/index.style.ts` → `src/features/dashboard/index.style.ts`
- Move: `src/pages/Home/index.test.tsx` → `src/features/dashboard/index.test.tsx`
- Move: `src/pages/Home/index.tsx` → `src/features/dashboard/index.tsx`
- Move: `src/pages/Home/type.ts` → `src/features/dashboard/type.ts`
- Create: `src/pages/Home/index.tsx`

**Interfaces:**
- Consumes: shared `MetricCard`、`SemanticTag` 和静态 dashboard fixture。
- Produces: Dashboard public default page；route page 只转发该 public entry。

- [ ] **Step 1: 运行移动前 Home GREEN**

```bash
pnpm exec vitest run src/pages/Home
```

Expected: current Home tests 全绿。

- [ ] **Step 2: 原样移动 Feature 文件并创建薄 route**

移动后 `src/pages/Home/index.tsx` 精确为：

```ts
export { default } from '@/features/dashboard';
```

业务 JSX、copy、constants、styles 不做顺手改写。

- [ ] **Step 3: 运行同一行为测试与架构门**

```bash
pnpm exec vitest run src/features/dashboard src/routes.test.ts
pnpm exec biome check src/features/dashboard src/pages/Home
pnpm tsc
pnpm depcruise
```

Expected: Home test count/断言不减少；page 不再有 components/fixture imports。

- [ ] **Step 4: 提交 Dashboard 迁移**

```bash
git add src/features/dashboard src/pages/Home
git commit -m "refactor(dashboard): move workbench into feature"
```

---

### Task 8: 将 Tasks 与 TaskDetail 合并为 Tasks Feature

**Files:**
- Create: `src/features/tasks/index.ts`
- Move: `src/pages/Tasks/index.tsx` → `src/features/tasks/TasksPage.tsx`
- Move: `src/pages/Tasks/Archived.tsx` → `src/features/tasks/ArchivedTasksPage.tsx`
- Move: `src/pages/Tasks/AssignTaskSteps.tsx` → `src/features/tasks/AssignTaskSteps.tsx`
- Move: `src/pages/Tasks/CreateTaskModal.tsx` → `src/features/tasks/CreateTaskModal.tsx`
- Move: `src/pages/Tasks/TaskBoard.tsx` → `src/features/tasks/TaskBoard.tsx`
- Move: `src/pages/Tasks/TaskList.tsx` → `src/features/tasks/TaskList.tsx`
- Move: `src/pages/Tasks/constant.ts` → `src/features/tasks/constant.ts`
- Move: `src/pages/Tasks/index.style.ts` → `src/features/tasks/index.style.ts`
- Move: `src/pages/Tasks/index.test.tsx` → `src/features/tasks/TasksPage.test.tsx`
- Move: `src/pages/Tasks/type.ts` → `src/features/tasks/type.ts`
- Move: `src/pages/Tasks/util.ts` → `src/features/tasks/util.ts`
- Move: `src/pages/Tasks/util.test.ts` → `src/features/tasks/util.test.ts`
- Move: `src/pages/TaskDetail/index.tsx` → `src/features/tasks/TaskDetailPage.tsx`
- Move: `src/pages/TaskDetail/index.test.tsx` → `src/features/tasks/TaskDetailPage.test.tsx`
- Move: `src/pages/TaskDetail/constant.ts` → `src/features/tasks/detail.constant.ts`
- Move: `src/pages/TaskDetail/index.style.ts` → `src/features/tasks/detail.style.ts`
- Move: `src/pages/TaskDetail/type.ts` → `src/features/tasks/detail.type.ts`
- Move: `src/pages/TaskDetail/ConversationPane.tsx` → `src/features/tasks/ConversationPane.tsx`
- Move: `src/pages/TaskDetail/DiffContent.tsx` → `src/features/tasks/DiffContent.tsx`
- Move: `src/pages/TaskDetail/InspectorPanel.tsx` → `src/features/tasks/InspectorPanel.tsx`
- Move: `src/pages/TaskDetail/PreviewFrame.tsx` → `src/features/tasks/PreviewFrame.tsx`
- Move: `src/pages/TaskDetail/RejectApprovalModal.tsx` → `src/features/tasks/RejectApprovalModal.tsx`
- Modify/Create: `src/pages/Tasks/index.tsx`
- Modify/Create: `src/pages/Tasks/Archived.tsx`
- Modify/Create: `src/pages/TaskDetail/index.tsx`

**Interfaces:**
- Consumes: `useParams`、shared DetailDrawer/charts/tags、static prototype action。
- Produces: `TasksPage`、`ArchivedTasksPage`、`TaskDetailPage`；三条 route 与现有 focus behavior 不变。

- [ ] **Step 1: 记录两个目录的完整 GREEN**

```bash
pnpm exec vitest run src/pages/Tasks src/pages/TaskDetail src/components/DetailDrawer
```

Expected: 当前 Tasks/TaskDetail/Drawer tests 全绿且无 act warning。

- [ ] **Step 2: 精确移动文件并更新同 Feature 私有 imports**

所有原 `./constant` / `./type` / `./index.style` 引用按新名字更新；不改 fixture 和 JSX。`src/features/tasks/index.ts` 精确导出：

```ts
export { default as ArchivedTasksPage } from './ArchivedTasksPage';
export { default as TaskDetailPage } from './TaskDetailPage';
export { default as TasksPage } from './TasksPage';
```

- [ ] **Step 3: 创建三个薄 route entries**

```ts
// src/pages/Tasks/index.tsx
export { TasksPage as default } from '@/features/tasks';
```

```ts
// src/pages/Tasks/Archived.tsx
export { ArchivedTasksPage as default } from '@/features/tasks';
```

```ts
// src/pages/TaskDetail/index.tsx
export { TaskDetailPage as default } from '@/features/tasks';
```

- [ ] **Step 4: 重跑完整行为与依赖检查**

```bash
pnpm exec vitest run src/features/tasks src/components/DetailDrawer src/features/navigation/RouteGuard.test.tsx src/routes.test.ts
pnpm exec biome check src/features/tasks src/pages/Tasks src/pages/TaskDetail
pnpm tsc
pnpm depcruise
```

Expected: 原测试数不减少；Artifact/Diff/Reject focus return、列表/看板/归档/详情行为全绿。

- [ ] **Step 5: 提交 Tasks 迁移**

```bash
git add src/features/tasks src/pages/Tasks src/pages/TaskDetail src/features/navigation/RouteGuard.test.tsx
git commit -m "refactor(tasks): consolidate task route implementations"
```

---

### Task 9: 将用户 Workspace 页面迁入 Workspaces Feature

**Files:**
- Move: `src/pages/Workspaces/MemberPanel.tsx` → `src/features/workspaces/MemberPanel.tsx`
- Move: `src/pages/Workspaces/RepositoryPanel.tsx` → `src/features/workspaces/RepositoryPanel.tsx`
- Move: `src/pages/Workspaces/SettingsPanel.tsx` → `src/features/workspaces/SettingsPanel.tsx`
- Move: `src/pages/Workspaces/WorkspaceSelector.tsx` → `src/features/workspaces/WorkspaceSelector.tsx`
- Move: `src/pages/Workspaces/constant.ts` → `src/features/workspaces/constant.ts`
- Move: `src/pages/Workspaces/index.style.ts` → `src/features/workspaces/index.style.ts`
- Move: `src/pages/Workspaces/index.test.tsx` → `src/features/workspaces/index.test.tsx`
- Move: `src/pages/Workspaces/index.tsx` → `src/features/workspaces/index.tsx`
- Move: `src/pages/Workspaces/type.ts` → `src/features/workspaces/type.ts`
- Create: `src/pages/Workspaces/index.tsx`

**Interfaces:**
- Consumes: shared metrics/tags、ProForm、static prototype action。
- Produces: Workspaces public default page；route page 只转发。

- [ ] **Step 1: 记录移动前 GREEN**

```bash
pnpm exec vitest run src/pages/Workspaces
```

Expected: selector、成员、仓库、设置与静态动作 tests 全绿。

- [ ] **Step 2: 原样移动全部九个文件**

保持现有 flex master/detail、Tabs、fixtures、copy 与 styles；不把静态原型错误地接到 Admin workspace service。

薄 route：

```ts
export { default } from '@/features/workspaces';
```

- [ ] **Step 3: 重跑行为与 Ant checks**

```bash
pnpm exec vitest run src/features/workspaces src/routes.test.ts
NO_UPDATE_CHECK=1 pnpm exec antd lint ./src/features/workspaces
pnpm exec biome check src/features/workspaces src/pages/Workspaces
pnpm tsc
pnpm depcruise
```

Expected: 原测试数不减少，Tabs 销毁/切换、Member/Repository/Settings 行为不变。

- [ ] **Step 4: 提交 Workspaces 迁移**

```bash
git add src/features/workspaces src/pages/Workspaces
git commit -m "refactor(workspaces): move route implementation into feature"
```

---

### Task 10: 将 Messages 页面迁入 Messages Feature

**Files:**
- Move: `src/pages/Messages/constant.ts` → `src/features/messages/constant.ts`
- Move: `src/pages/Messages/index.style.ts` → `src/features/messages/index.style.ts`
- Move: `src/pages/Messages/index.test.tsx` → `src/features/messages/index.test.tsx`
- Move: `src/pages/Messages/index.tsx` → `src/features/messages/index.tsx`
- Move: `src/pages/Messages/type.ts` → `src/features/messages/type.ts`
- Create: `src/pages/Messages/index.tsx`

**Interfaces:**
- Consumes: shared SemanticTag 与 static prototype action。
- Produces: Messages public default page；route page 只转发。

- [ ] **Step 1: 记录移动前 GREEN**

```bash
pnpm exec vitest run src/pages/Messages
```

Expected: 五分类、筛选、空状态与“全部已读不改 fixture”行为全绿。

- [ ] **Step 2: 原样移动并创建薄 route**

```ts
// src/pages/Messages/index.tsx
export { default } from '@/features/messages';
```

不得把 category `all` 改成新的 sentinel 或修改 fixture 语义。

- [ ] **Step 3: 验证与提交**

```bash
pnpm exec vitest run src/features/messages src/routes.test.ts
pnpm exec biome check src/features/messages src/pages/Messages
pnpm tsc
pnpm depcruise
git diff --check
git add src/features/messages src/pages/Messages
git commit -m "refactor(messages): move message center into feature"
```

Expected: 全绿，commit 只含 Messages move/wrapper。

---

### Task 11: 将 TeamBoard 迁入 Team Feature

**Files:**
- Move: `src/pages/TeamBoard/constant.ts` → `src/features/teamBoard/constant.ts`
- Move: `src/pages/TeamBoard/index.style.ts` → `src/features/teamBoard/index.style.ts`
- Move: `src/pages/TeamBoard/index.test.tsx` → `src/features/teamBoard/index.test.tsx`
- Move: `src/pages/TeamBoard/index.tsx` → `src/features/teamBoard/index.tsx`
- Move: `src/pages/TeamBoard/type.ts` → `src/features/teamBoard/type.ts`
- Create: `src/pages/TeamBoard/index.tsx`

**Interfaces:**
- Consumes: shared MiniBarChart、DistributionBar、MetricCard、SemanticTag。
- Produces: TeamBoard public default page；route page 只转发。

- [ ] **Step 1: 记录移动前 GREEN**

```bash
pnpm exec vitest run src/pages/TeamBoard src/components/MiniBarChart src/components/DistributionBar
```

Expected: team switch 与两个 chart tests 全绿。

- [ ] **Step 2: 原样移动并创建薄 route**

```ts
export { default } from '@/features/teamBoard';
```

保留三组 fixture、原生 meter/fieldset、token tone 与 reduced-motion。

- [ ] **Step 3: 验证 TeamBoard 迁移**

```bash
pnpm exec vitest run src/features/teamBoard src/components/MiniBarChart src/components/DistributionBar src/routes.test.ts
pnpm exec biome check src/features/teamBoard src/pages/TeamBoard
pnpm tsc
pnpm depcruise
git diff --check
```

- [ ] **Step 4: 运行用户侧 Feature 阶段完整门**

```bash
pnpm lint
pnpm test
```

Expected: Login、Bootstrap、Dashboard、Tasks、Workspaces、Messages、TeamBoard 全部迁移后全量门绿。

- [ ] **Step 5: 提交 TeamBoard 迁移**

```bash
git add src/features/teamBoard src/pages/TeamBoard
git commit -m "refactor(team): move delivery board into feature"
```

---

### Task 12: 建立 Administration 内部边界并迁移概览

**Files:**
- Create: `src/features/administration/service.ts`
- Modify: `src/features/administration/index.ts`
- Move: `src/pages/Admin/constant.ts` → `src/features/administration/overview/constant.ts`
- Move: `src/pages/Admin/index.style.ts` → `src/features/administration/overview/index.style.ts`
- Move: `src/pages/Admin/index.test.tsx` → `src/features/administration/overview/Page.test.tsx`
- Move: `src/pages/Admin/index.tsx` → `src/features/administration/overview/Page.tsx`
- Move: `src/pages/Admin/type.ts` → `src/features/administration/overview/type.ts`
- Create: `src/pages/Admin/index.tsx`

**Interfaces:**
- Consumes: current admin service re-exports、Route Registry、shared MetricCard/SemanticTag、Ant Progress。
- Produces: private `administration/service.ts`；temporary public service facade during migration；public `AdminOverviewPage`。

- [ ] **Step 1: 写嵌套 Progress 语义回归并确认 RED**

在概览原测试增加：

```ts
it('每个服务只暴露一个有名称的 progressbar', () => {
  render(<AdminPage />);

  for (const serviceName of [
    'PostgreSQL',
    'NATS',
    'Object Storage',
    'Secret Store',
  ]) {
    expect(
      screen.getByRole('progressbar', {
        name: new RegExp(`${serviceName} 健康度`),
      }),
    ).toBeInTheDocument();
  }
  expect(screen.getAllByRole('progressbar')).toHaveLength(4);
});
```

Run:

```bash
pnpm exec vitest run src/pages/Admin/index.test.tsx
```

Expected: FAIL，当前嵌套 semantics 得到 8 个 progressbar 或名称冲突。

- [ ] **Step 2: 把 accessible name 交给 Ant Progress**

先查询：

```bash
NO_UPDATE_CHECK=1 pnpm exec antd info Progress --format json
NO_UPDATE_CHECK=1 pnpm exec antd semantic Progress
```

删除外层 `role` 与 aria value wrapper，直接使用：

```tsx
<Progress
  aria-label={`${service.name} 健康度 ${service.percent}%`}
  percent={service.percent}
  showInfo={false}
  size="small"
  status={service.tone === 'success' ? 'success' : 'normal'}
/>
```

- [ ] **Step 3: 建立 private service 与 public page export**

把当前 `features/administration/index.ts` 的 service/type re-exports 原样移入 `service.ts`。迁移期间 `index.ts` 暂时为：

```ts
export { default as AdminOverviewPage } from './overview/Page';
export * from './service';
export { formatGovernanceError } from './error';
```

这只是后续领域尚在 pages 时的过渡；Task 21 会删除 public service/error exports。

- [ ] **Step 4: 移动概览并创建薄 route**

```ts
// src/pages/Admin/index.tsx
export { AdminOverviewPage as default } from '@/features/administration';
```

- [ ] **Step 5: 运行 GREEN 与阶段门**

```bash
pnpm exec vitest run src/features/administration/overview src/routes.test.ts
NO_UPDATE_CHECK=1 pnpm exec antd lint ./src/features/administration/overview
pnpm exec biome check src/features/administration src/pages/Admin
pnpm tsc
pnpm depcruise
pnpm lint
pnpm test
```

Expected: 4 个且仅 4 个命名 progressbar；全量门绿。

- [ ] **Step 6: 提交 Administration foundation**

```bash
git add src/features/administration src/pages/Admin
git commit -m "refactor(admin): establish administration feature boundary"
```

---

### Task 13: 迁移 Account 并提取 latest ProTable request Hook

**Files:**
- Create: `src/features/administration/useLatestProTableRequest.ts`
- Create: `src/features/administration/useLatestProTableRequest.test.tsx`
- Move: `src/pages/AdminUsers/AccountActionModal.tsx` → `src/features/administration/account/AccountActionModal.tsx`
- Move: `src/pages/AdminUsers/CredentialModal.tsx` → `src/features/administration/account/CredentialModal.tsx`
- Move: `src/pages/AdminUsers/UserModal.tsx` → `src/features/administration/account/UserModal.tsx`
- Move: `src/pages/AdminUsers/UserModal.test.tsx` → `src/features/administration/account/UserModal.test.tsx`
- Move: `src/pages/AdminUsers/constant.ts` → `src/features/administration/account/constant.ts`
- Move: `src/pages/AdminUsers/index.style.ts` → `src/features/administration/account/index.style.ts`
- Move: `src/pages/AdminUsers/index.test.tsx` → `src/features/administration/account/Page.test.tsx`
- Move: `src/pages/AdminUsers/index.tsx` → `src/features/administration/account/Page.tsx`
- Move: `src/pages/AdminUsers/type.ts` → `src/features/administration/account/type.ts`
- Move: `src/pages/AdminUsers/util.ts` → `src/features/administration/account/util.ts`
- Move: `src/pages/AdminUsers/util.test.ts` → `src/features/administration/account/util.test.ts`
- Modify: `src/features/administration/error.ts`
- Modify: `src/features/administration/error.test.ts`
- Modify: `src/features/administration/index.ts`
- Create: `src/pages/AdminUsers/index.tsx`

**Interfaces:**
- Consumes: `queryUserRows`、ProTable request signature、private administration service/error。
- Produces: `useLatestProTableRequest<Data, Params>()` returning `{ invalidate, request }`；public `AdminUsersPage`。

- [ ] **Step 1: 写 Hook 的迟到响应与卸载 RED**

测试使用两个 deferred promises：第二个先 resolve 时调用 `onSuccess`；第一个后 resolve 必须返回 `{data: [], success: false, total: 0}` 且不能再次调用 success/error；unmount 后 resolve 也不能落副作用。

最小 public shape：

```ts
type TableRequest<Data, Params> = NonNullable<
  ProTableProps<Data, Params>['request']
>;

interface LatestRequestOptions<Data> {
  onError: (error: unknown) => Partial<RequestData<Data>>;
  onSuccess: (result: Partial<RequestData<Data>>) => void;
}

export function useLatestProTableRequest<Data, Params>(
  source: TableRequest<Data, Params>,
  options: LatestRequestOptions<Data>,
): {
  invalidate: () => void;
  request: TableRequest<Data, Params>;
}
```

Run:

```bash
pnpm exec vitest run src/features/administration/useLatestProTableRequest.test.tsx
```

Expected: FAIL with module missing。

- [ ] **Step 2: 实现最小 generation Hook**

实现使用单一 `generationRef`：每次 request 和 `invalidate()` 递增；Effect cleanup 递增；只允许捕获值仍等于 current 时调用 `onSuccess` / `onError`。stale 结果固定：

```ts
const staleResult = { data: [], success: false, total: 0 };
```

不得引入 AbortController fake、sleep 或全局 store。

- [ ] **Step 3: 移动 Account 并替换重复 generation code**

`Page.tsx` 用 Hook 包住 `queryUserRows`；filter onChange 与 reload 继续在 state/reload 前调用 `invalidate()`，保留当前 debounce 窗口防护。删除 `formatAccountError`，改用 `../error` 的 `formatGovernanceError`；把 requestId/ordinary Error 断言移入/补入 `error.test.ts`。

所有同 Feature imports 改为 `../service`、`../error`、`../useLatestProTableRequest`，不从 `@/features/administration` 绕回 barrel。

- [ ] **Step 4: 添加 public export 与薄 route**

```ts
// administration/index.ts
export { default as AdminUsersPage } from './account/Page';
```

```ts
// pages/AdminUsers/index.tsx
export { AdminUsersPage as default } from '@/features/administration';
```

- [ ] **Step 5: 运行 Account race/full GREEN**

```bash
pnpm exec vitest run src/features/administration/useLatestProTableRequest.test.tsx src/features/administration/error.test.ts src/features/administration/account src/services/adminAccounts
NO_UPDATE_CHECK=1 pnpm exec antd lint ./src/features/administration/account
pnpm exec biome check src/features/administration src/pages/AdminUsers
pnpm tsc
pnpm depcruise
```

Expected: 原 AdminUsers 11+ tests 不减少；create credential、409/422/403、四动作和 stale request tests 全绿。

- [ ] **Step 6: 提交 Account 迁移**

```bash
git add src/features/administration src/pages/AdminUsers
git commit -m "refactor(admin): move account governance into feature"
```

---

### Task 14: 迁移 Organization 并恢复动态 Select virtualization

**Files:**
- Move: `src/pages/AdminOrganization/SuperiorModal.tsx` → `src/features/administration/organization/SuperiorModal.tsx`
- Move: `src/pages/AdminOrganization/constant.ts` → `src/features/administration/organization/constant.ts`
- Move: `src/pages/AdminOrganization/index.style.ts` → `src/features/administration/organization/index.style.ts`
- Move: `src/pages/AdminOrganization/index.test.tsx` → `src/features/administration/organization/Page.test.tsx`
- Move: `src/pages/AdminOrganization/index.tsx` → `src/features/administration/organization/Page.tsx`
- Move: `src/pages/AdminOrganization/type.ts` → `src/features/administration/organization/type.ts`
- Modify: `src/features/administration/index.ts`
- Create: `src/pages/AdminOrganization/index.tsx`

**Interfaces:**
- Consumes: private organization service/error、Ant Tree/ModalForm/Select。
- Produces: public `AdminOrganizationPage`；动态上级候选使用 Select 默认 virtualization。

- [ ] **Step 1: 记录移动前 Organization GREEN 与 API**

```bash
pnpm exec vitest run src/pages/AdminOrganization src/services/adminOrganization
NO_UPDATE_CHECK=1 pnpm exec antd info Select --format json
NO_UPDATE_CHECK=1 pnpm exec antd info Tree --format json
```

Expected: tests 全绿；Select `virtual` default 为 true。

- [ ] **Step 2: 移动并更新私有 imports**

把 service/error imports 改为 `../service` / `../error`。从 SuperiorModal 的动态 `fieldProps` 删除：

```ts
virtual: false,
```

保留显式 id、label、三层 Tree、合法候选规则和 reason validation。

- [ ] **Step 3: 公开页面并创建薄 route**

```ts
export { default as AdminOrganizationPage } from './organization/Page';
```

```ts
export { AdminOrganizationPage as default } from '@/features/administration';
```

- [ ] **Step 4: 验证与提交**

```bash
pnpm exec vitest run src/features/administration/organization src/services/adminOrganization src/routes.test.ts
NO_UPDATE_CHECK=1 pnpm exec antd lint ./src/features/administration/organization
pnpm exec biome check src/features/administration/organization src/pages/AdminOrganization
pnpm tsc
pnpm depcruise
git diff --check
git add src/features/administration src/pages/AdminOrganization
git commit -m "refactor(admin): move organization governance into feature"
```

Expected: behavior/test count 不减少；动态 Select 不再产生 performance warning。

---

### Task 15: 迁移 Workspace Governance 并复用 latest request

**Files:**
- Move: `src/pages/AdminWorkspaces/WorkspaceActionModal.tsx` → `src/features/administration/workspace/WorkspaceActionModal.tsx`
- Move: `src/pages/AdminWorkspaces/WorkspaceDetailDrawer.tsx` → `src/features/administration/workspace/WorkspaceDetailDrawer.tsx`
- Move: `src/pages/AdminWorkspaces/WorkspaceModal.tsx` → `src/features/administration/workspace/WorkspaceModal.tsx`
- Move: `src/pages/AdminWorkspaces/constant.ts` → `src/features/administration/workspace/constant.ts`
- Move: `src/pages/AdminWorkspaces/index.style.ts` → `src/features/administration/workspace/index.style.ts`
- Move: `src/pages/AdminWorkspaces/index.test.tsx` → `src/features/administration/workspace/Page.test.tsx`
- Move: `src/pages/AdminWorkspaces/index.tsx` → `src/features/administration/workspace/Page.tsx`
- Move: `src/pages/AdminWorkspaces/type.ts` → `src/features/administration/workspace/type.ts`
- Move: `src/pages/AdminWorkspaces/util.ts` → `src/features/administration/workspace/util.ts`
- Move: `src/pages/AdminWorkspaces/util.test.ts` → `src/features/administration/workspace/util.test.ts`
- Modify: `src/features/administration/index.ts`
- Create: `src/pages/AdminWorkspaces/index.tsx`

**Interfaces:**
- Consumes: organization tree、workspace service、`useLatestProTableRequest`、DetailDrawer、React Query mutations。
- Produces: public `AdminWorkspacesPage`；保留 owner/leader/member governance 与 stale request isolation。

- [ ] **Step 1: 记录完整 race/CRUD GREEN**

```bash
pnpm exec vitest run src/pages/AdminWorkspaces src/services/adminWorkspaces src/services/adminOrganization
```

Expected: current 10+ page/util tests、service tests、filter query key 与 owner transfer tests 全绿。

- [ ] **Step 2: 移动文件并接入 shared latest Hook**

删除页面私有 `requestSequenceRef`、cleanup Effect 和重复 request wrapper；用 Task 13 Hook 包住 `queryWorkspaceRows`。所有 filter change、table change 和 mutation reload 仍先 `invalidate()`。

保留：

```tsx
key={JSON.stringify(queryParams)}
```

不得用 actionRef 或 AbortController seam 替代这个已验证的 render isolation。

- [ ] **Step 3: 恢复动态 Owner/Leader Select virtualization**

从 `WorkspaceModal` Owner 与 `WorkspaceActionModal` invite/transfer account 的 `fieldProps` 删除 `virtual: false`。固定 status filter 保留非虚拟短枚举。

私有 imports 使用 `../service`、`../error`、`../useLatestProTableRequest` 和同目录文件。

- [ ] **Step 4: 添加 public export 与薄 route**

```ts
export { default as AdminWorkspacesPage } from './workspace/Page';
```

```ts
export { AdminWorkspacesPage as default } from '@/features/administration';
```

- [ ] **Step 5: 重跑确定性竞态与完整页面**

```bash
pnpm exec vitest run src/features/administration/useLatestProTableRequest.test.tsx src/features/administration/workspace src/services/adminWorkspaces src/services/adminOrganization
NO_UPDATE_CHECK=1 pnpm exec antd lint ./src/features/administration/workspace
pnpm exec biome check src/features/administration/workspace src/pages/AdminWorkspaces
pnpm tsc
pnpm depcruise
```

Expected: filter/result、Owner/Leader/member projection 和 409/403 行为全绿；dynamic Select warning 消失。

- [ ] **Step 6: 提交 Workspace governance 迁移**

```bash
git add src/features/administration src/pages/AdminWorkspaces
git commit -m "refactor(admin): move workspace governance into feature"
```

---

### Task 16: 迁移 Grant Governance 并复用 latest request

**Files:**
- Move: `src/pages/AdminGrants/GrantModal.tsx` → `src/features/administration/grant/GrantModal.tsx`
- Move: `src/pages/AdminGrants/RevokeGrantModal.tsx` → `src/features/administration/grant/RevokeGrantModal.tsx`
- Move: `src/pages/AdminGrants/constant.ts` → `src/features/administration/grant/constant.ts`
- Move: `src/pages/AdminGrants/index.style.ts` → `src/features/administration/grant/index.style.ts`
- Move: `src/pages/AdminGrants/index.test.tsx` → `src/features/administration/grant/Page.test.tsx`
- Move: `src/pages/AdminGrants/index.tsx` → `src/features/administration/grant/Page.tsx`
- Move: `src/pages/AdminGrants/type.ts` → `src/features/administration/grant/type.ts`
- Modify: `src/features/administration/index.ts`
- Create: `src/pages/AdminGrants/index.tsx`

**Interfaces:**
- Consumes: account/workspace list service、grant mutations、latest request Hook。
- Produces: public `AdminGrantsPage`；Principal × Capability × Scope 行为不变。

- [ ] **Step 1: 记录 Grant GREEN**

```bash
pnpm exec vitest run src/pages/AdminGrants src/features/administration/grantsAudit.test.ts src/services/adminGrants
```

Expected: list/create/revoke、reason、403/409 与 service seam tests 全绿。

- [ ] **Step 2: 移动并替换 request generation 重复**

用 `useLatestProTableRequest` 包住当前 `listGrants` adapter；success 更新 total，error 使用 private `formatGovernanceError` 并返回 empty successful table；filter/reload 先 invalidate。

- [ ] **Step 3: 对增长集合恢复 virtualization**

删除以下 `virtual={false}`：

- 页面 Principal filter。
- GrantModal Principal。
- GrantModal Workspace。

Capability 与 Scope Type 是固定短枚举，继续保留 `virtual={false}`。

- [ ] **Step 4: 公开页面、薄 route 并验证**

```ts
// administration/index.ts
export { default as AdminGrantsPage } from './grant/Page';
```

```ts
// pages/AdminGrants/index.tsx
export { AdminGrantsPage as default } from '@/features/administration';
```

Run:

```bash
pnpm exec vitest run src/features/administration/grant src/features/administration/useLatestProTableRequest.test.tsx src/services/adminGrants
NO_UPDATE_CHECK=1 pnpm exec antd lint ./src/features/administration/grant
pnpm exec biome check src/features/administration/grant src/pages/AdminGrants
pnpm tsc
pnpm depcruise
```

Expected: 原 tests 全绿；只剩固定枚举的可解释 Select warnings。

- [ ] **Step 5: 提交 Grant 迁移**

```bash
git add src/features/administration src/pages/AdminGrants
git commit -m "refactor(admin): move grant governance into feature"
```

---

### Task 17: 迁移 Audit cursor state machine

**Files:**
- Move: `src/pages/Audit/AuditRequestId.tsx` → `src/features/administration/audit/AuditRequestId.tsx`
- Move: `src/pages/Audit/constant.ts` → `src/features/administration/audit/constant.ts`
- Move: `src/pages/Audit/index.style.ts` → `src/features/administration/audit/index.style.ts`
- Move: `src/pages/Audit/index.test.tsx` → `src/features/administration/audit/Page.test.tsx`
- Move: `src/pages/Audit/index.tsx` → `src/features/administration/audit/Page.tsx`
- Move: `src/pages/Audit/type.ts` → `src/features/administration/audit/type.ts`
- Move: `src/pages/Audit/util.ts` → `src/features/administration/audit/util.ts`
- Move: `src/pages/Audit/util.test.ts` → `src/features/administration/audit/util.test.ts`
- Modify: `src/features/administration/index.ts`
- Create: `src/pages/Audit/index.tsx`

**Interfaces:**
- Consumes: audit service、DetailDrawer、MetricCard/MiniBarChart、clipboard。
- Produces: public `AuditPage`；cursor/sort/retry/generation owner 保持在 Audit 域内。

- [ ] **Step 1: 记录 Audit 完整 GREEN**

```bash
pnpm exec vitest run src/pages/Audit src/features/administration/grantsAudit.test.ts
```

Expected: util 8+、page 9+ tests 全绿，覆盖动态本地日界、三页 cursor、全局 sort、append retry、requestId copy。

- [ ] **Step 2: 原样移动 cursor state machine**

service/error imports 改为 `../service` / `../error`。以下状态与函数必须原样同 owner 保留：

- `requestSequenceRef` 与 unmount invalidation。
- `loadedRowsRef`、`nextCursorRef`、`failedCursorRef`。
- append failure 保留 token、同 cursor retry。
- sort/filter reset cursor、全集合 merge/dedupe/sort。

不得接 `useLatestProTableRequest`。

- [ ] **Step 3: 公开页面与薄 route**

```ts
export { default as AuditPage } from './audit/Page';
```

```ts
export { AuditPage as default } from '@/features/administration';
```

- [ ] **Step 4: 重跑完整 Audit tests**

```bash
pnpm exec vitest run src/features/administration/audit src/features/administration/grantsAudit.test.ts src/routes.test.ts
NO_UPDATE_CHECK=1 pnpm exec antd lint ./src/features/administration/audit
pnpm exec biome check src/features/administration/audit src/pages/Audit
pnpm tsc
pnpm depcruise
```

Expected: test count 不减少；无 cursor/clipboard/Drawer regression。

- [ ] **Step 5: 提交 Audit 迁移**

```bash
git add src/features/administration src/pages/Audit
git commit -m "refactor(audit): move cursor dashboard into feature"
```

---

### Task 18: 迁移 Policy Governance 且保留候选版本边界

**Files:**
- Move: `src/pages/AdminPolicies/PolicyDraftEditor.tsx` → `src/features/administration/policy/PolicyDraftEditor.tsx`
- Move: `src/pages/AdminPolicies/PolicyPreviewPanel.tsx` → `src/features/administration/policy/PolicyPreviewPanel.tsx`
- Move: `src/pages/AdminPolicies/PolicyVersionHistory.tsx` → `src/features/administration/policy/PolicyVersionHistory.tsx`
- Move: `src/pages/AdminPolicies/PublishPolicyModal.tsx` → `src/features/administration/policy/PublishPolicyModal.tsx`
- Move: `src/pages/AdminPolicies/constant.ts` → `src/features/administration/policy/constant.ts`
- Move: `src/pages/AdminPolicies/index.style.ts` → `src/features/administration/policy/index.style.ts`
- Move: `src/pages/AdminPolicies/index.test.tsx` → `src/features/administration/policy/Page.test.tsx`
- Move: `src/pages/AdminPolicies/index.tsx` → `src/features/administration/policy/Page.tsx`
- Move: `src/pages/AdminPolicies/type.ts` → `src/features/administration/policy/type.ts`
- Modify: `src/features/administration/index.ts`
- Create: `src/pages/AdminPolicies/index.tsx`

**Interfaces:**
- Consumes: policy service、ETag、candidate generation、dirty draft state。
- Produces: public `AdminPoliciesPage`；validate/preview/publish/rollback 语义不变。

- [ ] **Step 1: 记录 Policy race/dirty GREEN**

```bash
pnpm exec vitest run src/pages/AdminPolicies src/features/administration/policies.test.ts mock/adminPolicies.test.ts
```

Expected: catalog/draft/edit/validate/preview/publish/rollback、迟到结果、空数值、dirty rollback tests 全绿。

- [ ] **Step 2: 原样移动并更新 private imports**

所有 service types/functions 改从 `../service`，错误从 `../error`。保留：

- draft generation guard。
- nullable local input state 与 invalid/empty Save disable。
- dirty rollback disable、clean draft warning。
- `If-Match` / revision / TOTP / reason。

不得把这些状态折叠到一个通用 admin Hook。

- [ ] **Step 3: 公开页面、薄 route 并验证**

```ts
export { default as AdminPoliciesPage } from './policy/Page';
```

```ts
export { AdminPoliciesPage as default } from '@/features/administration';
```

Run:

```bash
pnpm exec vitest run src/features/administration/policy src/features/administration/policies.test.ts mock/adminPolicies.test.ts
NO_UPDATE_CHECK=1 pnpm exec antd lint ./src/features/administration/policy
pnpm exec biome check src/features/administration/policy src/pages/AdminPolicies
pnpm tsc
pnpm depcruise
```

Expected: 原 tests 全绿，无 stale candidate 或 draft loss regression。

- [ ] **Step 4: 提交 Policy 迁移**

```bash
git add src/features/administration src/pages/AdminPolicies
git commit -m "refactor(admin): move policy governance into feature"
```

---

### Task 19: 迁移 Model Management 并收紧表单类型

**Files:**
- Move: `src/pages/AdminModels/ModelCatalog.tsx` → `src/features/administration/model/ModelCatalog.tsx`
- Move: `src/pages/AdminModels/ModelEvaluationPanel.tsx` → `src/features/administration/model/ModelEvaluationPanel.tsx`
- Move: `src/pages/AdminModels/ModelModal.tsx` → `src/features/administration/model/ModelModal.tsx`
- Move: `src/pages/AdminModels/ModelUsagePanel.tsx` → `src/features/administration/model/ModelUsagePanel.tsx`
- Move: `src/pages/AdminModels/constant.ts` → `src/features/administration/model/constant.ts`
- Move: `src/pages/AdminModels/index.style.ts` → `src/features/administration/model/index.style.ts`
- Move: `src/pages/AdminModels/index.test.tsx` → `src/features/administration/model/Page.test.tsx`
- Move: `src/pages/AdminModels/index.tsx` → `src/features/administration/model/Page.tsx`
- Move: `src/pages/AdminModels/type.ts` → `src/features/administration/model/type.ts`
- Move: `src/pages/AdminModels/util.ts` → `src/features/administration/model/util.ts`
- Move: `src/pages/AdminModels/util.test.ts` → `src/features/administration/model/util.test.ts`
- Modify: `src/features/administration/index.ts`
- Create: `src/pages/AdminModels/index.tsx`

**Interfaces:**
- Consumes: local frozen model fixtures、ProTable request adapters、shared charts。
- Produces: public `AdminModelsPage`；validated submit uses complete `ModelFormValues`。

- [ ] **Step 1: 记录 Model GREEN**

```bash
pnpm exec vitest run src/pages/AdminModels src/components/MiniBarChart src/components/DistributionBar
```

Expected: catalog search/status、three Tabs、usage/evaluation、create/edit tests 全绿。

- [ ] **Step 2: 加入 compile-time complete form contract**

把 ModelModal 改为：

```ts
const submit = async (values: ModelFormValues) => {
  showStaticAction(
    model ? `编辑模型 ${model.name}` : `接入模型 ${values.name.trim()}`,
  );
  onClose();
  return true;
};

<ModalForm<ModelFormValues>
  initialValues={initialValues}
  // 其他 props 不变
>
```

`initialValues` 变量继续是 `Partial<ModelFormValues>`；Form rules 不变。

- [ ] **Step 3: 移动全部文件并保持 ProTable workaround**

保持：

```tsx
key={JSON.stringify(queryParams)}
```

`ModelEvaluationPanel` 继续用 local request adapter，不退回 `dataSource`。Task 1 已移除 columns deps 中多余 setter。

- [ ] **Step 4: 公开页面、薄 route 并验证**

```ts
export { default as AdminModelsPage } from './model/Page';
```

```ts
export { AdminModelsPage as default } from '@/features/administration';
```

Run:

```bash
pnpm exec vitest run src/features/administration/model src/components/MiniBarChart src/components/DistributionBar src/routes.test.ts
NO_UPDATE_CHECK=1 pnpm exec antd lint ./src/features/administration/model
pnpm exec biome check src/features/administration/model src/pages/AdminModels
pnpm tsc
pnpm depcruise
```

Expected: tests 全绿；Modal submit 为完整 type；无 dataSource regression。

- [ ] **Step 5: 提交 Model 迁移**

```bash
git add src/features/administration src/pages/AdminModels
git commit -m "refactor(admin): move model management into feature"
```

---

### Task 20: 迁移静态 Role、Menu 与 Skill 管理域

**Files:**
- Move: `src/pages/AdminRoles/CapabilityMatrix.tsx` → `src/features/administration/role/CapabilityMatrix.tsx`
- Move: `src/pages/AdminRoles/RoleModal.tsx` → `src/features/administration/role/RoleModal.tsx`
- Move: `src/pages/AdminRoles/constant.ts` → `src/features/administration/role/constant.ts`
- Move: `src/pages/AdminRoles/index.style.ts` → `src/features/administration/role/index.style.ts`
- Move: `src/pages/AdminRoles/index.test.tsx` → `src/features/administration/role/Page.test.tsx`
- Move: `src/pages/AdminRoles/index.tsx` → `src/features/administration/role/Page.tsx`
- Move: `src/pages/AdminRoles/type.ts` → `src/features/administration/role/type.ts`
- Move: `src/pages/AdminMenus/MenuModal.tsx` → `src/features/administration/menu/MenuModal.tsx`
- Move: `src/pages/AdminMenus/constant.ts` → `src/features/administration/menu/constant.ts`
- Move: `src/pages/AdminMenus/index.style.ts` → `src/features/administration/menu/index.style.ts`
- Move: `src/pages/AdminMenus/index.test.tsx` → `src/features/administration/menu/Page.test.tsx`
- Move: `src/pages/AdminMenus/index.tsx` → `src/features/administration/menu/Page.tsx`
- Move: `src/pages/AdminMenus/type.ts` → `src/features/administration/menu/type.ts`
- Move: `src/pages/AdminMenus/util.ts` → `src/features/administration/menu/util.ts`
- Move: `src/pages/AdminMenus/util.test.ts` → `src/features/administration/menu/util.test.ts`
- Move: `src/pages/AdminSkills/SkillModal.tsx` → `src/features/administration/skill/SkillModal.tsx`
- Move: `src/pages/AdminSkills/constant.ts` → `src/features/administration/skill/constant.ts`
- Move: `src/pages/AdminSkills/index.style.ts` → `src/features/administration/skill/index.style.ts`
- Move: `src/pages/AdminSkills/index.test.tsx` → `src/features/administration/skill/Page.test.tsx`
- Move: `src/pages/AdminSkills/index.tsx` → `src/features/administration/skill/Page.tsx`
- Move: `src/pages/AdminSkills/type.ts` → `src/features/administration/skill/type.ts`
- Modify: `src/features/administration/index.ts`
- Create: `src/pages/AdminRoles/index.tsx`
- Create: `src/pages/AdminMenus/index.tsx`
- Create: `src/pages/AdminSkills/index.tsx`

**Interfaces:**
- Consumes: static prototype action、SemanticTag、local ProTable adapters/forms。
- Produces: `AdminRolesPage`、`AdminMenusPage`、`AdminSkillsPage` public exports；三条 route 保持。

- [ ] **Step 1: 记录三个静态域 GREEN**

```bash
pnpm exec vitest run src/pages/AdminRoles src/pages/AdminMenus src/pages/AdminSkills
```

Expected: capability group preservation、menu filter/sort/form、skill create/edit/static action tests 全绿。

- [ ] **Step 2: 移动 Role files**

保留四个固定 role、跨 capability group merge、临时 state reset 和保存/删除 static feedback。根 public index 增加：

```ts
export { default as AdminRolesPage } from './role/Page';
```

- [ ] **Step 3: 移动 Menu files**

保留 13 个 route fixture、group/visibility/sort/pagination 与 Switch/Select/Form 行为。根 public index 增加：

```ts
export { default as AdminMenusPage } from './menu/Page';
```

- [ ] **Step 4: 移动 Skill files**

保留三张 catalog cards、active/deprecated、四字段 Modal 和 fixture immutability。根 public index 增加：

```ts
export { default as AdminSkillsPage } from './skill/Page';
```

- [ ] **Step 5: 创建三个薄 routes**

```ts
export { AdminRolesPage as default } from '@/features/administration';
```

```ts
export { AdminMenusPage as default } from '@/features/administration';
```

```ts
export { AdminSkillsPage as default } from '@/features/administration';
```

- [ ] **Step 6: 重跑三个域与 Ant checks**

```bash
pnpm exec vitest run src/features/administration/role src/features/administration/menu src/features/administration/skill src/features/navigation/RouteGuard.test.tsx src/routes.test.ts
NO_UPDATE_CHECK=1 pnpm exec antd lint ./src/features/administration/role
NO_UPDATE_CHECK=1 pnpm exec antd lint ./src/features/administration/menu
NO_UPDATE_CHECK=1 pnpm exec antd lint ./src/features/administration/skill
pnpm exec biome check src/features/administration/{role,menu,skill} src/pages/{AdminRoles,AdminMenus,AdminSkills}
pnpm tsc
pnpm depcruise
```

Expected: test count 不减少；没有新增 deprecated/a11y/usage warning。

- [ ] **Step 7: 提交静态管理域迁移**

```bash
git add src/features/administration src/pages/AdminRoles src/pages/AdminMenus src/pages/AdminSkills src/features/navigation/RouteGuard.test.tsx
git commit -m "refactor(admin): move static management domains into feature"
```

---

### Task 21: 收紧 Administration public API

**Files:**
- Modify: `src/features/administration/index.ts`
- Modify/Rename: `src/features/administration/mockContract.test.ts` → `src/features/administration/service.test.ts`
- Modify: `src/features/administration/grantsAudit.test.ts`
- Modify: `src/features/administration/policies.test.ts`
- Create: `tests/fixtures/dependency-contract/src/pages/AdministrationPrivate/index.ts`
- Modify: `scripts/dependency-contract.mjs`
- Modify: `src/features/administration/{account,audit,grant,menu,model,organization,overview,policy,role,skill,workspace}/**/*.{ts,tsx}` 中由 `rg` 精确报告的 self-barrel imports。

**Interfaces:**
- Consumes: private `service.ts`、`error.ts`、11 domain pages。
- Produces: public index 只暴露 route page components；service/error 仅 Administration 内部使用。

- [ ] **Step 1: 写 public-boundary 静态回归**

创建 fixture：

```ts
// tests/fixtures/dependency-contract/src/pages/AdministrationPrivate/index.ts
import '../../../features/administration/service';
```

在 `scripts/dependency-contract.mjs` 的 cases 先错误地期望 `rules: []`，让真实依赖规则产生 RED；随后把期望收紧为：

```js
{
  from: 'src/pages/AdministrationPrivate/index.ts',
  to: 'src/features/administration/service.ts',
  rules: ['pages-feature-public-entry-only'],
}
```

现有 allowed public-entry fixture 继续证明外部 page 可以导入 `features/administration/index`。

Run:

```bash
node scripts/dependency-contract.mjs
```

Expected: 添加 fixture assertion 前或错误期望下 RED，实际 rule 为 `pages-feature-public-entry-only`。

- [ ] **Step 2: 把服务契约测试切到 private seam**

`service.test.ts`、`grantsAudit.test.ts`、`policies.test.ts` 从 `./service` 导入 endpoint/type；error tests 从 `./error` 导入。领域内部不得再写：

```ts
from '@/features/administration'
```

而应使用 `../service` / `../error`。

- [ ] **Step 3: 将 public index 收敛为页面清单**

最终 `index.ts` 只包含这些 exports：

```ts
export { default as AdminGrantsPage } from './grant/Page';
export { default as AdminMenusPage } from './menu/Page';
export { default as AdminModelsPage } from './model/Page';
export { default as AdminOrganizationPage } from './organization/Page';
export { default as AdminOverviewPage } from './overview/Page';
export { default as AdminPoliciesPage } from './policy/Page';
export { default as AdminRolesPage } from './role/Page';
export { default as AdminSkillsPage } from './skill/Page';
export { default as AdminUsersPage } from './account/Page';
export { default as AdminWorkspacesPage } from './workspace/Page';
export { default as AuditPage } from './audit/Page';
```

- [ ] **Step 4: 验证无 self-barrel 与 public leakage**

```bash
rg -n "@/features/administration" src/features/administration
pnpm exec vitest run src/features/administration
node scripts/dependency-contract.mjs
pnpm tsc
pnpm depcruise
```

Expected: rg 0 命中；全部 Administration tests 与 21+ dependency fixture edges 全绿。

- [ ] **Step 5: 运行 Administration 阶段完整门并提交**

```bash
pnpm lint
pnpm test
git diff --check
git add src/features/administration tests/fixtures/dependency-contract scripts/dependency-contract.mjs
git commit -m "refactor(admin): narrow administration public boundary"
```

Expected: 全量门绿；commit 不含 route/UI 行为变化。

---

### Task 22: 收敛 Mock HTTP 基础原语

**Files:**
- Create: `mock/util.ts`
- Create: `mock/util.test.ts`
- Modify: `mock/adminAccounts.ts`
- Modify: `mock/adminAudit.ts`
- Modify: `mock/adminGrants.ts`
- Modify: `mock/adminOrg.ts`
- Modify: `mock/adminPolicies.ts`
- Modify: `mock/adminWorkspaces.ts`
- Modify: `mock/api.ts`
- Modify: `mock/auth.ts`
- Modify: `mock/handlers.ts`
- Verify only: all existing `mock/*.test.ts` and `src/features/auth/mockContract.test.ts`

**Interfaces:**
- Consumes: Express-like Umi Mock request/response shape、各领域已有 requestId sequence 与 Problem extensions。
- Produces: 仅含 HTTP 机械重复的 `mock/util.ts`；领域授权、状态机、fixture、错误文案与 requestId prefix 仍留在各自 Mock。

- [ ] **Step 1: 为纯 Mock primitives 写 RED 测试**

`mock/util.test.ts` 先覆盖以下公开 API；在 `util.ts` 不存在时运行并确认 module-missing RED：

```ts
export type MockHeaderValue = string | string[] | undefined;

export interface MockRequest {
  body?: unknown;
  headers: Record<string, MockHeaderValue>;
  params?: Record<string, string | undefined>;
  query?: Record<string, MockHeaderValue>;
}

export interface MockResponse {
  end?: () => unknown;
  json: (body: unknown) => unknown;
  setHeader: (name: string, value: string) => unknown;
  status: (statusCode: number) => MockResponse;
}

export interface MockProblemDetails extends Record<string, unknown> {
  detail: string;
  requestId: string;
  status: number;
  title: string;
  type: string;
}

export function isRecord(value: unknown): value is Record<string, unknown>;
export function isUuid(value: unknown): value is string;
export function readHeader(request: MockRequest, name: string): string | undefined;
export function readQuery(request: MockRequest, name: string): string | undefined;
export function parsePositiveInteger(value: string | undefined, fallback: number): number;
export function readReason(request: MockRequest): string | undefined;
export function createRequestIdFactory(prefix: string): () => string;
export function sendJson(response: MockResponse, status: number, body: unknown): void;
export function sendProblem(response: MockResponse, problem: MockProblemDetails): void;
```

测试必须覆盖 header 大小写、数组取首值、非法/零/负整数 fallback、UUID、非数组 record、reason trim、独立 requestId factory、JSON/Problem Content-Type 与原 body 不变。

Run:

```bash
pnpm exec vitest run mock/util.test.ts
```

Expected: FAIL，因为 `mock/util.ts` 尚不存在。

- [ ] **Step 2: 实现最小纯函数并确认 GREEN**

实现只做值读取、验证和 response 写入；`sendProblem` 接收调用方已经构造好的完整 Problem，不生成 title/detail/requestId，也不包含授权或领域判断。

```bash
pnpm exec vitest run mock/util.test.ts
pnpm exec biome check mock/util.ts mock/util.test.ts
```

Expected: 全绿。

- [ ] **Step 3: 逐 Mock 替换机械重复**

按 `auth → api/handlers → adminAccounts → adminOrg → adminWorkspaces → adminGrants → adminPolicies → adminAudit` 顺序迁移：

- 删除各文件重复的 `UUID_PATTERN`、`MockRequest`、`MockResponse`、`isRecord`、header/query reader、正整数 parser 和 JSON/Problem header 写法。
- 每个 `create*Mock` 内使用自己的 `createRequestIdFactory('mock-...')`，保持原 prefix 与每个 factory 独立计数。
- `readReason` 和 `isUuid(readHeader(...))` 只替代通用字段读取；具体 401/403/404/409/422 文案、extensions 和业务校验顺序不变。
- 不把领域 state、authorization callback、login/TOTP 限次、workspace owner/leader 投影、grant/policy cursor 或 fixture 放入 util。

每迁移一个文件立即跑其现有 contract test；首个迁移必须先用 spy/response 断言证明 headers、status、body 与迁移前一致。

- [ ] **Step 4: 运行全部 Mock 与消费链 GREEN**

```bash
pnpm exec vitest run mock src/features/auth/mockContract.test.ts src/services
pnpm exec biome check mock
pnpm tsc
pnpm depcruise
git diff --check
```

Expected: 全部 Mock contracts、TOTP→Session 消费链、admin service seams 与依赖门全绿；没有通过专用 test route 绕过真实 handler。

- [ ] **Step 5: 提交 Mock primitive 收敛**

```bash
git add mock
git commit -m "refactor(mock): consolidate request primitives"
```

Expected: commit 只含 Mock util 与机械迁移，不含 DTO、fixture 或页面行为变化。

---

### Task 23: 建立薄 Route Page 可执行边界并完成覆盖账本

**Files:**
- Create: `scripts/verify-page-boundaries.mjs`
- Create: `scripts/verify-page-boundaries.test.mjs`
- Modify: `package.json`
- Modify: `docs/superpowers/reports/2026-08-11-frontend-code-quality-audit.md`
- Verify: every tracked file under `src/pages/**`

**Interfaces:**
- Consumes: 迁移后的 19 个 `index.tsx` route entries 与 `src/pages/Tasks/Archived.tsx`；Feature public indexes。
- Produces: `verifyPageBoundaries(root): Promise<string[]>`、`pnpm verify:pages` 和覆盖账本最终状态。

- [ ] **Step 1: 为 Page boundary validator 写 RED**

`scripts/verify-page-boundaries.test.mjs` 用临时目录覆盖：

1. 只含 `export { DashboardPage as default } from '@/features/dashboard';` 的嵌套 route entry 返回空 issues。
2. `src/pages/Home/constant.ts`、`index.test.tsx`、`index.style.ts` 分别报告“page 目录含业务/测试/样式文件”。
3. `index.tsx` 若 import 后自行 render，报告“不是单一 Feature public re-export”。
4. `src/pages/Tasks/Archived.tsx` 这种非 index route entry，只要仍是单一 public re-export 即合法。
5. CLI 聚合全部问题后 exit 1，不在首个文件提前停止。

Run:

```bash
node --test scripts/verify-page-boundaries.test.mjs
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `verify-page-boundaries.mjs`。

- [ ] **Step 2: 实现最小 validator 并确认 GREEN**

实现只遍历 `<root>/src/pages` 的手写 `.ts` / `.tsx` 文件。合法内容必须匹配单一语句：

```ts
export { SomePublicPage as default } from '@/features/some-public-entry';
```

允许空白和结尾换行，不允许 local import、JSX、fixture、type、test 或 style；错误包含 repository-relative path。导出 symbol/path 不做硬编码清单，路由/Registry 一一对应继续由 `src/routes.test.ts` 负责。

Run:

```bash
node --test scripts/verify-page-boundaries.test.mjs
node scripts/verify-page-boundaries.mjs
```

Expected: tests 与真实仓库均 exit 0；真实仓库正好检查 20 个 route entry 文件。

- [ ] **Step 3: 接入现有 post-baseline scripts**

在 baseline plan 完成后的 `package.json` 增加：

```json
{
  "scripts": {
    "verify:pages": "node scripts/verify-page-boundaries.mjs"
  }
}
```

把 `pnpm verify:pages` 追加到现有 `lint` 链末尾；`verify` 已调用 `lint`，不得另起重复全仓链或覆盖 baseline 的 tooling/structure/Markdown/Coverage/doctor/build 步骤。

- [ ] **Step 4: 核对全部依赖与页面边界**

```bash
find src/pages -type f | sort
rg -n "from '@/features/[^']+/" src/pages --glob '*.{ts,tsx}'
rg -n "from '@/services|from '@/pages" src/pages --glob '*.{ts,tsx}'
node scripts/verify-page-boundaries.mjs
node scripts/dependency-contract.mjs
pnpm depcruise
pnpm exec vitest run src/routes.test.ts src/features/navigation
```

Expected: pages 仅 20 个薄 entry；两条 `rg` 均 0 命中；无 pages→service、Feature private 跨域或 Feature→pages 依赖。

- [ ] **Step 5: 更新覆盖账本与 Finding closure matrix**

在审计报告尾部追加实施结果，不改写历史基线：

- 重新用 `git ls-files` 计算纳入/排除数量。
- 为 F-01…F-17 逐项记录完成 Task 与 commit。
- 对每个原 `MOVE/REFACTOR/FIX/REMOVE` 组记录最终路径或删除证明。
- 对 KEEP 组重新确认 diff 为 0 或仅因 import path 机械变化。
- 明确 generated 目录仍未纳入、V0.2 Mock-only seam 未被猜写。

- [ ] **Step 6: 运行 Service/Mock/配置阶段完整门并提交**

```bash
pnpm lint
pnpm test
git diff --check
git add scripts/verify-page-boundaries.mjs scripts/verify-page-boundaries.test.mjs package.json docs/superpowers/reports/2026-08-11-frontend-code-quality-audit.md
git commit -m "test(architecture): enforce thin route pages"
```

Expected: 全量门绿；commit 只含可执行 page boundary、manifest 接线和最终账本。

---

### Task 24: 最终官方诊断、浏览器回归与交付审查

**Files:**
- Verify only: full repository tracked source/config/tests。
- Modify only if a real RED proves a defect: the smallest owning Task file plus its regression test。
- Append: `docs/superpowers/reports/2026-08-11-frontend-code-quality-audit.md` only when recording final evidence。

**Interfaces:**
- Consumes: Tasks 1–23 commits、post-baseline `pnpm verify` pipeline、现有 Mock login/session。
- Produces: 无遗漏、无视觉漂移、可回滚提交序列的最终验证证据。

- [ ] **Step 1: 核对提交与生成目录卫生**

```bash
git status --short
git diff --check
deep_audit_first_commit="$(git log -1 --format=%H --grep='^chore(quality): tighten handwritten code checks$')"
test -n "$deep_audit_first_commit"
deep_audit_base="$(git rev-parse "${deep_audit_first_commit}^")"
git log --oneline --reverse "$deep_audit_base"..HEAD
git status --short --ignored
```

Expected: 普通 status clean；首个 Task commit 唯一可定位，其 parent 自动成为 deep-audit base；提交均为计划中的 Conventional Commits；`src/.umi*`、`dist/`、`coverage/` 只可能显示 ignored，`src/services/generated` 相对 base 无差异。

- [ ] **Step 2: 运行仓库统一完整门**

```bash
pnpm install --frozen-lockfile
pnpm verify
```

Expected: post-baseline `verify` 中的 Biome、TypeScript、dependency-cruiser、OpenAPI、tooling tests、structure、Markdown、page boundary、Coverage 阈值、React Doctor、Ant Design checks 和 Utoopack build 全部通过。任一不明失败立即停止；不重试、不扩大 timeout、不跳过子门。

- [ ] **Step 3: 单独记录官方组件诊断明细**

即使 `pnpm verify` 已聚合，也单独运行可读性更好的只读报告：

```bash
pnpm doctor
NO_UPDATE_CHECK=1 pnpm exec antd usage ./src
NO_UPDATE_CHECK=1 pnpm exec antd lint ./src
NO_UPDATE_CHECK=1 pnpm exec antd doctor
```

Expected: React Doctor exit 0；Ant Design 0 deprecated / 0 a11y / 0 usage。只允许审计报告已逐项裁决并保留的固定小枚举 `Select virtual={false}` performance hints；doctor 的 SSR CSS-in-JS 提示在 `ssr: false` 下继续记录为非阻断事实。

- [ ] **Step 4: 使用默认开发配置做关键路由浏览器 smoke**

启动 `pnpm dev`，使用 fresh browser profile；不创建 tracked local config。登录后逐个直达并至少完成以下可观察断言：

- `/login`、`/bootstrap`：流程、主题、错误恢复与导航不变。
- `/home`、`/tasks`、`/tasks/archived`、`/tasks/REQ-2026-0142`、`/workspaces`、`/messages`、`/team-board`：标题、主内容、核心 tab/segmented/modal/drawer 行为不变。
- `/audit` 与 `/admin`、`/admin/users`、`/admin/organization`、`/admin/workspaces`、`/admin/grants`、`/admin/policies`、`/admin/models`、`/admin/roles`、`/admin/menus`、`/admin/skills`：route 可渲染、表格/树/卡片/筛选/弹层与原型不变。
- 复验 TaskDetail 三类浮层关闭后回焦、Admin 列表旧请求不覆盖新 query、Audit load-more retry、Policy generation/dirty guard。
- 记录 console error、runtime exception、非预期 4xx/5xx、mutating request；除测试动作明确触发的 Mock 写请求外均应为空。

对登录、Home、Tasks、TaskDetail、Admin 概览、Users、Audit 各保存一张相同 viewport 的 before/after 对照截图；像素变化若来自浏览器时间/动画先稳定状态再取图，不把截图阈值测试写进生产门禁。

- [ ] **Step 5: 对照 Finding、覆盖账本与 diff 做最终自审**

逐项回答：

1. F-01…F-17 是否有 RED/GREEN 或删除证明。
2. 317-file 历史账本中的每个 MOVE/REFACTOR/FIX/REMOVE 是否已闭合；新增文件是否归入目标 Feature。
3. 是否存在跨 Feature private import、page 业务实现、shared component→business、service→app 逆依赖。
4. 是否误改 route、routeKey、菜单、权限、文案、fixture、DTO、Mock status/body 或样式。
5. 是否出现新的 Effect 镜像、重复服务端 state、任意 `any`、orphan style、无依据 fixed viewport/media query。
6. 重新按 Step 1 计算 `deep_audit_base` 后，`git diff "$deep_audit_base"..HEAD -- src/services/generated openapi/spec.json src/.umi dist coverage` 是否为空。

- [ ] **Step 6: 按 requesting-code-review Skill 发起独立只读审查**

审查包必须包含 design、audit report、plan、base..HEAD commit range、完整 gate 输出摘要和浏览器证据。Reviewer 按 Critical / Important / Minor 返回；Critical/Important 先用 `receiving-code-review` 技术核验，成立则回到对应 Task 以 TDD 修复并重跑 Task 24，不做无测试热修。

- [ ] **Step 7: 写入最终证据并提交文档**

```bash
git add docs/superpowers/reports/2026-08-11-frontend-code-quality-audit.md
git commit -m "docs(frontend): record deep quality audit results"
git status --short
```

Expected: 最终文档 commit 只含证据与 closure matrix；工作树 clean。是否 push 由用户在看完最终汇总后明确决定。

---

## Finding Closure Matrix

| Finding | Closing Task |
| --- | ---: |
| F-01 OpenAPI baseline ReferenceError | 2 |
| F-02 pages 持有业务实现 | 6–20、23 |
| F-03 Login event navigation | 6 |
| F-04 nested Progress semantics | 12 |
| F-05 dead Access/RouteGuard compatibility | 3 |
| F-06 legacy envelope | 4 |
| F-07 repeated latest request ownership | 13、15、16 |
| F-08 duplicated Mock primitives | 22 |
| F-09 dynamic Select virtualization | 14–16 |
| F-10 partial Model form values | 19 |
| F-11 duplicate governance error formatter | 13 |
| F-12 Theme declaration reverse dependency | 5 |
| F-13 Biome/TypeScript gaps | 1 |
| F-14 Skill lock mismatch | 1 |
| F-15 redundant Steps responsive | 6 |
| F-16 redundant ModelCatalog dependency | 1 |
| F-17 useless `.gitkeep` files | 5 |
