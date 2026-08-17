# V0.2 前端契约精确收口设计

- 日期：2026-08-17
- 状态：设计已确认，待用户审阅与实施计划
- 仓库：`engineering-platform`
- 后端基线：`engineering-platform-backend@api-v0.2.0`
- 实施前置：`engineering-platform-backend@api-v0.2.1` Artifact 已发布
- 环境发布前置：目标环境导航迁移与真实接口冒烟完成
- 前端契约基线：`engineering-platform@v0.2.1`，OpenAPI Artifact `0.2.0`
- 架构依据：`engineering-platform-docs/architecture/{01-identity-organization-authorization,06-platform-application-integration,12-implementation-roadmap}.md`
- 跨仓设计：`engineering-platform-docs/docs/superpowers/specs/2026-08-18-v02-super-admin-navigation-and-mock-retirement-design.md`

## 背景与结论

V0.2 后端代码和版本化 OpenAPI Artifact 已发布，前端的登录、Session Bootstrap、账号、组织、Workspace、Grant、Policy 与 Audit 生产路径也已通过 generated client 调用后端契约。不过前端仍保留一整套 V0.2 Umi Mock，形成第二套运行时接口事实；两个 V0.2 管理页还保留静态原型动作：账号页展示没有契约的编辑、删除，且未暴露已有的真实密码重置；Workspace 页展示没有命令契约的归档、恢复。

方法与参数占位归一后的接口审计已证明 34 条 Mock API 路由都能映射到 `api-v0.2.0` OpenAPI，但真实后端目前只预置 `home`、`admin` 两条 navigation 目录记录。Mock 的固定 navigation 同时掩盖了这一数据前置。因此“接口可替换”已经成立；源码删除以 `api-v0.2.1` Artifact 与后端自动化证据为前提，已删除 Mock 的前端构建进入目标环境还必须等待 route registry 迁移和真实接口冒烟通过。

本次以“契约中存在的动作真实可用，契约中不存在的动作不展示”为收口原则。不得手写或猜测后端端点，不把静态提示冒充治理能力，也不为本地联调削弱 Cookie、Origin 或 CSRF 安全约束。

## 目标与范围

### 账号治理

`AdminUsers` 的行级动作只保留 V0.2 OpenAPI 已发布的能力：

- 重置密码：要求填写原因，使用当前账号 ETag 作为 `If-Match`，由既有 transport 生成 `Idempotency-Key`；成功后只展示一次后端返回的临时密码，并刷新账号列表。
- 重置 TOTP：继续要求原因、ETag 与幂等键，成功后刷新列表。
- 启用或停用：根据当前状态展示对应动作，继续要求原因、ETag 与幂等键，成功后刷新列表。
- 创建账号：保持现有真实接口和一次性临时密码回执流程不变。

没有 V0.2 命令契约的“编辑账号”和“删除账号”从页面移除。随之删除仅服务于静态编辑原型的 `UserEditModal`、类型和常量；不得用本地 presentation override 模拟保存。

密码重置复用现有 `AccountActionModal`、`resetAccountPassword` 与 `CredentialModal`。`CredentialState.kind` 扩展为 `create | reset`；密码重置成功后先关闭确认框，再展示 `kind="reset"` 的一次性凭据回执。失败时确认框保持打开，并继续通过统一 Problem Details 格式展示服务端 detail 与 `requestId`。

### Workspace 治理

`AdminWorkspaces` 保留并继续验证当前契约支持的能力：创建 Workspace、查看成员投影、邀请/移除 Leader、转让 Owner。列表行只保留“查看配置”。

当前 OpenAPI 没有 Workspace 归档或恢复命令，因此移除对应按钮、`useStaticPrototypeAction` 调用和静态提示测试。列表仍可只读展示服务端返回的 `ARCHIVED` 状态；这不代表前端拥有归档命令。页面说明只描述 Owner、Leader 与成员投影事实，不暗示当前页面能够执行归档。

### 删除 V0.2 Mock，默认连接真实后端

接口映射审计结果为 8 组 Mock、34 条路由，后端 39 个 OpenAPI operation 全部覆盖，Mock 缺失映射为 0。源码删除和环境发布分为两级门禁：

1. `api-v0.2.1` 已发布，前端 `openapi/artifact.lock.json` 锁定其 tag、digest 与 `info.version=0.2.1`，generated client 校验无未解释差异。
2. 后端自动化测试证明 `/me` 对当前 Super Admin 返回跨仓设计定义的九项有限 V0.2 Platform Capability，并证明 `/navigation` 返回八个已激活 routeKey、其中七个生成可见菜单且不含 V0.3+ 原型路由。满足这两项后可以实施并合并源码删除。
3. 前端构建进入目标环境前，目标环境必须运行 Authorization route registry 迁移，并通过登录、Bootstrap、`/me`、`/navigation` 与六个治理页面的真实 API 冒烟。

