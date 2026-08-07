# 安全、审计与治理详细说明

> 文档层级：L2 规范事实源
> 对应主文：[安全、审计与治理](./security-audit-governance.md)

## 1. 责任边界与 Profile 语义

本文是安全、Secret、PKI、加密、Audit、供应链、Provider 信任材料与 Break-glass 的唯一规范事实源。它消费 01 的本地身份、Session、Capability、Super Admin 和 Recovery Port 语义，却不复制这些业务状态或授权判定；它消费 06 的 Console Access 与 External Provider Contract，却不复制其链接、Envelope 或 Ingest 算法；它消费 07 的数据服务恢复链和 09 的环境、Cluster、网络、容量与 DR 语义。

本文描述完整 Target Architecture，不声明任何 Environment 已经部署哪些安全组件。实施阶段、Capability 激活状态、Release 验收与 Reliability/Capacity Profile 只见[实施路线图](../12-implementation-roadmap/implementation-roadmap-detail.md)；实际 Trust、Image、配置、拓扑和恢复证据由环境 GitOps Desired State、PCS、Audit 与 Restore Drill 证明。

### 1.1 Security Floor

下列控制是所有已启用 Capability 的不可降级 Security Floor，与 Replica 数、HA 或 Hardened Profile 无关：

| 控制 | 最低判定 |
| --- | --- |
| Human Identity | 本地账号 Password 使用 Argon2id、独立 salt 与受保护 pepper；TOTP、Session、撤销和服务端授权按 01 Contract 执行。 |
| Secret | Secret、Token、Private Key 和认证材料不进入普通 Environment Variable、镜像、Git、Artifact、PV、日志、Trace、Metric 或 Audit 正文；只经最小权限 Workload Identity 注入 Pod `tmpfs` 内存文件。 |
| Transport and identity | Browser、Gateway、Workload 与数据服务使用 TLS/mTLS、目标验证、环境/用途隔离的身份和最小权限；身份或吊销状态未知时 Fail Closed。 |
| Audit | 受保护写入、高权限动作、配置、安全判定与恢复形成可靠、追加式、可关联且受 WORM 保护的 Audit。 |
| Supply chain | 运行镜像绑定 provenance、SBOM、签名、漏洞扫描和精确 digest；Coverage 或判定未知时阻止部署。 |
| Recovery | 密钥、Trust Store、Backup、Manifest、对象版本、恢复顺序和真实 Restore 结果可验证；不能通过清空回放状态或放宽安全判定恢复服务。 |

Launch Profile 可以对 OpenBao、PKI Publication、File/Image Scanner 采用单实例并允许单点故障时安全停止，但仍必须满足上表全部判定、硬 Resource Limit、Cluster 外 Backup 和真实 Restore。OpenBao 多 Voting Server、完整 PKI 轮换自动化、Scanner 多副本与更高频率 DR 属于 Hardened Target；这些增强提高连续性和恢复目标，不为任何已启用能力创建较弱安全模式。

## 2. 身份材料保护

账号、密码生命周期、TOTP Enrollment、Session 失效与授权语义以[身份、组织与授权](../01-identity-organization-authorization/identity-organization-authorization-detail.md)为准。密码验证使用 Argon2id、每个密码独立 salt 和由 OpenBao 提供的 pepper；平台只保存受保护的派生验证结果。

密码、临时密码、TOTP Code、TOTP Secret、Session Cookie、Access Token、Refresh Token、Private Key、完整 Presigned URL、Prompt、源码正文及可直接重放的凭据禁止出现在：

- Browser 的持久化存储、Frontend Bundle、客户端日志或错误提示；
- 应用日志、Trace 属性、Metric Label、告警标签和外部状态 Envelope；
- Audit 正文、普通 Artifact、Git、镜像层和非受控对象元数据。

Audit 和 Telemetry 只允许记录不可逆引用、受限摘要、结果、版本、时间与 Correlation ID。需要排查时，使用受权的目标系统查询，不复制敏感原文进入平台。

## 3. OpenBao、Workload Identity 与 Agent Injector

每个环境部署独立 OpenBao。Kubernetes Auth 为每个服务建立独立 ServiceAccount、Auth Role 和最小权限 Policy，Role 精确绑定 Namespace 与 ServiceAccount；服务仅能读取自己用途的 Secret 路径和必要的短期凭据。Workload 使用 `audience=openbao` 的 projected ServiceAccount Token，OpenBao 仅以本环境、最小权限 TokenReview 验证该身份；不接受默认 Audience、长期 ServiceAccount Token 或跨环境身份。平台不提供集中高权 Token Broker，也不把平台 API 变成 Secret 转发通道。

