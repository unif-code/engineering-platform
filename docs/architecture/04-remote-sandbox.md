# 远程 Sandbox Runtime

> 文档层级：L1 精简版
> 状态：设计基线（待整体评审）
> 详细设计：[远程 Sandbox Runtime 详细设计](./04-remote-sandbox-detail.md)

## 1. 模块目标

为每个 Requirement 提供隔离、可恢复、可审计的远程研发环境，让 Agent 和人员安全地运行代码、生成页面、联调和测试。

## 2. 一个 Requirement 一个逻辑 Sandbox

```text
Requirement Sandbox
├── 前端任务分支
├── 后端任务分支
├── Mock 服务
├── 前端服务与 Preview
├── 后端服务
├── Test / Review 工具
└── Agent Runtime
```

`feat` 的 Product SDD 阶段先启动前端和 Mock；`fix`、`refactor`、`chore` 从各自技术路由所需环境开始。需要后端交付时再挂载后端仓库和服务。逻辑上属于同一个 Requirement，底层可以由多个容器或 Pod 组成。

## 3. 生命周期

```text
申请
→ 创建
→ 拉取固定 Commit
→ 注入短期凭据
→ 运行
→ 发布 Preview / Artifact
→ 暂停或恢复
→ 封存证据
→ 回收
```

Sandbox 不是事实源。代码必须提交到 GitLab，Spec、日志、测试报告和构建产物保存到平台 Artifact Store，环境丢失后可以重建。

## 4. 隔离与安全

- Requirement、Repository 和 Branch 级文件隔离；
- CPU、内存、磁盘、时长和并发配额；
- 网络出口 Allowlist；
- Secret 短期注入且不进入 Prompt、代码或日志；
- Agent 只能调用 Runtime Policy 允许的命令和工具；
- Preview 仅对有权限的 Workspace 成员开放；
- 超时、取消或到期立即吊销凭据。

## 5. 多技术栈

Sandbox 通过版本化 Template 支持 React、Vue、Angular、React Native、UniApp、小程序和 Java 等技术栈。Repository Profiler 识别技术栈后选择对应 Template，特殊项目可以在 Workspace 中覆盖。

## 6. 失败与恢复

Provision、依赖安装、构建、运行、测试和回收分别记录状态。失败重试创建新的 Attempt，不覆盖原日志；回收失败的实例先隔离和吊销凭据，再由异步清理任务处理。

## 7. 与 Jenkins 的边界

Sandbox 负责 `main` 合并前的研发和验证；Jenkins 负责合并后的构建与发布。Sandbox 不替代 Jenkins，Jenkins 也不作为日常 Agent 执行环境。
