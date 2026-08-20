# 前端真实 100% Coverage 设计

- 日期：2026-08-20
- 状态：用户已批准，进入实施
- 仓库：`engineering-platform`
- 基线提交：`a570567e049a03a04e43633c637426bc55d934dc`

## 背景

基线提交在本机运行 `pnpm test:coverage` 后，62 个测试文件、407 个测试全部通过，但覆盖率仅为：Statements 93.38%、Branches 84.34%、Functions 94.56%、Lines 93.32%。现有 `vitest.config.ts` 还整体排除了 22 个第一方 `index.style.ts`，因此当前百分比没有覆盖全部手写浏览器运行时代码。

本次采用用户批准的彻底方案：把 `src` 下全部第一方、人工维护、浏览器运行时可执行的 TypeScript/TSX 纳入分母，包括页面入口、组件、状态与权限、service、transport、错误兜底、样式构造和响应式分支。四项指标必须同时达到 100%，并以结构门禁防止后续通过降低阈值或扩大排除范围回退。

## 目标

1. `pnpm test:coverage` 的 Statements、Branches、Functions、Lines 均为 100%。
2. Coverage 分母覆盖 `src/**/*.{ts,tsx}` 中全部手写运行时代码，包括 22 个 `index.style.ts`。
3. 每个新增测试保护可观察行为，并有一次能编译、能运行的故障注入证明测试会因真实回归而失败。
4. 最终 coverage 成功输出没有未声明的 console、warning、skip、retry 或 timeout。
5. CI 与本地使用同一条 `pnpm verify`，并由阈值和结构契约共同阻止口径回退。

## Production Scope

Coverage include 固定为：

```text
src/**/*.{ts,tsx}
```

只允许以下排除：

```text
src/.umi*/**
src/services/generated/**
src/**/*.d.ts
src/**/*.{test,spec}.{ts,tsx}
```

排除理由逐项为：

- `src/.umi*/**`：Umi 生成目录，不是人工维护源码。
- `src/services/generated/**`：由版本化 OpenAPI Artifact 机械生成，受 Artifact digest 与生成一致性门禁保护。
- `src/**/*.d.ts`：纯类型声明，没有运行时行为。
- 测试文件：验证代码，不属于 production 分母。

不得排除样式、页面入口、barrel、错误处理、defensive branch、prototype 页面或低频操作。`config/` 与 `scripts/` 是构建和工程工具链，不进入浏览器 production coverage；它们继续由 `test:tooling`、结构、Markdown、OpenAPI 与构建门禁验证。

## 实施架构

### 1. 分母先行

第一项代码变更只取消 `src/**/index.style.ts` 排除，不调整阈值、不新增测试。随后在干净 worktree 上运行完整 coverage，保存 `coverage-final.json` 和完整 missing ledger。该报告是后续工作的唯一基线；看到缺口后不得改变 include/exclude。

### 2. 按行为切片

缺口按运行风险和边界分组，而不是按未覆盖行机械补调用：

1. transport、service 与纯函数：错误归一、空值、防御分支、请求参数和未发生的副作用。
2. app、auth、navigation、theme、shell：Session、权限、redirect、主题持久化和用户动作。
3. 账号、Workspace、组织、Grant、Policy、Audit：表单、并发冲突、失败保持、刷新与一次性凭据。
4. 其余页面与共享组件：空态、边界状态、辅助交互和入口装配。
5. 样式构造：通过真实组件渲染和主题/token 切换验证可观察 class 与响应式行为；不直接断言第三方实现细节。

每个切片先写行为测试，说明一个具体 production mutation 会让它失败；focused GREEN 后临时施加该 mutation，观察目标断言 RED，随后恢复并重跑 GREEN。生产代码只有在现有边界确实不可测试时才允许做行为保持的深模块拆分或依赖注入，不增加 test-only production API。

### 3. Coverage 契约

最终报告达到 100% 后，才把四项阈值提升到 100。结构/tooling 契约必须运行配置并验证：

- include 精确等于 `src/**/*.{ts,tsx}`；
- exclude 精确等于四类合法排除；
- 四项阈值精确为 100；
- 不存在 `coverage ignore` pragma、额外 per-file threshold 绕过或测试 retry。

契约测试以运行配置和断言导出值为主，不用源码字符串搜索冒充行为验证。

## 测试策略

- 纯函数和 service 使用表驱动 literal fixture，断言返回、错误类型、关键请求参数和禁止副作用。
- React 页面使用 Testing Library 从用户可见角色、文本和交互验证行为；只在网络、时钟、随机数和 generated client 边界使用 mock。
- 样式通过真实组件或直接消费公开 `useStyles` 的组件行为覆盖；断言语义 class、主题状态或布局结果，不断言 antd-style 私有缓存。
- 异步测试使用可观察状态和 Testing Library wait primitive，不增加 sleep、retry 或 timeout。
- 不使用 snapshot 作为唯一断言，不断言 mock 自身存在，不用生产 helper 计算 expected。

## 验证与交付

每个切片运行 focused tests、变更文件 Biome、TypeScript 和 diff check。最终在最新提交上顺序运行：

```powershell
pnpm.cmd install --frozen-lockfile
pnpm.cmd verify
pnpm.cmd openapi:check:release
```

`pnpm verify` 必须包含完整 coverage、React Doctor、Ant Design doctor/lint/usage 和 Utoopack build。最终报告记录目标 SHA、测试文件/测试数量、四项分子分母、完整命令退出码、故障注入证据、skip/retry/warning 数量和所有合法排除。正常 hooks 提交后使用 fast-forward 方式合并 `main`，推送并核对远端 SHA；清理临时 worktree 与分支。用户主工作区的 `config/proxy.ts`、`src/app.test.ts` 未提交改动必须保持不变。

## 非目标

- 不修改后端或 OpenAPI generated client。
- 不改变产品业务行为、路由、权限、菜单或视觉设计。
- 不通过新增 exclude、ignore pragma、关闭 branch、skip、retry、放宽 timeout 或后处理 coverage 文件取得 100%。
- 未收到 `【同步进度】`，不修改 `docs/superpowers/progress/current.md`。
