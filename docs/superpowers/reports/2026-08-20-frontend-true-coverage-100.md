# 前端真实覆盖率 100% 收口报告

## 结论

前端覆盖率分母已扩展为全部一方手写运行时代码，包含页面、组件、服务、运行时入口和样式模块。最终 V8 报告四项均为 100%，覆盖率结构门禁同时锁定 include、exclude 与四项阈值，不能通过缩小分母或降低阈值回退。

- 基线提交：`a570567e049a03a04e43633c637426bc55d934dc`
- 首次完整门禁提交：`4b3552d94a51945e9df65e5ea720eadafd4cfc8a`
- 验证环境：Node `v24.12.0`、pnpm `11.18.0`、Windows 干净 LF detached worktree
- 最终验证提交：`3431021796629cf86900020d82982eb0252290b0`
- 最终 LF 验证产物 `coverage/coverage-final.json` SHA-256：`59712551A13AD0C980E96CB82ECC56B8BA43BCB7525D3DFE84E71BCB5BF1F459`

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
| Statements | 93.53%（1995/2133） | 100%（2107/2107） |
| Branches | 84.34%（1126/1335） | 100%（1281/1281） |
| Functions | 94.72%（736/777） | 100%（790/790） |
| Lines | 93.40%（1940/2077） | 100%（2057/2057） |

最终报告中 23 个 `index.style.ts` / `login.style.ts` 全部四项 100%，不存在样式模块绕过。

## 反事实 RED / GREEN 证据

| 切片 | 临时 production mutation | RED 证明 | 恢复后的 GREEN |
| --- | --- | --- | --- |
| transport / services | 将 `resolveApiEnvelope` 成功码判断反转 | 成功与业务错误契约测试失败 | 服务 focused tests 全绿 |
| runtime shell | 允许未知 navigation route 投影 | 未知路由不得展示的断言失败 | auth / app / navigation focused tests 全绿 |
| accounts / workspaces / organization / audit | 删除 CredentialModal 复制失败反馈 | 可见错误反馈断言失败 | 治理页面 focused tests 全绿 |
| grants / policies / prototype governance | validate 失败时关闭并丢弃 Policy 草稿 | “编辑器仍可见”断言失败 | 六个治理页面 focused tests 全绿 |
| remaining pages / styles | 对非管理员显示 repository checkbox/action | 权限拒绝断言失败 | Bootstrap、任务、团队和工作区 focused tests 全绿 |
| coverage structure | 缩窄 include、追加 style exclude、阈值降到 99、额外 threshold、动态/未知覆盖、`todo` / 链式 `skip` / options `skip` 或 `retry` | 各自被结构契约拒绝 | AST 门禁 35/35、tooling 54/54 全绿 |
| TaskDetail defensive input | 从真实 Ant `Tabs` / `Dropdown` 边界发出未知 key | 无保护实现抛出 `TypeError` | 未知 key 被私有白名单与可选 lookup 安全忽略 |
| TeamBoard chart wiring | 临时删除 Column 的 `label.text` formatter | 页面 figure 缺少 `3.2d` / `1.8d` 标签而失败 | chart boundary 使用真实 data 与 formatter 后页面测试全绿 |

首次全量运行还发现 AdminGrants 撤销失败用例对列表生命周期调用总数存在竞态假设。断言被收敛为“失败提交不新增 reload”，随后 focused 与完整覆盖率均通过；没有用 timeout、retry 或 sleep 掩盖问题。

## 终审修复

Spec / Standards 双轴终审提出的 Important 与 Minor 已全部处理：