Launch Profile 可使用一个 OpenBao Voting Server 与一个 Agent Injector Replica，但 Integrated Storage、TLS、Kubernetes Auth、最小 Policy、`tmpfs` 注入、双 Audit Device、应用一致性 Raft Snapshot、Cluster 外 `openbao-recovery`、离线 OpenPGP 和 Restore Drill 均不可省略。单实例不可用时依赖新 Secret 或续租的动作安全停止，不能回退到普通 Environment Variable、长期共享 Token 或明文 Listener。

OpenBao Server、官方 Helm Chart、Agent Injector 和附属镜像的精确版本/digest 只由 [09 的 PCS](../09-infrastructure-operations/infrastructure-operations-detail.md)锁定；不得使用浮动 Tag。OpenBao 使用 Integrated Storage（Raft），不以 PostgreSQL 或业务数据服务作为 Storage Backend。Hardened Target 中 DEV 使用 3 个 Voting Server、quorum 2，PROD 使用 5 个 Voting Server、quorum 3。每个 Server 使用独立 10 GiB SSD RWO Data PVC，并通过 Anti-Affinity 与 Topology Spread 分散；同一时刻只有一个 Active，其他满足 quorum 的 Voting Server 为同步 Standby。

| 环境 | Voting Server | 单 Server Request | 单 Server Limit | 单 Server Data PVC |
| --- | ---: | --- | --- | ---: |
| DEV | 3 | 250m CPU / 512 MiB | 1 CPU / 1 GiB | 10 GiB |
| PROD | 5 | 500m CPU / 1 GiB | 2 CPU / 2 GiB | 10 GiB |

Data PVC 使用低延迟、非共享、支持在线扩容的 SSD RWO StorageClass；70%/85% 为 Warning/Critical，扩容不执行在线缩容。Hardened Target 的 Server 副本数固定为 DEV 3、PROD 5，不使用 HPA；资源变化经 GitOps 逐节点执行，并重新验证 quorum、Raft Catch-up、PKI、Snapshot 与故障切换。Launch 单实例同样必须在 PCS 中声明硬 Request/Limit 与 PVC Ceiling。

OpenBao API/UI Listener 只启用 TLS 1.2/1.3，并以 ClusterIP 暴露。8200 仅允许 Agent Injector、批准的 Workload、受控运维和备份入口访问；8201 仅允许 OpenBao Pod 之间的 Raft/Cluster mTLS 通信。Sandbox、Browser 和未登记 Namespace 均无 OpenBao 网络路径；明文 Listener、NodePort、LoadBalancer 和公网暴露均被禁止。

各环境默认 Workload Token TTL 为 1 小时，续期和撤销严格受所属 Auth Role/Policy 控制。Hardened Target 的 OpenBao Agent Injector 在每个 Cluster 以两个无状态副本跨 Node 运行：DEV 单副本 Request/Limit 为 `50m CPU / 128 MiB` 与 `250m CPU / 256 MiB`，PROD 为 `100m CPU / 256 MiB` 与 `500m CPU / 512 MiB`。注入的 Agent Sidecar 计入所属业务 Workload，不计入 Server 或 Injector 容量。

Agent Injector 只将 Secret 写入 Pod `tmpfs` 内存文件，并用文件权限限制读取者。Secret 禁止写入环境变量、镜像、Git、Prompt、Artifact、PV、日志、Trace 或 Metric；进程退出、Pod 销毁或 Lease 失效时，内存文件随运行时清除。Workload 必须通过其自身 Kubernetes Identity 获取短期 Token，不共享人类或其他服务的 Token。

基础 Credential Provider 使用按服务、用途、Schema 与环境隔离的静态最小权限数据库凭据，由 Agent Injector 写入 Pod `tmpfs` 文件；Deployment、Helm Values、ConfigMap 和 Environment Variable 不保存凭据。动态数据库凭据作为独立演进只替换 `SecretManagerPort`/credential provider、轮换与连接重建实现，不改变领域模块、数据库 owner 或授权语义。

每个环境采用 Shamir `5/3` 初始化：共五个分片，任意三个可完成解封。没有外部 Seal KMS/HSM。当前所有分片由同一保管人暂管，这是明确的治理例外，不构成多人制衡；交接、盘点、使用与变更都必须写入独立 Audit。OpenBao Root Token 不作为日常服务凭据，Root 操作只在受控 Break-glass 条件下执行。

