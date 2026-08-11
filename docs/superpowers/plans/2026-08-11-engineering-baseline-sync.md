# Engineering Baseline Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `engineering-platform` 同步到当前 Umi/Utoopack 工程基线，同时完整保留平台架构、OpenAPI 与 Problem Details 契约。

**Architecture:** 工程升级分为可执行验证器、运行时/静态配置、交付接线和文档 overlay 四层。结构验证器只约束通用工程事实，不读取或改写平台 API 协议；dependency-cruiser 与 OpenAPI 脚本继续负责平台专属架构。所有配置变化先由测试或真实 CLI 产生 RED，再做最小修改取得 GREEN。

**Tech Stack:** Umi Max 4、Utoopack、React 19、Ant Design 6、ProComponents 3、TanStack Query 5、TypeScript 5.9、Biome 2、Vitest 4、pnpm 11、Husky 9、GitHub Actions、Docker。

## Global Constraints

- 用户明确要求直接在已清洁且同步的 `main` 实施，不创建分支或 worktree。
- 不修改 `src/pages/`、`src/features/`、业务组件、API、Service、OpenAPI schema、生成客户端或 Problem Details 行为。
- 不采用共享 marketplace 的通用 `umi` Skill；平台架构文档和现有 OpenAPI 契约是 Umi 工程规则的事实源。PC/antd 组件知识使用 `ant-design` 与 `antd` Skill。
- 保留 `@ant-design/x`、`openapi-fetch`、`openapi-typescript`、dependency-cruiser、Docker publish 与 Release gate。
- 不修改或提交 `src/.umi*`、`dist`、`coverage`、`node_modules`、`.pnpm-store`。
- 使用 TDD；每个生产行为先取得正确 RED，再写最小实现并确认 GREEN。
- 所有脚本使用 pnpm，不使用 `npm run`、`|| true`、`continue-on-error` 或扩大 ignore/exclude 掩盖问题。
- 完成声明前读取并执行 `verification-before-completion` Skill。

---

### Task 1: 用 TDD 建立平台结构验证器

**Files:**
- Create: `scripts/verify-structure.test.mjs`
- Create: `scripts/verify-structure.mjs`

**Interfaces:**
- Consumes: Node standard library、平台根目录中的 JSON/config/source files。
- Produces: `verifyStructure(root): Promise<string[]>` 与 exit-code 非零的 CLI。

- [ ] **Step 1: 写缺少实现时失败的真实 fixture 测试**

创建临时目录 helper，写入最小合法 `package.json`、`config/config.ts`、`tsconfig.json`、`biome.json`、`.claude/settings.json`、`.husky/*`、`.lintstagedrc` 与手写源码。测试至少覆盖以下 mutation：

```js
test('accepts the platform engineering baseline', async () => {
  const root = await createValidFixture();
  assert.deepEqual(await verifyStructure(root), []);
});

test('reports obsolete builders and generated tsconfig coupling', async () => {
  const root = await createValidFixture();
  await mutatePackage(root, ({ devDependencies }) => {
    devDependencies.vite = '^7.3.5';
  });
  await write(root, 'config/config.ts', 'export default { mfsu: false };\n');
  await write(
    root,
    'tsconfig.json',
    '{"extends":"./src/.umi/tsconfig.json"}\n',
  );

  const output = (await verifyStructure(root)).join('\n');
  assert.match(output, /vite/);
  assert.match(output, /utoopack/);
  assert.match(output, /\.umi/);
});

test('reports framework imports and Less without applying API rules', async () => {
  const root = await createValidFixture();
  await write(root, 'src/legacy.ts', "import { history } from 'umi';\n");
  await write(root, 'src/legacy.less', '.legacy {}\n');
  await write(
    root,
    'src/services/domain/index.ts',
    'export const response = { code: 200, data: {}, message: "ok" };\n',
  );

  const output = (await verifyStructure(root)).join('\n');
  assert.match(output, /from 'umi'/);
  assert.match(output, /\.less/);
  assert.doesNotMatch(output, /信封|解包|code/);
});
```