- Coverage AST 门禁现在只接受四个普通静态 threshold 键，并拒绝额外键、method、shorthand、spread、computed、coverage ignore pragma、测试 `skip` / `skipIf` / `todo`、链式 `skip.each`、测试级 options `skip` / `retry` 和全局 retry 配置。最终结构单测 35/35，完整 tooling 为 54/54。
- 删除 TaskDetail 页面为不可达 unknown 值暴露的 helper；AdminSkills 版本计算与 TeamBoard 图表值格式化迁移到页面真实使用的窄 utility，不再从 page entry 暴露测试专用 API；chart mock 只消费组件实际传入的 formatter，不直接导入 production utility 构造结果。
- 删除生产 `WORKSPACE_FIXTURES` 中仅用于测试的“交易协作工作区”；`WorkspaceDetail` 作为真实深模块接受运行时 DTO，测试局部成员 Workspace 同时覆盖 Selector、空态和权限。将设置权限临时改为恒真后目标测试 RED，恢复后 GREEN。
- 删除本分支新增三个测试的 30 秒 timeout；相关交互在全局 15 秒默认值下约 0.9–5.0 秒通过。历史基线已有 timeout 未扩大。
- ThemeProvider fail-fast 用例不再静默 `console.error`；实测 React 19 不产生该日志，直接断言同步错误即可。
- Policy 页面真实渲染后断言 sticky、330px 宽度、token padding 与 warning token。将 `position: sticky` 临时改为 `relative` 后测试精确 RED，恢复后 GREEN，样式不再只是执行计数。
- TaskDetail 不再暴露测试 helper，同时保留未知菜单与 Tab key 的安全 no-op；测试包装真实 Ant 组件边界发出未知 key，旧实现精确 RED，恢复私有 guard 后 GREEN。
- TeamBoard chart mock 现在消费页面实际传入的 data 与 `label.text`，并从页面 figure 断言真实标签；删除 production formatter wiring 后精确 RED。AdminSkills 的底层版本 helper 改为私有，只通过生产实际消费的公开函数验证。

最终 scoped re-review 对 Spec 与 Standards 两轴均给出 `APPROVED`，无剩余 Critical、Important 或 Minor。最终再次运行完整 coverage：75/75 files、556/556 tests；Statements 2107/2107、Branches 1281/1281、Functions 790/790、Lines 2057/2057，四项均为 100%。

## 完整验证

在 detached、全 LF、精确指向 `3431021796629cf86900020d82982eb0252290b0` 的验证 worktree 中执行：

```powershell
pnpm.cmd install --frozen-lockfile
pnpm.cmd verify
pnpm.cmd openapi:check:release
git diff --check
git status --short
```

结果：

- Biome 检查 314 个文件，TypeScript、dependency-cruiser（199 modules / 571 dependencies）、20 条 dependency contract、OpenAPI、结构和 Markdown 门禁全部通过。
- Tooling 54/54 通过；Vitest 75/75 files、556/556 tests 通过；结构测试 35/35，0 skip、0 todo、0 retry。
- Coverage：Statements 2107/2107、Branches 1281/1281、Functions 790/790、Lines 2057/2057；最终 LF artifact 摘要如报告开头所列。
- React Doctor 的非阻断既有诊断完成且 exit 0；本切片不通过 suppress 或扩大 scope 处理这些独立问题。
- Ant Design doctor、lint、usage 均完成且 exit 0；既有可选依赖和 virtual-scroll performance 提示不阻断门禁。
- Utoopack build 成功；release OpenAPI gate、`git diff --check`、LF readback 和 clean status 均通过。完整 `pnpm verify` 总耗时 1213.2 秒。

上述诊断均已在报告中声明；没有未声明 warning、被吞掉的失败、skip、retry、放宽 timeout 或 coverage scope 逃逸。

## 提交切片

- `8f69818`：将手写 runtime styles 纳入真实分母。
- `246d7dd`：transport 与治理 service 契约。
- `41afae4`：认证与应用 shell 边界。
- `3872b90`：账号、工作区、组织与审计边界。
- `ea488f1`：Grant、Policy 与原型治理页面。
- `1f08412`：其余页面、入口与样式构造。
- `4b3552d`：残余缺口、100% thresholds 与 AST 结构门禁。
- `197271e`：处理首次 Spec / Standards 终审反馈并恢复真实样式与组件行为保护。
- `3431021`：封闭 skip/retry 绕过，恢复 TaskDetail 防御行为并锁定 TeamBoard formatter wiring。

## 交付边界

本报告证明的是前端一方手写 runtime coverage 与仓库 CI 门禁收口。它不把 100% coverage 等同于无缺陷，也不把 React Doctor / Ant Design 的独立重构建议伪装成当前覆盖率任务已解决的问题。
