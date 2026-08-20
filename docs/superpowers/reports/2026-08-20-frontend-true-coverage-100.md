# 前端真实覆盖率 100% 收口报告

## 结论

前端覆盖率分母已扩展为全部一方手写运行时代码，包含页面、组件、服务、运行时入口和样式模块。最终 V8 报告四项均为 100%，覆盖率结构门禁同时锁定 include、exclude 与四项阈值，不能通过缩小分母或降低阈值回退。

- 基线提交：`a570567e049a03a04e43633c637426bc55d934dc`
- 完整门禁提交：`4b3552d94a51945e9df65e5ea720eadafd4cfc8a`
- 验证环境：Node `v24.12.0`、pnpm `11.18.0`、Windows 干净 LF detached worktree
- `coverage/coverage-final.json` SHA-256：`54EC263ABB3376F6D220F92C8B8888F3836FD87B679A124E40B1420133F7612A`

## 覆盖率契约

唯一 include：

```text
src/**/*.{ts,tsx}
```

唯一合法 excludes：

```text
src/.umi*/**
src/services/generated/**
src/**/*.d.ts
src/**/*.{test,spec}.{ts,tsx}
```

没有新增 coverage ignore pragma、目录例外、单文件阈值或测试专用 production API。`scripts/verify-structure.mjs` 使用 TypeScript AST 校验 effective coverage 配置；非字面量、未知 spread 与可能覆盖配置的 computed property 均 fail closed。

## 基线与最终结果

| 指标 | Expanded baseline | 最终结果 |
| --- | ---: | ---: |
| 测试文件 | 62 | 75 |
| 测试数 | 407 | 556 |
| Statements | 93.53%（1995/2133） | 100%（2119/2119） |
| Branches | 84.34%（1126/1335） | 100%（1289/1289） |
| Functions | 94.72%（736/777） | 100%（792/792） |
| Lines | 93.40%（1940/2077） | 100%（2070/2070） |

最终报告中 23 个 `index.style.ts` / `login.style.ts` 全部四项 100%，不存在样式模块绕过。

## 反事实 RED / GREEN 证据

| 切片 | 临时 production mutation | RED 证明 | 恢复后的 GREEN |
| --- | --- | --- | --- |
| transport / services | 将 `resolveApiEnvelope` 成功码判断反转 | 成功与业务错误契约测试失败 | 服务 focused tests 全绿 |
| runtime shell | 允许未知 navigation route 投影 | 未知路由不得展示的断言失败 | auth / app / navigation focused tests 全绿 |
| accounts / workspaces / organization / audit | 删除 CredentialModal 复制失败反馈 | 可见错误反馈断言失败 | 治理页面 focused tests 全绿 |
| grants / policies / prototype governance | validate 失败时关闭并丢弃 Policy 草稿 | “编辑器仍可见”断言失败 | 六个治理页面 focused tests 全绿 |
| remaining pages / styles | 对非管理员显示 repository checkbox/action | 权限拒绝断言失败 | Bootstrap、任务、团队和工作区 focused tests 全绿 |
| coverage structure | 缩窄 include、追加 style exclude、阈值降到 99、动态/未知覆盖 | 各自被结构契约拒绝 | AST 门禁 31/31、tooling 50/50 全绿 |

首次全量运行还发现 AdminGrants 撤销失败用例对列表生命周期调用总数存在竞态假设。断言被收敛为“失败提交不新增 reload”，随后 focused 与完整覆盖率均通过；没有用 timeout、retry 或 sleep 掩盖问题。

## 完整验证

在 detached、全 LF、精确指向 `4b3552d94a51945e9df65e5ea720eadafd4cfc8a` 的验证 worktree 中执行：

```powershell
pnpm.cmd install --frozen-lockfile
pnpm.cmd verify
pnpm.cmd openapi:check:release
git diff --check
git status --short
```

结果：

- Biome 检查 311 个文件，TypeScript、dependency-cruiser（196 modules / 565 dependencies）、20 条 dependency contract、OpenAPI、结构和 Markdown 门禁全部通过。
- Tooling 50/50 通过；Vitest 75/75 files、556/556 tests 通过，耗时 1116.36 秒；0 skip、0 retry。
- Coverage：Statements 2119/2119、Branches 1289/1289、Functions 792/792、Lines 2070/2070。
- React Doctor 扫描 255 个文件，报告 36 条非阻断既有诊断：12 maintainability、2 security、14 bugs、8 performance；命令 exit 0。本切片不通过 suppress 或扩大 scope 处理这些独立问题。
- Ant Design doctor 为 13 pass / 1 SSR 可选依赖 warning；lint 为 4 条既有 virtual-scroll performance warning；usage 正常，三条命令均 exit 0。
- Utoopack build 成功，7400 ms，输出 55 个 assets；release OpenAPI gate、`git diff --check` 和 clean status 均通过。

上述诊断均已在报告中声明；没有未声明 warning、被吞掉的失败、skip、retry、放宽 timeout 或 coverage scope 逃逸。

## 提交切片

- `8f69818`：将手写 runtime styles 纳入真实分母。
- `246d7dd`：transport 与治理 service 契约。
- `41afae4`：认证与应用 shell 边界。
- `3872b90`：账号、工作区、组织与审计边界。
- `ea488f1`：Grant、Policy 与原型治理页面。
- `1f08412`：其余页面、入口与样式构造。
- `4b3552d`：残余缺口、100% thresholds 与 AST 结构门禁。

## 交付边界

本报告证明的是前端一方手写 runtime coverage 与仓库 CI 门禁收口。它不把 100% coverage 等同于无缺陷，也不把 React Doctor / Ant Design 的独立重构建议伪装成当前覆盖率任务已解决的问题。
