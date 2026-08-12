# 前端原型高保真对齐实施报告

## 结论

本轮以最新 `研发协作平台.dc.html` 为界面事实源，在保留路由、Session、Route Registry、权限、Problem Details、mock-only V0.2 service seam 和写操作保护的前提下，对应用壳、用户端页面和管理端页面做高保真对齐。基础控件继续使用 Ant Design / Pro Components，图表使用 `@ant-design/charts`，没有建立重复的 Table、Select 或 Button 包装层。

两份原型镜像内容一致：

- `/Users/liulijun/Downloads/untitled/project/研发协作平台.dc.html`
- `/Users/liulijun/Downloads/内部研发平台架构设计/研发协作平台.dc.html`
- SHA-256：`92c50fc62578f96e6136a0673bb594c427fb57b696d2052361af5cd77ac9ff11`

## 实施内容

- 应用壳统一使用品牌橙 Token、52px Header、208px 展开侧栏和 56px 折叠侧栏；主题与退出入口收纳到账号菜单，菜单“新增”徽标不污染 accessible name。
- 登录、工作台、任务、工作区、消息、团队看板、审计及管理页按原型重排，移除原型没有的可见摘要、重复筛选和重复操作入口。
- 原型表格统一使用 antd / Pro Components `size="small"`，宽表在页面内部滚动；趋势、分布和吞吐图改用 `@ant-design/charts`。
- AdminOrganization、AdminGrants、AdminPolicies 保留独立菜单；`/admin` 仅作为不进菜单的 prototype 兼容直达路由。
- AdminUsers、AdminWorkspaces、AdminGrants、Audit 等契约页继续使用既有 request / mutation / Problem / reason / If-Match / Idempotency 与竞态保护。
- 账号、Workspace 与 Grant mock 共享 canonical governance catalog，同一实体 ID 不再对应两套身份；创建账号或 Workspace 后可直接用于 Grant 创建。
- mock API 只投影冻结的 `AccountSummary` / `WorkspaceSummary`；Team、角色、直属上级、仓库数等原型展示信息在页面按稳定 ID join，不污染 service DTO。
- Audit 通用关键字仅做页面本地过滤，不伪装成后端 actor 参数；筛选边界重挂 ProTable，cursor 分页与表内排序保留在同一实例。
- `.turbopack/` 在本轮开始前的 HEAD 已被忽略，本轮未重复修改该规则；`src/.umi/`、`src/.umi-production/`、`dist/`、`coverage/` 与缓存目录均不提交。

## 原型与契约边界

| 范围 | 当前实现 | 结论 |
| --- | --- | --- |
| 新增用户 | 原型五字段按“姓名、工号、所属 Team、角色、直属上级”呈现；超级管理员不可通过普通创建流程授予。服务写入只提交冻结契约字段，Team / 角色 / 上级作为页面展示 metadata join。 | PASS；不扩展 service DTO。 |
| 编辑用户 | 原型四字段与静态反馈完整呈现，但当前没有对应持久化契约，提交后不改 fixture。 | UI PASS；持久化 CANNOT VERIFY。 |
| 新建角色 | 原型字段与能力选项完整呈现，包括“合并代码 (MR)”与“团队看板”；当前 Role 能力模板模型没有 V0.2 写契约，提交只给静态反馈。 | UI PASS；持久化 CANNOT VERIFY。 |
| 编辑技能 | 仅呈现“技能名称、发布新版本、变更说明”；当前写契约未冻结，不伪造持久化。 | UI PASS；持久化 CANNOT VERIFY。 |
| 新增 Workspace | 原型“名称、所属 Team、Owner”完整呈现；服务只提交冻结字段，Team 与仓库数为页面 metadata。 | PASS；不扩展 service DTO。 |
| 新增 Grant | 六个原型字段均呈现。主体使用 canonical Select 而不是自由输入，避免提交无效 Principal ID。Platform / Workspace + 长期授权可闭环；部门范围和 30 / 90 天临时授权因当前 mock DTO 未冻结对应 scope / validity 字段，会显示明确错误且不发送伪造请求。 | 基础契约 PASS；部门与临时有效期 CANNOT VERIFY，等待正式 OpenAPI。 |
| Policy catalog | 原型七分组保留；当前 mock-only catalog 只冻结 identity 领域 7 个 Key，未冻结分组显示诚实空态。 | PASS；不伪造可发布 API。 |

以上静态边界遵循设计约束“不得把原型静态数据误写为真实持久化能力”。它们不是静默丢数据：界面会明确使用静态原型反馈，报告也不把它们描述为服务端持久化完成。

## RED → GREEN 证据