OpenBao Audit 同时尝试写入独立 Audit PVC 与 stdout 两个 `file` Audit Device。一个 Device 发生非阻塞失败而另一个成功记录时请求可以继续；两个 Device 均无法记录时请求 Fail Closed。归档 Audit 写入 `audit-worm`，默认保留 365 天 `COMPLIANCE` Object Lock；对象保护、精确版本与清理由[数据、消息与存储](../07-data-messaging-storage/data-messaging-storage-detail.md)拥有。

每个 OpenBao Pod 的 Audit PVC 与 Raft Data PVC 分离：DEV 为 5 GiB，PROD 为 10 GiB。本地缓冲默认保留 7 天，不是长期权威归档；PVC 使用率在 70%/85% 进入 Warning/Critical。两个 `file` Audit Device 以 HCL/GitOps 声明，一个落入独立 Audit PVC，另一个写入 stdout；均采用 JSON、`log_raw=false` 与 HMAC 保护。任一 Device 失败但另一个可记录时请求可继续，两个 Device 都无法记录时必须 Fail Closed。

OpenBao Raft Snapshot 使用应用一致性快照，不以多个 PVC/CSI Snapshot 充当恢复来源。Backup/Restore 和演练是 Security Floor；Hardened Target 提高频率：DEV 每 6 小时生成并保留 7 天，PROD 每 1 小时生成，保留 48 小时周期点和 30 天每日点。DEV 每月、PROD 每季度在隔离环境执行完整恢复演练；Hardened DR 目标为 DEV `RPO ≤ 6h`、`RTO ≤ 60min` 及 PROD `RPO ≤ 1h`、`RTO ≤ 60min`。调度、保留、Object Lock、阈值和演练周期均为版本化 GitOps 运维配置，管理后台只读展示有效值与证据。

OpenBao/Chart/Plugin 升级以及高风险 Auth、Policy、Secret Engine、Seal、Shamir 或 Transit Key 变更前，必须生成并验证按需 Snapshot。每份 Manifest 绑定 Environment、Cluster ID、Snapshot Time、OpenBao/Chart/Image Version、Raft Index、Seal Generation、独立的 Shamir Share Generation、Object Version、Size、SHA-256 与 OpenPGP Recipient Fingerprint；Seal Generation 与 Shamir Share Generation 是两个独立字段，不得合并、互相推导或互相替代。`openbao-recovery` 对象使用 Versioning 和默认 7 天 `GOVERNANCE` Object Lock。Shamir 轮换后立即生成并验证新 Snapshot；旧 Shamir Share Generation 的 Share 保留到与其一一绑定的最后一份 Snapshot 到期且 Restore 验证通过。`snapshot-force` 只能由受控 Break-glass 身份在批准的恢复窗口执行，CronJob 和普通运维身份没有该权限。

## 4. OpenBao PKI 与 Trust Bundle

OpenBao PKI 提供环境内证书签发，cert-manager 负责 Kubernetes 工作负载证书生命周期。证书层级固定为：

```text
离线 Organization Root：ECDSA P-384 / SHA-384，10 年
  └── 环境独立 Online Intermediate：P-256，3 年
        └── Gateway 与 Workload Leaf：P-256
```

Root Private Key 保持离线；每个环境只使用自己的 Intermediate、签发策略、CRL 和证书库存。公开 Root Bundle 是经 GitOps 审核、版本化且绑定 digest/review evidence 的 PKI Artifact；`TrustBundlePort` 将其分发到批准的 Node、Workload 和受控员工终端，不能分发 Private Key、Token、Intermediate 或可签发凭据。PKI 发行和吊销均记录证书标识、用途、环境、Issuer、时间、结果与 Correlation ID。

TLS、受信 Root、环境隔离 Issuer、叶证书更新和吊销可验证性属于 Security Floor。双 Root/双链重叠、完整 CRL/OCSP Publication 冗余和全自动覆盖验证属于 Hardened Target；尚未采用完整增强自动化时，证书过期、吊销状态或 Trust Bundle 不可证明仍必须 Fail Closed，不能降级为跳过校验。

Gateway Leaf 有效期 30 天，提前 10 天进入轮换窗口。Full CRL 每 24 小时发布，并给予最多 6 小时的受控传播宽限；OCSP 响应有效期 4 小时；不使用 Delta CRL。紧急吊销在 Revocation 可靠提交后立即 rotate/publish Full CRL 并验证签名、Issuer、Serial 状态和实际发布内容。依赖吊销状态的受控 mTLS Client 在 CRL/OCSP 状态不可证明时 Fail Closed。