- [ ] **Step 2: 运行测试并确认 RED**

Run:

```bash
node --test scripts/verify-structure.test.mjs
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `scripts/verify-structure.mjs`。

- [ ] **Step 3: 实现最小结构验证器**

实现并导出：

```js
export async function verifyStructure(root = process.cwd()) {
  const issues = [];
  // 读取并解析 manifest/config，扫描手写目录，累积全部问题后返回。
  return issues;
}
```

具体检查固定为设计文档中的八类：package manager/engine、依赖组、禁止 direct Vite/Utoopack、Umi config、独立 tsconfig、Biome scope、hooks/Skill 声明、`umi` import/Less。文件缺失与 JSON 解析错误都进入 `issues`，不得在首个问题处停止。

CLI 在无问题时输出 `结构验证通过`；有问题时逐项输出并设置 `process.exitCode = 1`。

- [ ] **Step 4: 运行 focused tests 并确认 GREEN**

Run:

```bash
node --test scripts/verify-structure.test.mjs
```

Expected: all tests PASS。

- [ ] **Step 5: 对现有仓库运行验证器并记录真实 RED**

Run:

```bash
node scripts/verify-structure.mjs
```

Expected: exit 1，至少报告 pnpm 10、direct Vite、`mfsu: false`、`.umi` tsconfig、缺失 hooks/Skill 声明；不得报告平台 API/Service 协议。

- [ ] **Step 6: 提交结构验证器**

```bash
git add scripts/verify-structure.mjs scripts/verify-structure.test.mjs
git commit -m "test(tooling): add structure baseline gate"
```

Expected: commit 只包含结构验证器及测试；当前仓库级 RED 保留给 Task 2/3 收敛。

---

### Task 2: 同步依赖、Utoopack 与静态测试配置

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `config/config.ts`
- Modify: `tsconfig.json`
- Modify: `biome.json`
- Modify: `vitest.config.ts`
- Modify: `Dockerfile`
- Modify: `typings.d.ts`
- Create: `pnpm-workspace.yaml`
- Create: `tests/umijs-max-react-query.typecheck.ts`

**Interfaces:**
- Consumes: Task 1 的 `verifyStructure(root)`；现有平台 routes/proxy/theme/OpenAPI/dependency-cruiser。
- Produces: pnpm 11 + Node floor、Utoopack build、独立 TypeScript、Biome check、80% Coverage。

- [ ] **Step 1: 更新 manifest，保留平台专属依赖**

将共同依赖同步为模板当前版本；保留平台专属包。必须包含以下关键结果：

```json
{
  "packageManager": "pnpm@11.18.0",
  "engines": { "node": ">=22.22.1", "pnpm": ">=11" },
  "dependencies": {
    "@ant-design/x": "^2.9.0",
    "openapi-fetch": "^0.17.0"
  },
  "devDependencies": {
    "@types/node": "^26.1.2",
    "@umijs/max": "^4.6.82",
    "typescript": "^5.9.3",
    "vitest": "^4.1.10"
  }
}
```

`vite` 必须消失；`@umijs/max` 只存在于 devDependencies；`@tanstack/react-query` 与 `@tanstack/react-query-devtools` 使用相同 range。

TypeScript 暂时保持 5.9.3：平台保留的 `openapi-typescript@7.13.0` 官方 peer range 为 `typescript: ^5.x`。Ant Design Pro 的 TypeScript 7 基线使用另一套 `max openapi` 生成链，不能在不改变平台 Artifact/Digest/兼容性门禁的情况下直接照搬。本轮不为版本数字引入双 TypeScript workspace；待生成器官方支持 TypeScript 7 后再整体升级。

- [ ] **Step 2: 更新 Umi、TypeScript、Biome 与 Vitest 配置**

`config/config.ts` 增加 `join`/`@root`、base/hash/fastRefresh/routePrefetch/manifest/utoopack，保留平台 `headScripts` 与 layout title，删除 MFSU/esbuild 配置。

`tsconfig.json` 直接声明 strict ES2022 bundler config，不得含 `extends`；include `config`、`mock`、`src`、`tests`、`typings.d.ts`、`vitest.config.ts`，exclude 全部 `.umi*` 与生成目录。

Umi 的 React Query 插件在运行时从 `@umijs/max` 转出 TanStack Query API，但脱离生成 tsconfig 后该转出会退化为 `any`。在 `typings.d.ts` 中把 `useQuery`、`useMutation` 声明为对应 TanStack Query 公共函数类型，并用 `tests/umijs-max-react-query.typecheck.ts` 的 compile-time 守卫确保 `data` 不会再次静默退化；不得用页面局部参数标注掩盖根因。

`biome.json` 使用 `preset: "recommended"`，覆盖手写目录，排除 `.git`、`.husky/_`、`.umi*`、coverage、dist、node_modules、`.pnpm-store`、Markdown、lockfile 与 `src/services/generated`。

`vitest.config.ts` 保留串行执行并增加：

```ts
clearMocks: true,
restoreMocks: true,
passWithNoTests: false,
coverage: {
  thresholds: {
    statements: 80,
    branches: 80,
    functions: 80,
    lines: 80,
  },
}
```

Coverage include `src/**/*.{ts,tsx}` 与 `mock/**/*.ts`，exclude 生成客户端、声明、样式和测试。

- [ ] **Step 3: 对齐 Docker builder 并刷新 lockfile**

将 builder 改为：

```dockerfile
FROM node:24.12.0-alpine AS builder
```

Run:

```bash
corepack pnpm install --lockfile-only
corepack pnpm install --frozen-lockfile
```

Expected: lockfile 使用 pnpm 11 正常解析，不再有 root direct Vite entry。

若 pnpm 11 拒绝未声明的依赖构建脚本，在根 `pnpm-workspace.yaml` 中显式允许构建 `esbuild`，并显式拒绝无需执行的兼容包脚本；不得使用全局 `dangerouslyAllowAllBuilds`。

- [ ] **Step 4: 运行结构验证并确认剩余 RED 只属于交付接线**

Run:

```bash
node scripts/verify-structure.mjs
```

Expected: dependency/Utoopack/tsconfig/Biome 问题消失；只剩 Task 3 将补充的 hooks/Skill 声明。

- [ ] **Step 5: 运行配置 focused checks**

Run each separately:

```bash
pnpm exec biome check package.json config/config.ts tsconfig.json biome.json vitest.config.ts
pnpm tsc
pnpm depcruise
pnpm openapi:check
node --test scripts/verify-structure.test.mjs
```

Expected: 全部 exit 0；若依赖升级暴露真实源码类型错误，先定位根因，不回退 strict 或扩大 exclude。

- [ ] **Step 6: 提交运行时与静态配置升级**

```bash
git add package.json pnpm-lock.yaml pnpm-workspace.yaml config/config.ts tsconfig.json biome.json vitest.config.ts Dockerfile typings.d.ts tests/umijs-max-react-query.typecheck.ts docs/superpowers/plans/2026-08-11-engineering-baseline-sync.md docs/superpowers/specs/2026-08-11-engineering-baseline-sync-design.md
git commit -m "chore(tooling): sync Umi engineering baseline"
```

Expected: commit 不包含源码、OpenAPI Artifact 或生成目录。

---

### Task 3: 建立 Markdown、hooks 与统一验证接线

**Files:**
- Create: `scripts/verify-markdown.test.mjs`
- Create: `scripts/verify-markdown.mjs`
- Create: `.husky/pre-commit`
- Create: `.husky/commit-msg`
- Create: `.lintstagedrc`
- Create: `.claude/settings.json`
- Modify: `package.json`
- Modify: `.github/workflows/ci.yml`
- Modify: `scripts/verify-structure.mjs`
- Modify: `scripts/verify-structure.test.mjs`

**Interfaces:**
- Consumes: Task 1/2 的结构验证与工程脚本。
- Produces: Markdown CLI、真实 Git hooks、`pnpm verify`、本地/CI 单一门禁。

- [ ] **Step 1: 写 Markdown 验证器测试并确认 RED**

测试使用真实临时文件，覆盖合法递归目录、尾随空白、缺少末尾换行、未闭合 fence、断裂相对链接、外部/hash/代码 fence 链接和 CLI exit code。

Run:

```bash
node --test scripts/verify-markdown.test.mjs
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `scripts/verify-markdown.mjs`。

