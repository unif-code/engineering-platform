# 前端代码质量深度审查与渐进重构设计

## 背景

现有 Web 应用已完成原型页面、V0.2 Mock 契约、登录页对齐和第一轮布局简化，当前 `pnpm lint`、`pnpm test`、`pnpm doctor` 均可通过。第一轮工作主要消除了固定 viewport、重复媒体查询和冗余布局约束，并未系统解决所有架构边界、React 状态所有权、Ant Design 最佳用法和页面业务代码归属问题。

本轮以“原型界面与业务行为保持不变，代码实现达到长期可维护状态”为目标，对全部手写前端代码逐文件审查。审查不是机械搬目录，也不追求抽象数量；每项改动必须能证明降低耦合、消除重复、收紧状态边界或采用更合适的官方组件能力。

## 目标

- 对所有手写前端代码建立可核对的逐文件覆盖清单，避免抽样审查遗漏。
- 落实架构 06 规定的 `pages → features → services/generated` 依赖方向。
- 让 `src/pages/` 只保留路由装配，业务组件、状态和领域交互归入对应 Feature。
- 检查 React 19 状态、Effect、异步竞态、组件职责、表单状态和渲染边界是否清晰。
- 逐处核对 Ant Design 6.4.4、Pro Components 3.1.14-6 与 Ant Design X 2.9.0 的官方 API、语义结构和推荐用法。
- 删除无效 CSS、重复工具、无主类型、死代码和仅为历史实现服务的测试辅助代码。
- 保持原型的视觉、信息架构、文案、路由与可观察交互不变。
- 每个重构批次均可独立测试、审查、回退和提交。

## 非目标

- 不重新设计页面，不调整产品文案、信息层级或业务流程。
- 不为了统一形式而创建通用基类、万能 Hook、配置驱动页面或过度封装。
- 不修改尚未由 OpenAPI Artifact 冻结的后端契约。
- 不手改 `src/services/generated/`。
- 不审查或修改 `src/.umi/`、`dist/`、`coverage/` 等生成目录。
- 不把 CLI 的性能提示机械视为缺陷；必须结合真实数据规模和交互语义判断。
- 不以测试 timeout、retry、sleep 或关闭检查来掩盖竞态和结构问题。

## 事实源与版本依据

### 仓库架构

- `../engineering-platform-docs/architecture/06-platform-application-integration.md` 是前端目录、状态所有权、数据获取和依赖方向的唯一架构事实源。
- 根 `AGENTS.md` 的项目规则优先于通用 Skill；本仓不采用通用 `umi` Skill。
- `config/routes.ts`、静态 Route Registry、OpenAPI Artifact 与 dependency contract 是运行时和依赖边界的可执行证据。

### React

- React 官方 19.2 文档作为组件、状态、Effect、并发与可访问性实现依据。
- `pnpm doctor` 使用仓库锁定的 `react-doctor` 做全局静态诊断。
- 不以“减少 Hook 数量”为目标；重点检查状态是否属于正确 owner、Effect 是否只同步外部系统、异步结果是否具备失效边界。

### Ant Design 生态