Root 或 Intermediate 轮换使用双 Root/双链重叠：先发布新旧 Root Bundle，验证 Node、Workload、Runtime 与受控终端的分发覆盖，再切换新 Intermediate/Leaf Chain。旧 Issuer 保持只读 CRL/OCSP 能力，旧 Root/链只有在全部相关 Leaf、缓存窗口与安全缓冲结束且无消费者证据后才能退役。公开 CRL、OCSP 和证书链只通过只读 `pki-publication` 发布。

Hardened Target 中每个环境的 `pki-publication` 使用两个跨 Node 分散的无状态副本。它只访问当前环境的公开 Issuer Certificate、Full CRL 与 OCSP Read Endpoint，不持有 OpenBao Token、Kubernetes Secret、CA/Leaf Private Key 或签发/吊销权限。Gateway 只允许精确 `/.well-known/pki/` 状态路径与协议规定的方法，拒绝 Cookie、Authorization、Session、未知 Issuer、超限请求和非 PKI 路径。

每次 Gateway 叶证书续签必须设定 `privateKey.rotationPolicy=Always`，生成新的 Leaf Private Key；证书签发、Secret 更新、Gateway 热加载和实际对外证书 Serial/SAN/Chain/有效期形成可观测闭环。PKI 状态路径、CRL/OCSP 响应及 Trust Bundle 仅传播公开材料；轮换期间旧 Issuer 保持必要的只读吊销状态，直到其已签发叶证书、缓存窗口与安全缓冲均满足退役条件。

## 5. Data-Service Transport / Service Identity / Access Contract

本 Contract 是 PostgreSQL/PgBouncer、Valkey、NATS 与 Temporal 的传输、工作负载身份和最小访问唯一安全事实源；07 只拥有拓扑、数据语义和恢复。数据服务的客户端与北向入口只使用普通 ClusterIP；同组件 StatefulSet 的 Route、Internode 或 Peer Discovery 可以使用 `clusterIP: None` 的 Headless Service 与稳定 Pod DNS，但只能开放成员端口，并同时受 mTLS、成员身份校验和双向 default-deny NetworkPolicy 限制。所有数据服务都禁止 NodePort、LoadBalancer 或公网暴露，并按当前 Environment、Deployable Unit、用途和协议端口精确放行。证书、Database Role、ACL User、NKey、Machine JWT、Secret 路径与运维身份不跨环境或用途复用；身份、证书、授权或吊销状态不可证明时连接 Fail Closed，禁止回退明文、匿名、default user 或共享高权限凭据。

### 5.1 PostgreSQL 与 PgBouncer

应用到 PgBouncer、PgBouncer 到 PostgreSQL、受控直连、复制、备份和监控路径全部启用 TLS，并执行受信任 CA、目标主机名与证书有效性校验；内部服务和复制/管理路径按各自 PKI Role 使用 mTLS。PgBouncer Frontend 与 Backend 都不得接受明文连接或 `sslmode=disable/allow/prefer`，普通应用没有绕过 Pooler 直连 `rw` Service 的网络路径。

每个可独立部署服务、Schema、环境和用途使用独立 Runtime Role；Runtime Role 只获得目标 Schema 所需 DML。Alembic/Schema Job 使用短生命周期 DDL Identity，受控运维和 Break-glass 使用彼此隔离的 Operations Identity；Runtime、DDL、备份、复制、监控和运维身份不得互相替代。数据库凭据由 OpenBao 以内存文件提供，证书身份不能替代数据库最小权限，数据库密码也不能替代 TLS/mTLS。

### 5.2 Valkey

Valkey Client、Primary/Replica 复制和 Sentinel 通信只开放 TLS 端口并强制 mTLS；Server、Client、Replication、Sentinel 与 Monitoring 使用隔离的证书用途和服务身份。关闭明文数据端口与 `default` User，每个 Deployable Unit、复制、Sentinel、监控和 Break-glass 用途使用独立 ACL User，凭据由 OpenBao 以内存文件分发。

普通身份仅允许业务需要的命令与 Key Prefix，并拒绝 `CONFIG`、`MODULE`、`DEBUG`、`FLUSHALL`、`FLUSHDB`、`SHUTDOWN`、`REPLICAOF` 和 ACL 管理等高风险能力。Break-glass 身份默认不可用；TLS、mTLS、ACL、证书轮换或撤销校验失败时拒绝连接和写入，不能开放明文或 default user 作为降级路径。