- [ ] **Step 2: 实现 Markdown 验证器并确认 GREEN**

实现 `verifyMarkdown(inputs, root): Promise<string[]>`，仅使用 Node standard library；跳过 `.git`、`.umi*`、coverage、dist、node_modules。CLI 默认验证 README 与 docs，问题聚合后 exit 1。

Run:

```bash
node --test scripts/verify-markdown.test.mjs
```

Expected: all tests PASS。

- [ ] **Step 3: 写入 hooks、lint-staged 与 Skill 声明**

精确内容：

```sh
# .husky/pre-commit
pnpm exec lint-staged --quiet
```

```sh
# .husky/commit-msg
pnpm exec max verify-commit "$1"
```

```json
{
  "*.{js,mjs,cjs,jsx,ts,tsx,css,json,jsonc}": [
    "pnpm exec biome check --write --no-errors-on-unmatched"
  ],
  "*.md": ["node scripts/verify-markdown.mjs"]
}
```

`.claude/settings.json` 登记 `unif-design/skills` 的 `unif-skills` marketplace，并只启用 `ant-design@unif-skills` 与 `antd@unif-skills`。不得启用 `umi@unif-skills`。

先更新结构验证测试，确认只声明通用 `umi` Skill 时 RED，再把验证器改为要求上述两个组件 Skill 且拒绝通用 `umi` Skill。