- 使用仓库锁定的 `@ant-design/cli` 查询当前版本：`antd info`、`antd doc`、`antd semantic`、`antd usage`、`antd lint` 和 `antd doctor`。
- 使用官方 [LLMs.txt](https://ant.design/docs/react/llms/)、单组件 Markdown 与 semantic 文档核对用法。
- API 结论以锁定版本 CLI、本地 TypeScript 声明和官方文档共同验证，不凭模型记忆。
- Pro Components 没有等价 CLI 条目时，以锁定包的类型声明、运行时代码与官方文档为准。

## 审查范围与覆盖机制

### 纳入范围

- `src/` 下除生成客户端外的全部手写 TypeScript、TSX 和样式代码。
- `config/` 下路由、主题、代理和应用配置。
- `mock/` 下全部手写 Mock Contract 与状态实现。
- `tests/` 下测试初始化、共享测试工具与依赖契约 fixtures。
- `scripts/` 下仓库质量、依赖与 OpenAPI 检查脚本。
- 与上述代码直接相关的配置文件、测试配置和类型声明。

### 排除范围

- `src/.umi/`
- `src/services/generated/`
- `dist/`
- `coverage/`
- `node_modules/`、`.pnpm-store/` 与外部依赖缓存
- 图片、字体等不可执行静态资产；只核对其引用是否有效

### 逐文件覆盖清单

实施前由 Git tracked files 生成审查清单。每个纳入文件必须标记为以下一种结果：

1. `KEEP`：职责清晰、依赖正确、无需修改，并记录核对依据。
2. `REFACTOR`：保持公开行为，重构内部结构。
3. `MOVE`：职责正确但目录归属不符，迁入 Feature 并保留薄路由入口。
4. `FIX`：存在可观察缺陷或竞态，先补 RED 回归再修复。
5. `REMOVE`：确认无引用、无运行时作用且无契约意义。
6. `GENERATED/EXCLUDED`：生成或明确排除，不进入人工改动。

清单必须覆盖所有纳入文件；最终以清单数量与 Git 文件清单数量一致作为“无遗漏”的证明。

## 架构设计

### 1. Pages 保持薄装配

每个路由入口最终只负责：

- 从对应 Feature 的公开 `index` 导入页面组件。
- 必要时传递路由参数或装配 Route-level boundary。
- 默认导出供 Umi 路由加载。

Pages 不直接拥有领域 fixture、业务查询、mutation、复杂表单状态、表格 column 定义或跨组件编排。页面迁移只改变代码归属，不改变 URL、route key、菜单、权限和 DOM 可观察行为。

### 2. Feature 按业务能力组织

- 已有 `auth`、`navigation`、`theme`、`shell` 保持独立公开入口。
- Tasks、Workspace、Messages、Team、Dashboard 等用户能力形成各自 Feature。
- 管理页面按架构 06 的 administration 边界组织；内部可按账户、组织、授权、策略、模型等职责拆分文件，但外部只通过 `features/administration/index` 使用公开 API。
- Feature 私有组件、Hook、类型、常量和测试就近放置；禁止跨 Feature 导入私有文件。
- 只有被两个以上 Feature 复用且不依赖业务 Service 的 UI 才提升到 `src/components/`。

### 3. Service 与数据边界

- 生成客户端只存在于 `services/generated`，不得手改或被页面绕过。
- transport 只负责认证、Problem Details、mutation headers 和底层请求归一。
- Feature 通过自己的公开 service adapter 消费 generated/transport；页面不得直接识别 Axios/Umi request 错误。
- React Query 负责服务端状态；URL 负责路由、筛选和对象标识；Umi Initial State/Model 负责 Session、Workspace 和轻量全局偏好；临时交互状态留在组件内。
- ProTable 服务端数据继续通过 `request`；不得以并存的 `dataSource`、Effect 和本地副本形成多个事实源。

## React 审查规则

### 状态与 Effect

- 派生值优先在渲染期计算，不用 Effect 镜像 props 或已有 state。
- Effect 只同步 React 之外的系统；事件产生的业务动作放在事件处理器。
- 异步请求必须处理组件卸载、参数变更、旧请求迟到和 mutation 重复提交。
- 同一领域事实只保留一个 owner；Modal/Drawer 的 draft state 与服务端事实明确分离。
- 不为了形式滥用 `useMemo`、`useCallback` 或组件拆分；只有可证明的稳定引用、昂贵计算或边界职责才保留。

### 组件职责

- 大文件按“数据编排、表格/表单展示、对话交互、纯转换”拆分，不按 JSX 行数机械拆分。
- 组件 props 表达业务语义，不泄露底层 request、fixture 或测试实现细节。
- 避免布尔参数组合产生隐式模式；模式复杂时使用显式 discriminated union。
- 列定义、查询参数转换和纯函数可以独立测试，但不把一次性 JSX 包成无意义组件。

### 可访问性与语义

- 测试与实现优先使用公开 role/name/label。
- Modal、Drawer、Table、Form、Tabs、Tree、Dropdown 等保留官方语义结构。
- 焦点恢复、键盘操作、loading/disabled 和错误反馈不得因内部重构退化。

## Ant Design 与 Pro Components 审查规则

### 官方组件优先级

- Pro Components 适合的后台表格、筛选、表单和布局优先使用其公开能力。
- Ant Design 组件次之；只在现有组件无法表达需求时创建薄封装。
- 不复制 Button、Tag、Modal、Drawer、Table、Form、Flex、Grid、Splitter 等已有能力。

### API 核对流程

每个被修改的 Ant Design 组件至少执行一次针对性查询：

1. `NO_UPDATE_CHECK=1 pnpm exec antd info <Component>`
2. 需要结构信息时执行 `antd semantic <Component>`
3. 需要完整示例时执行 `antd doc <Component>` 或读取官方 `<component>.md`
4. 对照本地 `node_modules` 类型确认锁定版本签名
5. 修改后执行 scoped `antd lint`，最终执行全量 `antd lint ./src`

### 已知性能提示

基线 `antd lint ./src` 报告 14 处 `Select virtual={false}`。逐处按以下规则裁决：

- 选项来自可增长服务端集合：优先恢复虚拟滚动，并确保测试不依赖内部隐藏 input。
- 选项是固定且很小的枚举：可以保留非虚拟语义，但必须确认可访问性、popup 行为和实际必要性。
- 不因 CLI warning 直接改动交互；每处结论写入覆盖清单。

## CSS 与表现层审查规则

- 继续使用 `antd-style` token 或 Tailwind，禁止新增 Less 和硬编码主题色。
- 删除 orphan style key、重复声明、被官方组件默认值覆盖的属性和无效 selector。
- 固定尺寸必须有明确产品语义，例如表格列宽、Drawer 宽度、Inspector 栏宽或可操作控件宽度。
- 保留表格内部滚动、看板横向滚动、ellipsis 收缩和 reduced-motion 等功能性规则。
- 不增加固定 viewport 适配、页面级媒体查询或 JavaScript viewport 分支。
- CSS 清理不得改变原型的布局、颜色、密度、文案、层级和交互位置。

## Mock、测试与工具代码审查

- Mock 必须实现契约行为而不是为测试返回特例；共享状态需要明确 reset 边界。
- 测试关注可观察行为，避免断言 className、组件私有 DOM 和实现顺序。
- 异步测试等待明确条件，不使用 sleep、retry 或全局 timeout 扩张。
- 缺陷修复严格 RED→GREEN；纯移动先建立 focused GREEN 基线，移动后重复同一测试。
- 对只有测试同步问题的场景只改善公开条件等待，不改生产行为配合测试。
- 共享测试 harness 只封装真实公共边界，不复制生产逻辑。

## 实施阶段

### 阶段 0：全量只读审计

- 生成逐文件覆盖清单和组件使用清单。
- 运行 React Doctor、Ant Design usage/lint/doctor、依赖检查和重复/死代码扫描。
- 完整阅读所有纳入文件，按 `KEEP/REFACTOR/MOVE/FIX/REMOVE` 分类。
- 先形成 findings 和依赖迁移顺序，不修改生产代码。

### 阶段 1：应用壳与共享边界

- 审查 `app`、access、navigation、theme、shell、共享 components/hooks/types/constants。
- 修正公共边界后再迁移页面，避免每个 Feature 重复解决同一问题。

### 阶段 2：用户侧 Feature

- 依次处理 Login/Bootstrap、Home、Tasks/TaskDetail、Workspaces、Messages、TeamBoard。
- 每个领域完成薄 page、Feature 公开入口、focused tests 和浏览器核对后单独提交。

### 阶段 3：Administration Feature

- 按 Account、Organization、Workspace、Grant、Audit、Policy、Model、Role、Menu、Skill 的依赖关系分批迁移。
- 保留 V0.2 Mock Contract 和已有静态原型页的产品语义。
- 大型页面先拆纯转换、异步编排和展示职责，再移动目录。

### 阶段 4：Service、Mock、测试与配置

- 审查手写 Service seam、transport、Mock 状态、测试 harness、路由和质量脚本。
- generated client 只核对消费方式，不修改内容。
- 删除确认无主、重复或不可达的代码。

### 阶段 5：最终收口

- 对照覆盖清单确认每个文件已有结论。
- 重新运行官方诊断、全量 lint/test/build。
- 使用现有原型关键路由做浏览器 smoke；只接受代码实现优化，不接受视觉漂移。

## 测试与验证门禁

每个任务至少包含：

1. 受影响行为的 focused Vitest 基线或 RED。
2. 最小实现后的 focused GREEN。
3. scoped Biome、TypeScript、dependency-cruiser。
4. 被修改 Ant Design 组件的 CLI API 与 lint 证据。
5. 精确 diff 和提交范围检查。

每个阶段结束执行：

- `pnpm lint`
- `pnpm test`

最终执行：

- `pnpm doctor`
- `NO_UPDATE_CHECK=1 pnpm exec antd doctor`
- `NO_UPDATE_CHECK=1 pnpm exec antd lint ./src`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- 关键路由浏览器 smoke 与 console/network 检查

## 风险控制

- 目录迁移可能产生循环依赖：先定义公开入口，再逐调用方迁移，并以 dependency contract 阻断私有导入。
- 大文件拆分可能造成状态重复：先写状态所有权图，只移动已有 owner，不复制 state。
- Pro Components 异步渲染容易出现测试竞态：等待公开 table/row/dialog 条件，不增加 sleep。
- UI 无意漂移：每批保留原 DOM 语义和组件 props，关键页面用浏览器截图与交互 smoke 比对。
- “最佳实践”可能与锁定版本不符：所有 API 结论必须有 CLI、本地类型或官方版本文档证据。
- 全仓一次性改动难以审查：严格按领域拆分提交，任一阶段失败即停止，不把多个根因混在一个提交中。

## 验收标准

- 全部纳入的手写文件均出现在覆盖清单且具有明确结论。
- 路由 page 只承担装配职责，业务实现位于对应 Feature。
- Feature 之间不导入私有文件，共享组件不依赖业务 Service。
- 页面不依赖底层 HTTP 异常，不存在同一服务端事实的并行本地副本。
- Ant Design/Pro Components 修改均有当前版本官方依据；无 deprecated、a11y、usage 诊断问题。
- 无新增全局 timeout、retry、sleep、viewport 补丁或无意义通用抽象。
- 原型视觉、路由、权限、文案、数据契约和可观察交互保持不变。
- React Doctor、Ant Design Doctor、全量 lint、test 与 build 全部通过。