### 5.3 NATS JetStream

NATS Client Port 和 Cluster Route 全部使用 TLS；Client 连接同时要求受信任的 mTLS Workload Certificate 与独立 NKey Challenge，Route 使用单独的 Route Certificate 完成 mTLS。`PLATFORM` 与 `SYS` Account 隔离，不使用默认全局 `$G` Account；业务身份不能访问 `$SYS.>`，系统身份不能发布平台业务 Subject。

每个 Deployable Unit 使用独立 NKey User，并以 Publish/Subscribe Allowlist 精确授予业务 Subject、Queue Group、Reply Inbox 与必要的 JetStream API Subject；默认拒绝跨领域通配符、不必要的 `$JS.API.>` 及 Stream/Consumer 管理权限。NKey Public Key、Account 和 Permission 是版本化 GitOps 配置，Seed 只保存在 OpenBao 并以内存文件注入。Sandbox 不获得 NATS 网络、证书或 NKey；证书/NKey 轮换仅允许短时新旧身份重叠，验证新身份后立即吊销旧身份。

### 5.4 Temporal

Temporal Internode 与 Frontend 分别启用 mTLS、目标主机名校验和证书用途隔离，Frontend 固定 `requireClientAuth=true`；全部 Service 仅使用 ClusterIP。`internal-frontend=false`，不保留绕过外部授权的内部管理入口。NetworkPolicy 只允许 Temporal Server 成员、Platform Orchestrator Client/Worker、只读 Operations Adapter 与受控一次性 Job 访问对应端口。

Frontend 固定启用 `claimMapper=default` 与 `authorizer=default`，禁止 `noopAuthorizer`、`nopAuthority` 或仅凭 mTLS 放行。`ServiceIdentityPort` 签发由 OpenBao Transit 保护的短期 Machine JWT；默认 TTL 为 `10min`、最大 `30min`，并校验 Issuer、Audience、Subject、JTI、Expiry 与 `<namespace>:read|write|worker|admin` Claim。每个环境独立创建逻辑名为 `engineering-platform` 的 Temporal Namespace；Orchestrator Client、SDK Worker、只读 Operations Adapter 与一次性 Admin Job 分别使用 `write`、`worker`、`read` 和受控 `admin` 身份。普通用户、Browser、Agent 与 Sandbox 不直接持有 Temporal Certificate、Machine JWT 或 Admin Credential。

## 6. Kubernetes API Secretbox Data-at-rest Encryption

每个环境使用独立 CSPRNG 生成的 32-byte `secretbox` key，仅在 `EncryptionConfiguration.secret` 字段以 Base64 表示。EncryptionConfiguration Schema 固定为 `apiserver.config.k8s.io/v1`；三个 API Server 的有序 Keyring、Resource Catalog、Provider 顺序和内容哈希必须一致。启动前 Pre-start Gate 验证 `--encryption-provider-config`、Schema、Catalog、Keyring、配置哈希、generation、文件权限和恢复材料完整性。全新 Cluster 完全不配置任何 identity provider。

`Sensitive API Resource Catalog` 至少包含 `secrets` 与 `configmaps`，并只在经过数据分类、API Discovery 与资源标识校验后加入确实承载敏感 Payload 的 CRD。Catalog 使用官方精确小写复数 `resource` 或 `resource.group` 标识，例如 `widgets.example.io`，不使用 Kind、API Version、模糊业务名称或 `*.*` Wildcard。Catalog、CRD 或 Provider 的改变属于新的 PCS/GitOps 变更，不能由平台后台动态修改。

`identity` 只允许作为既有明文迁移期间的最后临时读 fallback，永不作为 writer。新 Key 必须加入同一 provider array 中现有 `secretbox` provider 的同一个 `keys` 数组，先作为第二个 read candidate，再提升为第一个 writer；变更通过原子文件替换逐台 Drain、restart、verify，禁止各 API Server 使用不同 Keyring 或并行写配置。

每次配置、Catalog 或 Keyring 变更都先生成 `BACKUP_VERIFIED` Pre-change etcd Snapshot；该 Snapshot 只能绑定变更时实际 Effective 的 Provider 顺序、Active Writer、完整 Read Keyring、Catalog、Config Hash 与不可变 Recovery Bundle ID。包含新 Key 或下一阶段顺序的 Candidate Bundle 必须使用不同 Bundle ID 并标记 `PENDING`，不能绑定到 Pre-change Snapshot，也不能在对应配置生效前冒充 Effective Recovery Bundle。每个阶段生效后生成新的不可变 Bundle/State Manifest，后续 Snapshot 只绑定其生成时的 Effective Generation。