- [ ] **Step 4: 将 scripts 全部改为 pnpm-native 并聚合 verify**

保留 depcruise/OpenAPI scripts，新增 `biome:check`、`test:tooling`、`verify:structure`、`verify:markdown`、doctor/antd 子命令。`verify` 顺序固定为：lint → tooling tests → structure → Markdown → Coverage → React Doctor → Ant Design checks → build。

- [ ] **Step 5: CI verify job 改为单一门禁**

安装 frozen lockfile 后运行：

```yaml
- run: pnpm verify
```

删除 verify job 中重复的 `pnpm lint`、`pnpm test`、`pnpm build`，不改 publish-image 与 release-gate。

- [ ] **Step 6: 运行交付接线 GREEN**

Run:

```bash
pnpm test:tooling
pnpm verify:structure
pnpm exec biome check package.json .github/workflows/ci.yml .claude/settings.json .lintstagedrc scripts
```

Expected: 全部 exit 0。

- [ ] **Step 7: 提交统一验证接线**

```bash
git add scripts/verify-markdown.mjs scripts/verify-markdown.test.mjs scripts/verify-structure.mjs scripts/verify-structure.test.mjs .husky/pre-commit .husky/commit-msg .lintstagedrc .claude/settings.json package.json pnpm-lock.yaml .github/workflows/ci.yml docs/superpowers/plans/2026-08-11-engineering-baseline-sync.md docs/superpowers/specs/2026-08-11-engineering-baseline-sync-design.md
git commit -m "chore(tooling): unify repository verification"
```

Expected: commit 只包含 Markdown tooling、hooks、scripts、CI 与必要 lockfile 更新。

---

### Task 4: 同步 AGENTS Skill 接线说明并修复 Markdown 基线

**Files:**
- Modify: `AGENTS.md`
- Modify: `docs/superpowers/plans/2026-08-08-architecture-docs-refactor.md`
- Modify: `docs/superpowers/plans/2026-08-09-dev-infra-v01.md`
- Modify: `docs/superpowers/specs/2026-08-09-backend-skeleton-v01-design.md`
- Modify: `docs/superpowers/specs/2026-08-09-dev-infra-v01-design.md`
- Modify: `docs/superpowers/specs/2026-08-09-frontend-shell-v01-design.md`
- Modify: `docs/superpowers/specs/2026-08-11-engineering-baseline-sync-design.md`
- Modify: `docs/superpowers/plans/2026-08-11-engineering-baseline-sync.md`

