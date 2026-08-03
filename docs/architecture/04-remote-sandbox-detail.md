# 远程 Sandbox Runtime 详细设计

> 文档层级：L2 详细版
> 状态：设计基线（待整体评审）
> 更新日期：2026-08-02
> 对应精简版：[远程 Sandbox Runtime](./04-remote-sandbox.md)

## 1. 目标与非目标

目标：

- 为 `feat` Product SDD、`fix` Debug、技术快速路由、Backend SDD、Frontend Delivery、Test 和 Review 提供统一运行环境；
- 隔离不同 Workspace、Requirement、Repository 和 Agent Run；
- 支持页面 Preview、Mock、后端服务和前后端联调；
- 环境可暂停、销毁和重建，代码及证据不因环境消失而丢失；
- Sandbox 实现可从容器平台替换为 VM 或其他远程开发环境。

非目标：

- 不作为代码或 Workflow 的事实源；
- 不保存长期生产凭据；
- 不替代 GitLab、Artifact Store 或 Jenkins；
- 不允许不同 Requirement 共享可写工作目录。

## 2. 逻辑与物理模型

业务上一个 Requirement 对应一个逻辑 `RequirementEnvironment`：

```text
RequirementEnvironment
├── Frontend Workspace
├── Backend Workspace（开发阶段加入）
├── Mock Service
├── Frontend Preview
├── Backend Service
├── Agent Runner
└── Test / Review Runner
```

底层可以由一个或多个 Pod、Container 或 VM 组成。物理实例可以随暂停和恢复重新创建，逻辑环境 ID、Repository Binding、Artifact 和访问地址保持稳定引用。

## 3. 核心实体

| 实体 | 职责 |
| --- | --- |
| `SandboxTemplate` | 定义基础镜像、运行时、工具、资源和安全配置 |
| `RequirementEnvironment` | Requirement 级逻辑环境 |
| `SandboxInstance` | 一次物理环境实例 |
| `SandboxRun` | 一次构建、开发、测试或 Review 执行 |
| `RepositoryCheckout` | Repository、Branch、Commit 和工作目录绑定 |
| `ServiceBinding` | 前端、后端、Mock 等进程和端口 |
| `PreviewEndpoint` | 受保护的 Preview 地址 |
| `SecretLease` | 有效期内的短期 Secret 引用 |
| `SandboxArtifact` | 日志、测试报告、构建结果等证据 |

所有实体关联：

```text
workspaceId
projectId
requirementId
correlationId
```

## 4. 生命周期

### 4.1 Requirement Environment

```text
REQUESTED
→ PROVISIONING
→ ACTIVE
→ SUSPENDED
→ ACTIVE
→ ARCHIVING
→ DESTROYED

异常：
PROVISION_FAILED | QUARANTINED
```

### 4.2 Sandbox Run

```text
QUEUED
→ PREPARING
→ RUNNING
→ SUCCEEDED

异常终态：
FAILED | TIMED_OUT | CANCELED

终态后：
ARTIFACTS_SEALED
```

重试创建新 `SandboxRunAttempt`，不复用失败实例中的不确定状态。

## 5. Provision 流程

```text
接收 EnvironmentRequest
→ 校验 Workspace、Requirement 和配额
→ 读取 Repository Profile
→ 解析 Sandbox Template
→ 创建隔离网络和计算资源
→ 申请短期 Git 凭据
→ 按固定 Commit Checkout
→ 恢复可信依赖缓存
→ 注入 Runtime Policy
→ 执行健康检查
→ 发布 EnvironmentReady
```

只有健康检查通过，Workflow 才能启动 Agent Run。

## 6. 分阶段运行

### 6.1 `feat` Product SDD

仅 `feat` 使用本阶段，默认启动：

- 前端 Repository Checkout；
- 前端开发服务；
- Mock 服务；
- Product Agent；
- Preview Gateway。

产品和产品 Leader访问受权限保护的 Preview，确认绑定的 Commit 和 Artifact。

### 6.2 研发交付

开发 Leader选择后端仓库后：

- 增加后端 Repository Checkout；
- 创建后端任务分支；
- 启动后端 Runtime；
- 将前端 API Base URL 指向内部后端服务；
- 保留 Mock 作为异常和未实现接口的受控降级手段。

### 6.3 Test 与 Review

Test/Review 使用固定 Commit 创建独立 Run。不得在测试过程中继续修改同一个工作目录，避免证据与代码版本不一致。

## 7. Template 与多技术栈

`SandboxTemplate` 版本化管理：

```text
frontend-react
frontend-vue
frontend-angular
mobile-react-native
mobile-uniapp
mini-program
backend-java
```

Template 至少定义：

- Base Image 和运行时版本；
- Package Manager 和依赖安装命令；
- Build、Test、Lint、Dev Server 命令；
- 允许端口；
- CPU、内存、磁盘默认值；
- Tool Allowlist；
- 缓存目录；
- 健康检查；
- 支持的 Preview 类型。

浏览器项目提供 URL Preview；RN、UniApp 和小程序可以提供构建 Artifact、二维码或专用远程设备 Preview，其实现通过 `PreviewAdapter` 扩展。

## 8. Repository 与并发控制

- 每个 Checkout 固定 Repository、Branch 和起始 Commit；
- 同一 Repository Branch 同一时间只允许一个写 Run；
- Test 和 Review 可以创建只读副本并行运行；
- Agent 修改后必须形成 Commit 并 Push 到任务分支；
- 未提交修改在暂停前需要生成临时 Patch Artifact；
- 恢复时以 Git Commit 为主、Patch 为补充，不依赖原磁盘。