每次 Keyring 轮换和恢复都执行 Sensitive Catalog 的全量幂等 rewrite，并验证：

1. API read 与 canary write/read 成功；
2. 预期对象数量与重写计数一致；
3. 不输出 Payload 的原始 etcd 抽样验证 Envelope 前缀为 `k8s:enc:secretbox:v1:<keyName>:`；
4. 三个 API Server 的 Config Hash、Generation 和 Keyring 顺序一致。

只有全量 rewrite、对象计数、API canary、raw etcd Envelope 和三节点一致性全部通过，才允许结束该轮迁移。临时 `identity` fallback 必须在这些验证完成后从 Live Configuration 移除；旧 read key 也只能在证明当前 Catalog 已全部由新 writer 重写后从 Live Keyring 移除。只要任一保留 Snapshot/Object Version 仍依赖旧 key，其 Key Material 就必须继续封存在该 Snapshot 精确绑定的不可变 Recovery Bundle 与离线 Recovery Kit 中，并由 Restore Drill 证明可读，不能依据当前 Live Keyring 删除历史恢复能力。

etcd snapshot 与 Recovery Bundle 必须绑定 Config Hash、Generation 和该 Snapshot 所需的完整 Keyring。恢复时先恢复并验证 Keyring 与 EncryptionConfiguration，再接触 etcd 数据；缺少任一历史 Key 或配置证据时，不得启动 API Server 读取 Secret。

## 7. Volume、Ceph 与 Object Encryption

Volume 与 Ceph 的 dm-crypt/LUKS 安全语义由本节定义，物理 Storage Node 和 Rook-Ceph 拓扑由[基础设施与运维](../09-infrastructure-operations/infrastructure-operations-detail.md)定义。

`stateful-rwo-lowlatency` 的当前 Alibaba Provider Mapping 为每个环境使用独立专用 `Aliyun_AES_256` CMK，并启用 Deletion Protection；该 CMK 不与 OS、Ceph、Object、OpenBao Seal 或其他环境复用。Key 环境不匹配、Key 不可用、Provider 无法证明 Volume 已加密时，Provision/Ready Fail Closed；禁止回退默认 Key、Local PV、Ceph/NAS 或明文 Volume。RWO Volume 重挂前必须完成旧 Writer Detach/Fence，不能依赖新的 Attach 覆盖旧 Writer。

Host OSD 从首次 Provision 即设置 `encryptedDevice: "true"`，以 dm-crypt/LUKS 加密；既有明文 OSD 只能通过逐 OSD Replace、Backfill 与健康 Gate 迁移。Ceph `dmcrypt_key`、Lockbox 与 CephX 解锁链由 ceph-volume 和 MON 管理，不能声明由 OpenBao 托管。OS/MON 存储同样提供静态加密，恢复材料不得只存在于同一 Node 或 Disk。Go-live 前必须生成离线加密 Ceph Recovery Bundle，并验证 Node restart、Disk replace、MON quorum 故障与 Key recovery。

常规 RGW Bucket 通过每环境独立的 Transit Mount、Role、Policy 和 Key Domain 提供 SSE-S3；Transit Key 固定 `compatibility_mode=0`、不可导出且不允许 plaintext backup。OpenBao 以 Vault-compatible KMS 方式接入，必须在 DEV 完成 encryption API、Presigned Request、Checksum/Version、Multipart、Versioning、Object Lock、RGW restart、OpenBao seal/unseal、Token renew、Key rotation 和旧对象 recovery read 的兼容 Gate。任一关键用例、Transit 或 Agent 不可用时对象读写 Fail Closed，绝不回退明文；任何活跃 Object Version、Retention 或 Lock 仍需要的旧 Key Version 都不得 trim/delete。

`openbao-recovery` 不依赖同一 Transit 能力，使用离线 OpenPGP client encryption。其 Private Key 与 Passphrase 不进入任何在线系统、Cluster、OpenBao、Artifact 或日志。完整恢复顺序不可形成解密循环：

```text
Cluster 外 etcd snapshot + recovery bundle
→ 可读取 openbao-recovery 密文的 RGW base
→ 离线 OpenPGP 恢复 OpenBao
→ 恢复 Transit / SSE-S3 能力
→ 恢复 PostgreSQL、NATS、Artifact 与其他数据
```