| 范围 | 有效 RED | GREEN |
| --- | --- | --- |
| Workspaces | 旧页面 7/7 原型结构断言失败 | 7/7 通过，成员、仓库、设置与静态动作保留 |
| AdminSkills | 旧 card catalog 4/4 新布局断言失败 | 目录、详情、创建 / 编辑 / 切换 focused 全绿 |
| AdminWorkspaces / Grants | 中文 fixture、组织来源、范围与跨端点实体闭环失败 | mock、util 与页面 focused 全绿 |
| Audit | 本地关键字输入后 ProTable 仍显示旧 row | 查询边界隔离后关键字过滤、三页 cursor 去重、排序重置 9/9 通过 |
| 用户创建角色 | 新增用户仍可选择“超级管理员” | 创建选项排除超级管理员，编辑既有超级管理员仍可展示 |
| 原型精确文案 | Role 缺 `(MR)`；Grant 部门 / 临时有效期标签不一致 | 精确 option 断言通过 |
| AdminUsers coverage | 3 条重交互在 instrumentation 下越过全局 15 秒并产生未收敛表单更新 | 重交互使用 30 秒局部预算，完整创建流程使用 45 秒局部预算；错误用例显式关闭 Drawer，focused 通过 |
| ProLayout 初始状态 | `defaultCollapsed` 断言收到 `undefined` | 壳层测试通过，保留官方 responsive breakpoint |
| deprecated Tag | 浏览器控制台发现 `Tag bordered={false}` | 改用 antd 6 `variant="filled"`，fresh runtime 无该 warning |

## 浏览器验收

本轮浏览器证据使用本地开发服务器和 fresh 登录 Session，覆盖登录、应用壳、超级管理员完整菜单、用户管理及最新管理弹层字段；另沿用同一实现批次已经完成的 1280 / 1440 responsive、浅深主题、任务 / 工作区 / 团队 / 审计页面证据。开发服务器与浏览器会话均已停止。

- 登录页：左侧弹性撑满、右侧表单、Logo、品牌背景与登录按钮通过；登录页不显示主题入口。
- 应用壳：超级管理员可见全部菜单；账号菜单内主题与退出；浅深主题 Token 可切换。
- 管理弹层：新增用户、创建 Workspace、编辑技能、新建角色、新增 Grant 的字段顺序与原型逐项核对。
- 响应式：1280px 默认折叠为 56px，1440px 展开为 208px；宽表内部滚动且 document 无横向溢出。
- 深色逐页像素级截图未在本轮最后一次浏览器会话中对全部页面重新采集，因此不把单元测试冒充完整逐页视觉证据；未复采页面标记为 CANNOT VERIFY，而不是实现失败。

## Ant Design / Pro Components 裁决

- API 以当前安装的 antd 6.6.0 CLI 与 Pro Components 3.1.14-6 本地类型为准；React 19.2.8 peerDependencies 通过 `antd doctor`。
- 未发现 deprecated、a11y 或 usage 问题。
- 页面中显式 `virtual={false}` 的 Select 同时包含固定短枚举和原型可见的小型动态集合（如账号 / Workspace / Principal）。这是为保证短列表完整公开 option 语义的有意取舍，不再误报为“动态集合均保持虚拟化”。CLI 的 4 条 fixed-enum performance 建议保留为非阻断风险，不通过 ignore / suppress 绕过。

## 完整门禁

第一次完整门禁的有效 RED 为：AdminUsers 重交互 coverage 超时、Audit 异步分页断言过早读取，以及另一个 Vitest 进程并发清理默认 coverage 临时目录；对应测试稳定性问题均已按上表修复。最终 coverage 使用独立临时报告目录，避免并行任务互相删除 shard。`pnpm verify` 没有在所有子命令通过后再机械重复一次；下表列出的每个组成门禁均已在最终冻结快照上分别执行并通过。

| 门禁 | 最终结果 |
| --- | --- |
| `pnpm lint` | PASS；Biome、TypeScript、依赖边界与 OpenAPI 一致性均通过。 |
| `pnpm test:tooling` + structure / Markdown | PASS；18 个 tooling tests、结构验证与 Markdown 验证全部通过。 |
| `pnpm vitest run --coverage --coverage.reportsDirectory=<private-temp>` | PASS；67 个文件、477 个测试全绿；Statements 90.49%、Branches 82.20%、Functions 95.74%、Lines 90.34%。 |
| `pnpm run doctor` | PASS（exit 0）；保留 38 条非阻断维护性 / 性能建议。 |
| `pnpm antd:check` | PASS（exit 0）；0 deprecated、0 a11y、0 usage，保留 4 条 fixed-enum `virtual={false}` 性能建议。 |
| `pnpm build` | PASS；Utoopack 生成 55 个产物文件。 |
| `pnpm verify` | PASS（等价拆分执行）；上述全部组成命令分别通过，未额外重复整套长门禁。 |