**Interfaces:**
- Consumes: 当前完整 `AGENTS.md`、平台 architecture/OpenAPI facts、Task 3 的组件 Skill 声明。
- Produces: 架构事实保持完整且 Skill 自动安装说明准确；单仓 checkout 可验证的 Markdown。

- [ ] **Step 1: 保留完整 AGENTS 并同步 Skill 接线说明**

不得把当前完整 `AGENTS.md` 薄化，也不得引入通用 `umi` Skill。保留 pages/features/services 依赖方向、generated/transport、OpenAPI Artifact、Problem Details、dependency-cruiser、`@ant-design/x`、Release deviation、测试与安全配置等全部仓库事实；只把“尚未提交 `.claude/settings.json`”更新为 Task 3 已启用 `ant-design@unif-skills` 与 `antd@unif-skills`。

- [ ] **Step 2: 修复已有 18 个 Markdown 问题**

- 给 `CLAUDE.md` 增加末尾换行。
- 历史 architecture refactor plan 中的 `NN-x`、`…`、示例 appendix/README 链接改为 inline code，避免把伪路径伪装为真实链接。
- 其余指向架构仓的链接改为 `https://github.com/unif-code/engineering-platform-docs/blob/main/architecture/...`。

- [ ] **Step 3: 运行 Markdown 与结构门禁**

Run:

```bash
pnpm verify:markdown
pnpm verify:structure
pnpm test:tooling
```

Expected: 全部 exit 0；Markdown 无 broken relative link。

- [ ] **Step 4: 提交仓库指导与 Markdown 基线**

```bash
git add AGENTS.md CLAUDE.md docs/superpowers
git commit -m "docs: align repository engineering guidance"
```

Expected: commit 只包含 AGENTS Skill 接线说明、历史 Markdown 链接修复及本计划状态更新。

---

### Task 5: 完整验证、自审与提交

**Files:**
- Verify all modified files only。

**Interfaces:**
- Consumes: Tasks 1–4 全部工程产物。
- Produces: 可复现的绿色 main 提交。

- [ ] **Step 1: 运行安装与差异卫生检查**

Run:

```bash
pnpm install --frozen-lockfile
git diff --check
git status --short
```

Expected: install 与 diff check exit 0；status 不含生成目录。

- [ ] **Step 2: 运行完整 pnpm verify**

Run:

```bash
pnpm verify
```

Expected: Biome、TypeScript、dependency-cruiser、OpenAPI、tooling、structure、Markdown、454+ Vitest、四项 Coverage ≥80、React Doctor、Ant Design 与 Utoopack build 全部通过。若 V8 Coverage 或 Utoopack 仅因沙箱权限失败，原样在沙箱外重跑同一完整命令，不拆门禁绕过。

- [ ] **Step 3: 核对 CI 独有门禁与生成物**

Run:

```bash
pnpm openapi:check
git status --short --ignored
git diff --stat
```

Expected: OpenAPI clean；`.umi*`、dist、coverage、node_modules、`.pnpm-store` 仅显示 ignored，不进入 staged diff。

- [ ] **Step 4: 按 requesting-code-review Skill 做独立只读审查**

审查重点：平台协议是否被误改、生成客户端是否被触碰、CI publish/release 是否保留、validator 是否存在 false positive/negative、direct Vite 是否只从 root manifest 删除。发现问题先按 receiving-code-review Skill 验证，再用 TDD 修复。

- [ ] **Step 5: 验证各任务的 Conventional Commits**

各任务已经按可回滚边界独立提交。最终核对提交范围，并运行：

```bash
git log --oneline --decorate -8
git status --short --branch
```

Expected: Task 1–4 的提交均为 Conventional Commits 且 hooks 已实际执行；main 工作区 clean。是否 push 由用户另行授权。