各阶段都要验证环境绑定、对象版本、签名/校验和、Keyring/证书与 Audit 证据；验证失败时保持恢复冻结。PostgreSQL、NATS、Temporal 与对象版本的组件级恢复算法仍以[07](../07-data-messaging-storage/data-messaging-storage-detail.md)为准。

## 8. File 与 Image Security

File Security Worker 使用 [09 PCS](../09-infrastructure-operations/infrastructure-operations-detail.md)锁定的 ClamAV Engine/Image。Launch Profile 可使用单 Replica；Hardened Target 每环境运行 2 个 Replica、总并发为 4。两种 Profile 的单对象上限均为 100 MiB，`MaxScanSize=400 MiB`、`MaxRecursion=17`、`MaxFiles=10000`、`MaxScanTime=120s`，扫描结果固定为 `CLEAN`、`MALICIOUS`、`SUSPICIOUS` 或 `ERROR`。

每个 Scanner Replica 是带 `File Security Worker` 与 `clamd/freshclam` 的独立 StatefulSet Pod，通过 Pod 内 Unix Socket 调用，不暴露 ClamAV 网络服务。每副本使用独立 5 GiB RWO Signature PVC；ClamAV Container 的 Request/Limit 为 `1 CPU / 3 GiB` 与 `2 CPU / 6 GiB`，Worker Container 的 Request/Limit 为 `200m CPU / 256 MiB` 与 `1 CPU / 1 GiB`。Hardened Target 的两个副本以 Anti-Affinity/Topology Spread 分散，并设 `PDB minAvailable=1`。

`freshclam` 每 2 小时检查一次，并对副本使用受控随机 Jitter；数据库更新先验证签名、完整性和 Engine Load Test，再由 `clamd` Concurrent Reload。连续 6/12/24 小时未成功更新分别为 Warning/Critical/退出 Ready；超过 24 小时的副本不能返回 `CLEAN`，新对象保持不可用。`MaxThreads=2`、`MaxQueue=4`，单副本最多并发扫描 2 个对象；单副本故障时环境并发降至 2，由持久化异步队列承接任务。

需要扫描的对象只有在 Verdict 为 `CLEAN` 且扫描覆盖完整时才可进入可用业务状态；其余 Verdict、超限、超时、签名库不可用和覆盖不完整全部 Fail Closed。平台内部受信流程生成且类型受约束的纯文本 Spec、Plan、日志可以由版本化 Source/Media Policy 跳过扫描，但该决定由服务端生成并绑定 Artifact Source、Media Category 与 Policy Version，Frontend、Agent 或调用方不能声明可信，也不能把“跳过”记录为 `CLEAN`。扫描错误的有界重试、`SCAN_FAILED`、受控重新入队、Quarantine 不可绕过与 Artifact 业务状态由 [02](../02-requirement-workflow/requirement-workflow-detail.md)唯一拥有。文件上传配额、Object Version 与 Bucket Capacity 以[07](../07-data-messaging-storage/data-messaging-storage-detail.md)为准。

运行镜像必须具备可验证 provenance、SBOM、漏洞扫描和签名。部署 Gate 验证镜像 digest、签名身份、SBOM、扫描结论和 PCS 兼容性；不满足任一条件的镜像不得进入工作负载。镜像扫描结论和例外只记录受限摘要与证据引用。

Image Security 使用独立 Trivy 与 `ImageSecurityPort`，不复用 ClamAV、CI 或 Jenkins。Quarantine 中保存不可变 Manifest/List Digest；Scanner 使用 read-only、repository-scoped Registry Identity。Launch Profile 可使用单 Replica，Hardened Target 每环境运行 2 个 Replica；每副本单并发，CPU Request/Limit 为 `500m/2 CPU`，Memory Request/Limit 为 `1/4 GiB`，Ephemeral Storage Request/Limit 为 `10/20 GiB`。

独立 `trivy-data-sync` 以 6 小时周期更新 Vulnerability DB，以 24 小时周期更新 Java DB 与 Checks。Freshness Gate 为：Vulnerability DB 12/18/24 小时 Warning/Critical/Expired；仅对相关镜像启用的 Java DB 为 36/48/72 小时；Checks 为 48/72 小时/7 天。数据库过期、Coverage 不完整、Schema/Digest/Smoke Test 失败或 Scanner Error 均 Fail Closed。

Image Security 状态独立于 Build 状态：

```text
PENDING_SCAN → PASSED | BLOCKED | ERROR | EXPIRED
```

