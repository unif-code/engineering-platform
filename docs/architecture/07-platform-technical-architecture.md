# 平台技术架构

> 文档层级：L1 精简版
> 状态：完整架构基线（已批准）
> 更新日期：2026-08-06
> 详细设计：[平台技术架构详细设计](./07-platform-technical-architecture-detail.md)

## 1. 当前态

当前仓库是 Umi Max、React 和 TypeScript 前端模板，已具备 Ant Design、Pro Components、Ant Design X、TanStack React Query、Umi Access、Biome 和 Vitest。真实身份认证、Python Control Plane、数据库、Workflow、Agent、Sandbox、GitLab集成、Audit和运行看板都属于目标架构，尚未实现。

## 2. 架构准则

采用“可替换基础设施 + 可提取模块化单体”：

- Python Control Plane先以模块化单体交付，各模块拥有领域模型、Application Service、Schema/Migration和公开Port；
- 不允许跨模块直接读写内部表，跨域通过公开接口、领域事件或只读Projection；
- 高风险或独立扩缩容的编排、Model Gateway和Sandbox执行面独立部署；
- PostgreSQL、Redis-compatible、Event Bus、Secret Manager、Object Storage、Source Control、Model Provider和Observability都位于稳定Port/Adapter之后；
- 未来替换云托管服务或提取微服务，只迁移Adapter、数据和Deployable，不修改Requirement、Workflow、Agent或Authorization语义。

## 3. 逻辑拓扑

```text
Browser
  → platform-gateway
    ├── Umi Max Web（用户端 + 管理端）
    └── Python Control Plane API（模块化单体）
         ├── Identity / Organization / Workspace
         ├── Authorization / Configuration
         ├── Requirement Workflow / Agent Run
         ├── Artifact / Notification / Audit
         └── Port + Transactional Outbox
              ├── Temporal + Platform Orchestrator Worker
              ├── Model Gateway
              ├── Sandbox Controller → Kata Sandbox
              ├── GitLab Connector
              ├── NATS JetStream
              └── Infrastructure / Operations Adapter
```

Control Plane、Temporal、Model Gateway和Sandbox Controller不是Node.js服务；后端主语言为Python。Node.js只来自Umi前端构建工具链，不是额外业务后端。

## 4. 前端

- 用户端和管理端复用一个Umi Max应用、Design Token、Layout和API Client；当前环境只读取本环境数据。
- 后端返回Principal、Workspace、Capability、Scope和菜单；Umi Access只控制界面体验，API仍由后端实时鉴权。
- TanStack React Query管理服务端状态，Umi Model只保存轻量客户端状态。
- Ant Design X用于Requirement对话和Agent过程展示，Pro Components用于管理表格与表单。
- 浏览器不持有数据库、Kubernetes、OpenBao、Object Storage或Cloud Credential，也不直连基础设施Backend。

## 5. Control Plane 与独立 Deployable

模块化单体至少包含：

```text
Identity
Organization
Workspace
Authorization
Configuration
Requirement Workflow
Agent Run
Artifact
Notification
Audit
Integration Ports
```

独立Deployable：

- Temporal Server与Platform Orchestrator Worker：持久Workflow、Timer、Activity和Agent编排；领域事实仍在PostgreSQL。
- Model Gateway：统一Model Catalog、Provider Capability、Route、Quota、联网/思考参数与Usage；平台对话和Agent Runtime使用不同Route Policy。
- Sandbox Controller：Capacity Ledger、Execution Binding、Lease/Fencing、Kubernetes Materialization和回收。
- GitLab Connector、File Security Worker、Operations Adapter等按信任和扩缩容边界独立运行。

## 6. 数据、事件与 Secret

- PostgreSQL 18 + CloudNativePG保存用户、授权、Requirement、Assignment、Workflow投影、Audit索引等权威关系事实；PgBouncer提供有界业务连接池。
- Valkey 9.1 + Sentinel只保存Session热数据、撤销索引、Cache、限流、幂等键和短期锁；不可用时安全事实回查PostgreSQL。
- NATS JetStream承载可靠命令/事件传递，业务事实先与Transactional Outbox原子提交；JetStream不是永久业务主存储。
- Rook-Ceph RGW提供S3-compatible Object Storage，保存Artifact、Audit WORM、应用备份和Observability对象；Stateful实时PVC使用独立低延迟ESSD，不使用Ceph RBD/CephFS。
- OpenBao提供Secret、Transit、PKI和短期凭据。Agent Injector优先把Secret写入Pod内存文件，不写入源码、Git、普通环境变量或日志。
- Temporal的Durable Workflow状态使用同一CloudNativePG中的隔离数据库；不额外引入Java数据库或Elasticsearch。

## 7. Kubernetes 与 Sandbox