对分支进行 rebase、merge 或冲突解决时使用独占锁，并在完成后重新触发测试和审批失效检查。

## 9. 网络与 Preview

Sandbox 默认无任意公网出口，只开放：

- GitLab；
-允许的依赖源或内部镜像；
- Model Gateway；
- Artifact Store；
- 平台 Control Plane；
- Workspace Policy 明确允许的测试服务。

Preview Gateway 校验用户会话、Workspace Membership 和 `requirement:view`。Preview URL 不直接暴露 Pod 地址，支持有效期、访问日志和即时撤销。

前后端服务通过 Sandbox 内部 Service Binding 通信，不使用生产域名和生产凭据。

## 10. Secret

Secret 由 Secret Manager 保存，Sandbox 只获得短期 Lease：

- GitLab 分支级凭据；
-内部依赖源 Token；
-测试数据库凭据；
- Model Gateway Run Token。

要求：

- 环境变量或内存挂载按需注入；
- 日志、Prompt 和 Artifact 脱敏；
- Run 结束立即撤销；
- Workspace 成员撤权、协作到期、环境取消时主动吊销；
- 禁止在镜像、代码、Commit 或缓存中持久化。

## 11. 资源与成本

配额维度：

- Workspace 并发 Environment；
- User/Agent 并发 Run；
- CPU、内存、磁盘；
-最长运行时间和空闲时间；
- Preview 保留时间；
- Artifact 和依赖缓存容量。

空闲环境自动暂停；重新访问或新 Run 可以恢复。Requirement 完成后进入保留期，超期封存 Artifact 并销毁环境。

## 12. Artifact

必须持久化：

- Build、Lint、Test 输出；
-覆盖率和测试报告；
- Preview 元数据和截图引用；
- Agent Tool 调用日志；
- 环境、Template 和依赖版本；
-失败诊断信息；
-临时 Patch；
-生成物摘要与校验 Hash。

Artifact 保存到 Object Storage，元数据由平台数据库管理。敏感日志进入受限存储并按数据等级设置保留期。

## 13. Sandbox Port

核心接口：

```text
createEnvironment
attachRepository
startRun
cancelRun
suspendEnvironment
resumeEnvironment
publishPreview
collectArtifacts
destroyEnvironment
getEnvironmentStatus
```

调用方只使用逻辑 ID，不依赖 Kubernetes Pod、Container 或 VM 标识。

## 14. 领域事件

```text
EnvironmentRequested
EnvironmentReady
EnvironmentProvisionFailed
RepositoryAttached
SandboxRunStarted
SandboxRunCompleted
PreviewPublished
EnvironmentSuspended
EnvironmentQuarantined
EnvironmentDestroyed
SecretLeaseRevoked
```

事件写入统一 Correlation ID，供 Workflow、审计和指标消费。

## 15. 失败处理

| 场景 | 处理 |
| --- | --- |
| Provision 失败 | 限次退避重试；失败后保留诊断，不推进 Workflow |
| 基线代码本身不能构建 | 标记 `BASELINE_FAILURE`，与 Agent 修改失败区分 |
| 依赖源不可用 | 保留安装日志，按 Policy 使用可信缓存或重试 |
| Agent Run 超时 | 终止进程、封存日志、吊销 Lease |
| `feat` Preview 健康检查失败 | 不发布 Preview，不允许黄金需求确认 |
| 磁盘或资源超限 | 停止写入并通知负责人，不自动扩大配额 |
| Sandbox 清理失败 | 断网、吊销 Secret、标记 `QUARANTINED`，由 Janitor 重试 |
| 平台与实例状态不一致 | Reconciler 对账并以安全关闭为优先 |
| 物理实例丢失 | 从 Commit、Template 和 Artifact 重建 |

## 16. 安全审计

记录：

- Environment 和 Run 的创建者、触发原因；
- Template、镜像摘要和资源配额；
- Repository、Branch、Commit；
- Secret Lease 的签发与撤销，不记录 Secret 值；
- 命令、Tool、网络目标和退出码；
- Preview 访问；
- Artifact 上传和删除；
- 超时、取消、隔离和回收。

## 17. 可观测性

指标：

- Provision 时长和成功率；
- 冷启动、缓存命中率；
- Run 成功率、超时率和排队时间；
- CPU、内存、磁盘和网络使用量；
- Preview 可用率；
-回收成功率和隔离实例数量；
-按 Workspace、Requirement 和技术栈统计的成本。

日志和 Trace 使用 `workspaceId`、`requirementId`、`environmentId`、`runId` 和 `correlationId` 关联。

## 18. 验收场景

1. 创建 Requirement 后可以从指定前端 Commit 启动环境并访问 Preview。
2. `feat` Product SDD 阶段只能访问前端仓库和 Mock；其他类型按自己的 Execution Binding 访问获批资源。
3. 后端仓库绑定后可以在同一逻辑环境完成联调。
4. 两个 Requirement 不能读取或修改对方文件和 Secret。
5. Agent 不能写非任务分支或访问未授权网络。
6. Sandbox 丢失后可以从 Git 和 Artifact 重建。
7. 协作成员到期后无法访问 Preview 和 Sandbox。
8. Run 超时后进程终止、凭据撤销、日志完整保留。
9. 清理失败实例被隔离，不继续持有网络和 Secret。
10. Sandbox 实现替换时，Requirement Workflow 不需要改变。