签名有效或 Build 成功都不能绕过扫描。不可绕过 Security Floor 包含 Trust/Provenance 失败、Coverage 不完整、Embedded Secret、Base OS EOL、CISA KEV 与 Critical Finding；High 默认 Block，仅允许对精确 Image Digest 与精确 Finding 建立限时、可审计 Exception，且不能覆盖上述 Floor。Image Security 不重新定义 03/04 的 Build 或 Sandbox 生命周期。

## 9. Audit、WORM 与 Break-glass

Audit 是独立的追加式不可篡改事实。任何需要 Audit 的受保护状态变更，只有在 Audit 与对应持久证据可靠提交后才能成功；Audit 容量无法覆盖扩容 Lead Time 时相关写操作 Fail Closed。Coverage 至少包括 Identity/认证因子重置、授权/配置、Requirement/Workflow/MR/Attempt、Secret/PKI、Archive/Restore/Delete、DLQ/Replay、Provider Feed、Break-glass、加密轮换、文件/镜像判定、工作负载安全异常和治理操作。平台、OpenBao、Provider 与 Kubernetes Audit 独立保存并可按 Correlation ID、环境和对象关联；任一来源都不能替代其他来源。

`audit-worm` 默认使用 365 天 `COMPLIANCE` Object Lock。本文唯一拥有 Audit Retention 期限、Legal Hold/调查冻结、策略级删除资格与不可缩短 Security Floor；任何身份都不能在 Retention 到期前删除、缩短或绕过锁定。Audit 正文不保存 Secret、密码、TOTP、Token、Private Key、完整 Presigned URL、Prompt 或源码。07 只拥有 Object Version、容量计入、精确删除执行与 Reconciler 机制，并且必须消费本文产生的资格，不能另行解释 Audit Retention 或 Legal Hold。

Break-glass 仅通过 01 的受限 Recovery Port 和 GitOps 锁定的一次性 Job/CLI 执行，不经过 Web 页面、普通平台 API 或直接数据库修改。它使用短期、最小化的高权限资格，必须给出原因、双 Audit 证据、执行范围和失效时间。无法建立审计双写、身份验证、受限范围或恢复证据时，Break-glass 不执行。

## 10. External Provider Trust Material

06 定义 External Provider Envelope 字段、签名验证顺序、Ingest 和 High-water 算法；本文只定义其信任材料。每个 Signing Key 精确绑定 Environment、Binding Kind、Binding ID Scope、Binding Generation 与 Collector Lineage，Private Key 保持在 Cluster 外受控边界，平台只持有验证所需的公开材料。

Key Lifecycle 为：

```text
ADD_NEW → CANARY → ACTIVE → VERIFY_ONLY → RETIRED / REVOKED
```

新增 Key 先在 CANARY 验证签名、Scope、时钟与回放防护，再进入 ACTIVE；旧 Key 在 VERIFY_ONLY 期间只用于验证既有输入，满足切换证据后进入 RETIRED 或 REVOKED。DR 恢复必须同时恢复并验证 Trust Store 与 06 所有 lineage 的 High-water Mark；它们不能静默清零，也不能以未知 Key 接受新的 Provider 输入。无法证明 Trust/High-water 连续性时 Feed 固定为 `UNKNOWN`，并按 06 Contract 建立受控新 Lineage，绝不重置既有 Lineage 的 High-water。

Console 的预注册链接、允许列表、目标认证与打开 Audit 由 06 的 `ConsoleAccessPort` 定义。本文只保证 Console Access 不会获得 Secret、Private Key、Cloud Admin Credential 或跨环境信任材料。

## 11. 不变量

1. 每个环境的 OpenBao、PKI、Keyring、Transit、Audit、Trust Store 与恢复材料相互独立。
2. Secret 只通过最小权限 Workload Identity 与 Pod 内存文件短期分发，不进入任何持久化或可观测性载体。
3. 数据服务只接受当前环境、当前用途的受信任传输身份和最小访问身份，不能以网络可达或单一凭据替代完整授权链。
4. 新 Kubernetes Cluster 禁止 identity provider；secretbox 轮换和恢复始终先完成一致 Keyring/配置验证。
5. OpenBao 恢复 Bucket 不依赖待恢复的 OpenBao Transit，离线 OpenPGP 是其唯一解密根。
6. Audit WORM、双写证据与 Break-glass 限制始终优先于高权限操作便利性。
7. Provider 信任材料、环境绑定与回放证据必须在恢复后保持连续、可验证和可审计。
8. Launch 与 Hardened Target 使用相同 Security Floor；Replica、Quorum、完整轮换自动化和更高 DR 频率只能增强可用性，不能改变已启用能力的安全通过条件。