- 删除整个 `mock/` 目录：运行时路由、治理 catalog、handler helper 及其 Mock 契约测试均不再保留。它们只服务已发布的 V0.2 接口，没有 V0.3+ 运行时路由需要迁移。
- `config/config.ts` 明确设置 `mock: false`，防止后续开发误把 `mock/` 重新当作服务端事实源；`config/proxy.ts` 的陈旧“当前用 mock”说明同步删除。
- 生产依赖方向固定为 `pages → features → src/services → src/services/generated → transport`。页面只能消费 feature 公开入口，service 必须位于 `src/services/`，不得把 service 移入 feature，也不得让页面直接调用 generated client。
- 页面测试在各自测试文件中 mock feature 公开入口，验证用户交互、成功/错误状态和刷新行为；不再搭建伪 HTTP 路由。
- `src/services/{auth,navigation,admin*}` 的就近测试继续 mock generated client，验证 OpenAPI 路径、请求参数、ETag、幂等键和响应映射。纯测试数据可以作为测试文件内 fixture 或就近 test utility，但不得重建可运行的 `/api/v1` 路由表。
- 真实浏览器联调通过单一 HTTPS `platform-gateway`，以同源 Cookie、Origin 与 CSRF 语义访问后端。本次不增加绕过安全约束的直连 HTTP 模式。
- V0.3 及以后尚无后端契约的原型页不在本次范围内；它们继续使用页面内静态原型数据，不得借本次改动新增接口 Mock。

`00000000` 仅由环境 Bootstrap 运维流程使用；前端不得预填、特判或据此推导 Super Admin，测试也只依据 `/me.isSuperAdmin` 与 Capability 投影模拟身份。任何固定密码均不得进入前端源码、fixture、配置或提交历史。

### 陈旧说明

删除 `src/features/administration/index.ts` 中“Mock-only 数据缝、以后再切 generated client”的陈旧注释。公开入口与 service 实现不重构，因为它们已经通过 generated client 工作。

## 数据流与错误处理

```text
账号行操作
  → AccountActionModal 收集 reason
  → feature public entry
  → adminAccounts service
  → generated OpenAPI client
  → transport 注入 Idempotency-Key / If-Match 并归一 Problem Details
  → 成功：关闭确认框、刷新列表；密码重置额外展示一次性 CredentialModal
  → 失败：保留确认框，展示 detail + requestId
```

Workspace 的既有真实命令链不改变；本次只删除无后端命令的数据流入口。

## 测试策略

遵循 TDD，先把旧原型或 Mock 依赖断言改成期望的契约行为并观察失败，再做最小实现：

1. `AdminUsers/index.test.tsx`
   - 断言账号行不再出现“编辑、删除”。
   - 断言出现“重置密码”，确认框要求原因。
   - 断言请求命中真实 reset-password 契约，携带 `If-Match` 与 UUID 幂等键。
   - 断言成功后展示一次性临时密码、关闭后不再显示，并刷新列表。
   - 保留现有 403/422、启停、TOTP 与创建账号回归。
2. `AdminWorkspaces/index.test.tsx`
   - 将静态归档提示测试改为断言 ACTIVE/ARCHIVED 行均不展示归档或恢复按钮。
   - 保留创建、Owner 转让、Leader 管理、成员投影和 Problem Details 回归。
3. V0.2 页面测试
   - `AdminUsers`、`AdminOrganization`、`AdminWorkspaces`、`AdminGrants`、`AdminPolicies` 与 `Audit` 改为 mock `@/features/administration` 的公开接口。
   - Auth、Bootstrap、Initial State 与 Navigation 页面或 feature 测试改为 mock 对应 feature/service 公开边界；不得从 `mock/` 导入路由。
   - 页面测试不重复断言底层 URL；这些断言由 `src/services` 就近测试拥有。
4. 删除静态编辑原型后，清除只被它使用的测试、类型与常量。
5. 删除 `mock/` 后运行结构搜索，确保源码、测试与配置均无 `mock/` 导入或 Umi Mock 启用项。
6. Navigation 回归使用 feature/service fixture 覆盖跨仓设计中的八个 routeKey，并断言 V0.3+ 原型 routeKey 不由真实投影返回；前端静态 registry 仍负责拒绝未知 routeKey。

本机只运行受影响测试、TypeScript、变更文件 Biome 和变更文件 antd lint，避免全量 coverage 占满电脑；完整 coverage、doctor、antd 检查与 build 由 CI 的完整门禁执行。若修改全局测试配置或依赖，则不能使用定向验证代替全量 CI。

## 验收标准

1. `AdminUsers` 不再引用 `useStaticPrototypeAction` 或展示编辑/删除，真实密码重置流程可观察且错误不关闭确认框。
2. `AdminWorkspaces` 不再引用 `useStaticPrototypeAction` 或展示归档/恢复，既有真实治理动作不回归。
3. 密码重置、TOTP 重置、启停、创建账号均继续只经 feature 公开入口和 generated client 调用后端。
4. `src/features/administration/index.ts` 不再声称仍是 Mock-only 数据缝。
5. `mock/` 目录不存在，`config/config.ts` 为 `mock: false`，前端运行时不存在任何 V0.2 接口 Mock。
6. 页面测试 mock feature 公开入口，service 测试 mock generated client；service 仍全部位于 `src/services/`。
7. `api-v0.2.1` Artifact lock 与本地定向门禁通过，推送后 CI 完整门禁通过，才可将 V0.2 前端代码侧标记为收口；真实环境 navigation 冒烟通过后才可标记环境交付。

## 非目标

- 不新增账号编辑、账号删除、Workspace 归档或恢复后端接口。
- 不修改 generated 文件、OpenAPI Artifact 或 transport 安全语义。
- 不为已发布接口保留、搬迁或重建运行时 Mock 路由。
- 不处理 V0.3+ 原型页，不更新 GitOps Desired State，不宣称环境 Release Gate 已通过。
- 未收到 `【同步进度】`，不修改 `docs/superpowers/progress/current.md`。