- 当前DEV Platform Environment和未来PROD Platform Environment均使用自管Kubernetes，不采用k3s，并使用同源正式组件与流程；个人Local Development Environment不属于本部署基线。
- Node Role固定为`k8s-control-plane`、`platform-worker`、`sandbox-worker`和`storage-worker`，通过Taint、Affinity、PDB、Topology和NetworkPolicy隔离。
- Cilium提供CNI、NetworkPolicy和Hubble；Gateway API提供北向平台入口；cert-manager负责证书生命周期。
- Agent Sandbox使用社区Kata Containers 4.x、QEMU/KVM和专用RuntimeClass，每个Sandbox拥有独立Guest Kernel，禁止失败时回退runc。
- 每个环境使用2个分布在独立物理Host的KVM-capable `sandbox-worker`；Region未定时Alibaba Cloud以EBM作为保守Fallback，若目标Region有官方GA并通过PCS的较小Nested-Virtualization ECS，可只替换Compute Provider Mapping。
- Sandbox可以按受控Egress Policy访问批准的Model、Git、依赖和搜索服务；用户选择“联网搜索”与Agent工具联网是两个Route/Policy，不混成一个开关。

## 8. 环境、容量与部署边界

- 当前只部署DEV；未来PROD使用相同代码、组件清单、HA/复制机制、GitOps模板和Platform Compatibility Set独立部署。
- DEV与PROD分别使用独立Resource Account、VPC、Kubernetes Cluster、Gateway、数据库、Session、密钥、Backup和Provider Audit，不共享运行实例。
- 当前为单Region、Single-Zone的Cluster HA/Cluster DR，不宣称Zone/Region/Site DR；Region/Zone是部署参数。
- 当前DEV Capacity Candidate为12个Node：3 Control Plane、4 Platform、2 Sandbox、3 Storage。
- 未来PROD Candidate为15个Node：3 Control Plane、6 Platform、2 Sandbox、4 Storage。
- EBM Fallback下派生Raw Compute约为DEV至少190 vCPU/620 GiB、PROD至少220 vCPU/728 GiB；这些不是跨Provider硬常量，具体SKU在PCS/Capacity Profile验证后重新派生。
- 当前只采购DEV；精确月费通过引用Binding、PCS和Capacity Profile的Environment TCO Snapshot计算，不把未来PROD误算为当前支出。

## 9. Observability 与运维

- 应用使用OpenTelemetry标准；Metrics由Prometheus双副本 + Thanos Query，Alert由Alertmanager三副本承载。
- Log使用Loki Monolithic三副本；Trace使用Tempo 3 Monolithic单副本和双OpenTelemetry Gateway有界持久Queue。
- 首版不引入Mimir、Kafka或全分布式Loki/Tempo；文档保留通过Adapter/OTLP/PCS演进到分布式Backend的路径。
- Grafana、Hubble、Temporal和OpenBao控制台从当前环境管理后台经授权后新标签页打开，平台不重复实现专业查询产品。
- Cloud Account、VPC、NLB、WAF、VPN、NAT、KMS、外部Backup和Watchdog由运维/IaC管理。平台只消费逻辑Binding和签名只读状态Feed，不持有Cloud Admin Credential或提供基础设施写API。
- External Watchdog位于Cluster故障域之外，Cluster、平台API或Collector失联时仍能独立告警。

## 10. 安全与恢复

- 员工使用8位员工编号、正式密码、服务端可撤销Session和全员强制TOTP；第一阶段无SSO/HR。
- 所有受保护API校验Capability + Scope + Membership + Assignment + Resource Guard；已启动Attempt按不可变Execution Binding继续，新的用户控制动作立即使用当前权限。
- Kubernetes API使用Cluster外Private L4 NLB；etcd使用本地`secretbox` Data-at-rest Encryption并把匹配Keyring纳入Recovery Bundle。
- PostgreSQL、NATS、OpenBao和etcd使用各自应用一致性Backup/Restore；Audit进入365天COMPLIANCE Object Lock。
- 当前恢复目标是Cluster级，不是站点级；外部Backup Repository、Recovery Material和Watchdog必须位于目标Cluster故障域之外。
- Secret、Token、密码、TOTP Secret、Private Key、Presigned URL和Prompt/源码正文不得进入Log、Trace、Metric Label或Audit正文。

## 11. 质量与演进

- API/事件/配置/Capacity Schema版本化，Command使用幂等键与乐观并发，外部Effect通过Ledger/Fencing防重。
- Platform Compatibility Set锁定Kubernetes、Ubuntu、containerd、Kata、Cilium、Operator、Chart和Image Digest；先DEV验证再提升PROD。
- 单元、契约、Adapter、Workflow、故障、恢复、升级和端到端测试分层；不能只以Pod Running判断数据、Quorum或业务健康。
- 容量变化通过不可变Environment Capacity Profile，基础设施实现变化通过新PCS；平台后台只读显示Desired/Effective/Drift。
- 未来提取微服务、迁移云托管PostgreSQL/Redis-compatible/Secret Manager/S3或独立Sandbox Cluster时，先建立新Adapter和迁移验证，不复制一套领域逻辑。
