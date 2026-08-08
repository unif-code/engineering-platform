# 安全、审计与治理

> 实施阶段、Capability 激活状态、Release 验收与 Reliability/Capacity Profile 选择见[实施路线图](./12-implementation-roadmap.md)。

## 目标与边界

本主题定义平台的完整安全 Target Architecture：Trust Boundary 与不可降级 Security Floor、身份材料保护、Secret 与 Workload Identity、OpenBao 与 Agent Injector、PKI 与 Trust Bundle、数据服务的传输/服务身份/最小访问、Kubernetes API 与 Volume/Ceph/Object 的静态加密、供应链与文件/镜像扫描机制、External Provider 信任材料、不可篡改 Audit 与受限 Break-glass 恢复。本文的控制域即上述六类：身份材料保护、Secret 与 Workload Identity、PKI 与传输信任、数据服务访问、数据静态加密、审计与供应链；Cluster、PCS、DR、容量与运维观测属于[基础设施与运维](./09-infrastructure-operations.md)。

本文为各业务模块与基础设施提供统一的安全 Contract，却不拥有人员、权限、Requirement、Agent、Sandbox、GitLab 或数据服务的领域状态：身份、Session、Capability 与 Super Admin 语义属于 [01](./01-identity-organization-authorization.md)，Console Access、External Provider Envelope 与 Ingest 算法属于 [06](./06-platform-application-integration.md)，Configuration 生命周期与 Promotion 属于 [10](./10-configuration-governance.md)，数据服务拓扑、数据语义与组件恢复属于 [07](./07-data-messaging-storage.md)。完整归属见 [README 所有权矩阵](./README.md#事实所有权矩阵)。DEV 与 PROD 使用同源代码、Contract、GitOps 与 PCS 在独立 Account、VPC 与 Cluster 中实例化，不共享运行实例、Session、数据、凭据、密钥或故障域；实际 Trust、Image、配置、拓扑与恢复证据由环境 GitOps Desired State、PCS、Audit 与 Restore Drill 证明。

精确参数不在正文：OpenBao、Agent Injector、File/Image Scanner 的 Replica、资源、PVC、阈值、Snapshot 调度与 DR 目标见[参数附录的组件资源包络](./appendix-parameters.md#组件资源包络)，Scanner 的单对象安全 Envelope 与引擎上限见[参数附录](./appendix-parameters.md#platform-policy-key)，扫描投递的结构化异常终态见[参数附录的错误码](./appendix-parameters.md#错误码)。

## 核心模型

### Security Floor

```text
Human / Workload Identity
  → 最小权限 Capability 或 Workload Policy
  → 短期凭据、受限网络与加密存储
  → 可验证的 Audit、告警与恢复证据
```

下列控制是所有已启用 Capability 的不可降级 Security Floor，与 Replica 数、HA 或 Hardened Profile 无关：

| 控制 | 最低判定 |
| --- | --- |
| Human Identity | 本地账号 Password 使用 Argon2id、独立 salt 与受保护 pepper；TOTP、Session、撤销和服务端授权按 [01](./01-identity-organization-authorization.md) Contract 执行。 |
| Secret | Secret、Token、Private Key 和认证材料不进入普通 Environment Variable、镜像、Git、Artifact、PV、日志、Trace、Metric 或 Audit 正文；只经最小权限 Workload Identity 注入 Pod `tmpfs` 内存文件。 |
| Transport and identity | Browser、Gateway、Workload 与数据服务使用 TLS/mTLS、目标验证、环境/用途隔离的身份和最小权限；身份或吊销状态未知时 Fail Closed。 |
| Audit | 受保护写入、高权限动作、配置、安全判定与恢复形成可靠、追加式、可关联且受 WORM 保护的 Audit。 |
| Supply chain | 运行镜像绑定 provenance、SBOM、签名、漏洞扫描和精确 digest；Coverage 或判定未知时阻止部署。 |
| Recovery | 密钥、Trust Store、Backup、Manifest、对象版本、恢复顺序和真实 Restore 结果可验证；不能通过清空回放状态或放宽安全判定恢复服务。 |

Launch Profile 可以对 OpenBao、PKI Publication、File/Image Scanner 采用单实例并允许单点故障时安全停止，但仍必须满足上表全部判定、硬 Resource Limit、Cluster 外 Backup 与真实 Restore。OpenBao 多 Voting Server、完整 PKI 轮换自动化、Scanner 多副本与更高频率 DR 属于 Hardened Target；这些增强提高连续性与恢复目标，不为任何已启用能力创建较弱安全模式。

### 数据服务访问 Contract

本文拥有下列数据服务的传输、工作负载身份与最小访问，[07](./07-data-messaging-storage.md) 拥有其拓扑、数据语义与恢复；两侧共同成立才构成可用的数据面。

| 数据服务 | 本文拥有的传输与身份边界 |
| --- | --- |
| PostgreSQL / PgBouncer | 应用到 PgBouncer、PgBouncer 到 PostgreSQL、受控直连、复制、备份与监控路径全部启用 TLS 并校验受信任 CA、目标主机名与证书有效性，内部服务与复制/管理路径按各自 PKI Role 使用 mTLS；禁止明文与 `sslmode=disable/allow/prefer`，普通应用没有绕过 Pooler 直连 `rw` Service 的网络路径；每个服务、Schema、环境与用途使用独立 Runtime Role 且只获得目标 Schema 所需 DML，Alembic/Schema Job 使用短生命周期 DDL Identity |
| Valkey | Client、Primary/Replica 复制与 Sentinel 通信只开放 TLS 端口并强制 mTLS，Server/Client/Replication/Sentinel/Monitoring 使用隔离的证书用途与服务身份；关闭明文数据端口与 `default` User，每个用途使用独立 ACL User；普通身份只允许业务需要的命令与 Key Prefix，拒绝 `CONFIG`、`MODULE`、`DEBUG`、`FLUSHALL`、`FLUSHDB`、`SHUTDOWN`、`REPLICAOF` 与 ACL 管理等高风险能力 |
| NATS JetStream | Client Port 与 Cluster Route 全部使用 TLS，Client 同时要求受信任 mTLS Workload Certificate 与独立 NKey Challenge，Route 使用单独 Route Certificate 完成 mTLS；`PLATFORM` 与 `SYS` Account 隔离且不使用默认全局 `$G`，业务身份不能访问 `$SYS.>` 而系统身份不能发布平台业务 Subject；每个 Deployable Unit 使用独立 NKey User 与 Publish/Subscribe Allowlist，默认拒绝跨领域通配符、不必要的 `$JS.API.>` 及 Stream/Consumer 管理权限；NKey Public Key、Account 与 Permission 是版本化 GitOps 配置，Seed 只保存在 OpenBao 并以内存文件注入 |
| Temporal | Internode 与 Frontend 分别启用 mTLS、目标主机名校验与证书用途隔离，Frontend 固定 `requireClientAuth=true` 且 `internal-frontend=false`，NetworkPolicy 只允许 Server 成员、Orchestrator Client/Worker、只读 Operations Adapter 与受控一次性 Job；固定 `claimMapper=default` 与 `authorizer=default` 而禁止 `noopAuthorizer`、`nopAuthority` 或仅凭 mTLS 放行；`ServiceIdentityPort` 签发由 OpenBao Transit 保护的短期 Machine JWT（默认 TTL `10min`、最大 `30min`），并校验 Issuer、Audience、Subject、JTI、Expiry 与 `<namespace>:read\|write\|worker\|admin` Claim；每环境独立创建逻辑名为 `engineering-platform` 的 Temporal Namespace，Orchestrator Client、SDK Worker、只读 Operations Adapter 与一次性 Admin Job 分别使用 `write`、`worker`、`read` 与受控 `admin` 身份 |

### PKI 与证书层级

```text
离线 Organization Root：ECDSA P-384 / SHA-384，10 年
  └── 环境独立 Online Intermediate：P-256，3 年
        └── Gateway 与 Workload Leaf：P-256
```

OpenBao PKI 提供环境内证书签发，cert-manager 负责 Kubernetes 工作负载证书生命周期。TLS、受信 Root、环境隔离 Issuer、叶证书更新与吊销可验证性属于 Security Floor；双 Root/双链重叠、完整 CRL/OCSP Publication 冗余与全自动覆盖验证属于 Hardened Target，尚未采用完整自动化时仍必须在证书过期、吊销状态或 Trust Bundle 不可证明时 Fail Closed。

### 加密与恢复顺序

环境的根信任、密钥环、恢复材料与数据恢复必须组成可验证链：先恢复能够验证和解密控制面的外部材料，再恢复 OpenBao 与数据服务，最后开放工作负载。完整顺序不可形成解密循环：

```text
Cluster 外 etcd snapshot + recovery bundle
→ 可读取 openbao-recovery 密文的 RGW base
→ 离线 OpenPGP 恢复 OpenBao
→ 恢复 Transit / SSE-S3 能力
→ 恢复 PostgreSQL、NATS、Artifact 与其他数据
```

任何缺失的信任、密钥环、签名或 Audit 条件都会阻止受保护服务重新开放；PostgreSQL、NATS、Temporal 与对象版本的组件级恢复算法以 [07](./07-data-messaging-storage.md) 为准。Volume 与 Ceph 的 dm-crypt/LUKS 安全语义由本文定义，物理 Storage Node 与 Rook-Ceph 拓扑由 [09](./09-infrastructure-operations.md) 定义。

### 生命周期状态集

```text
Provider Signing Key：ADD_NEW → CANARY → ACTIVE → VERIFY_ONLY → RETIRED / REVOKED
Image Security：      PENDING_SCAN → PASSED | BLOCKED | ERROR | EXPIRED
```

Image Security 状态独立于 Build 状态；文件扫描 Verdict 固定为 `CLEAN`、`MALICIOUS`、`SUSPICIOUS` 或 `ERROR`。

## 关键不变量

- 认证材料、Secret、Private Key、短期访问材料、Prompt 与源码正文（密码、临时密码、TOTP Code/Secret、Session Cookie、Access/Refresh Token、完整 Presigned URL 等）不得进入 Frontend Bundle、Browser 持久化存储、客户端日志与错误提示，也不得进入应用日志、Trace 属性、Metric Label、告警标签、外部状态 Envelope、Audit 正文、普通 Artifact、Git、镜像层或非受控对象元数据；Audit 与 Telemetry 只允许不可逆引用、受限摘要、结果、版本、时间与 Correlation ID，排查时使用受权的目标系统查询而不复制敏感原文——可重放的凭据一旦进入这些载体就再也收不回来。
- 本地账号密码使用 Argon2id、每个密码独立 salt 与由 OpenBao 提供的 pepper，平台只保存受保护的派生验证结果——哈希强度与 pepper 隔离共同决定离线破解成本。
- 安全控制失去可信前提时受保护操作 Fail Closed，诊断可见性不会被当作安全或业务事实——不可证明的安全状态必须按不安全处理。
- 所有安全例外、恢复操作、Provider 信任材料变化与高权限动作都产生独立、追加式 Audit——没有独立证据的高权限动作等于没有经过审批。
- Launch 与 Hardened Target 使用相同 Security Floor，Replica、Quorum、完整轮换自动化与更高 DR 频率只增强可用性与恢复目标，不改变已启用能力的安全通过条件——冗余不是安全豁免。
- 每个环境的 OpenBao、PKI、Keyring、Transit、Audit、Trust Store 与恢复材料相互独立——环境是信任域，跨环境复用会让一次失陷扩散到全部环境。
- Kubernetes Auth 为每个服务建立独立 ServiceAccount、Auth Role 与最小权限 Policy 并精确绑定 Namespace 与 ServiceAccount，Workload 使用 `audience=openbao` 的 projected ServiceAccount Token 且 OpenBao 只以本环境最小权限 TokenReview 验证；不接受默认 Audience、长期 ServiceAccount Token 或跨环境身份，平台也不提供集中高权 Token Broker，更不把平台 API 变成 Secret 转发通道——受众受限的短期身份加上没有转发通道，才能让 Secret 读取范围与工作负载职责一一对应。
- Secret 只按工作负载、环境与用途最小化分发，并只经最小权限 Workload Identity 注入 Pod `tmpfs` 内存文件、以文件权限限制读取者，进程退出、Pod 销毁或 Lease 失效时随运行时清除；Workload 必须使用自身 Kubernetes Identity 取得短期 Token 而不共享人类或其他服务的 Token，业务代码、镜像、Git、Artifact、普通环境变量与持久卷都不是 Secret 载体——分发范围就是泄露范围，内存文件与短期租约让凭据不长于使用它的进程。
- 各环境的 Workload Token 是短期凭据（默认 TTL `1` 小时），续期与撤销严格受所属 Auth Role/Policy 控制，注入的 Agent Sidecar 计入所属业务 Workload 而不计入 Server 或 Injector 容量——短 TTL 把凭据泄露的时间窗压到最小。
- OpenBao 使用 Integrated Storage（Raft），不以 PostgreSQL 或业务数据服务作为 Storage Backend，精确版本/digest 由 [09](./09-infrastructure-operations.md) 的 PCS 锁定且不使用浮动 Tag——Secret 存储不能依赖它自己要保护的数据服务。
- Hardened Target 的 Voting Server 副本数固定且不使用 HPA，同一时刻只有一个 Active、其余为满足 quorum 的同步 Standby 并以 Anti-Affinity 与 Topology Spread 分散；资源变化经 GitOps 逐节点执行并重新验证 quorum、Raft Catch-up、PKI、Snapshot 与故障切换，Raft Data 与 Audit 使用分离的低延迟、非共享、支持在线扩容的 SSD RWO PVC 且只扩不缩，Launch 单实例同样必须在 PCS 中声明硬 Request/Limit 与 PVC Ceiling——quorum 的确定性不能交给弹性伸缩，Secret 与其审计也不能因磁盘写满而同时失效。
- OpenBao API/UI Listener 只启用 TLS 1.2/1.3 并以 ClusterIP 暴露：`8200` 仅允许 Agent Injector、批准的 Workload、受控运维与备份入口访问，`8201` 仅允许 OpenBao Pod 之间的 Raft/Cluster mTLS；Sandbox、Browser 与未登记 Namespace 均无网络路径，明文 Listener、NodePort、LoadBalancer 与公网暴露一律禁止——Secret 服务的可达面必须最小且可枚举。
- 基础 Credential Provider 使用按服务、用途、Schema 与环境隔离的静态最小权限数据库凭据并由 Agent Injector 写入 `tmpfs`，Deployment、Helm Values、ConfigMap 与 Environment Variable 不保存凭据；动态数据库凭据作为独立演进只替换 `SecretManagerPort`/credential provider、轮换与连接重建实现，不改变领域模块、数据库 owner 或授权语义——凭据形态演进必须与业务语义解耦。
- 每个环境采用 Shamir `5/3` 初始化且没有外部 Seal KMS/HSM；当前全部分片由同一保管人暂管是明确的治理例外而不构成多人制衡，交接、盘点、使用与变更都必须写入独立 Audit——把例外写明并留证，才不会被误当作已实现的制衡。
- OpenBao Root Token 不作为日常服务凭据，Root 操作与 `snapshot-force` 只能由受控 Break-glass 身份在批准的恢复窗口执行，CronJob 与普通运维身份没有该权限——最高权限必须罕见、有理由且可审计。
- OpenBao Audit 同时写入独立 Audit PVC 与 stdout 两个以 HCL/GitOps 声明的 `file` Device，均采用 JSON、`log_raw=false` 与 HMAC 保护；一个 Device 非阻塞失败而另一个成功记录时请求可继续，两个 Device 都无法记录时请求 Fail Closed，本地缓冲不是长期权威归档而归档写入 `audit-worm`——审计双写让单点磁盘故障不至于既丢证据又停服务。
- OpenBao 恢复使用应用一致性 Raft Snapshot 而不以多个 PVC/CSI Snapshot 充当恢复来源，升级与高风险 Auth、Policy、Secret Engine、Seal、Shamir 或 Transit Key 变更前必须生成并验证按需 Snapshot；每份 Manifest 绑定 Environment、Cluster ID、Snapshot Time、OpenBao/Chart/Image Version、Raft Index、Seal Generation、独立的 Shamir Share Generation、Object Version、Size、SHA-256 与 OpenPGP Recipient Fingerprint，其中 Seal Generation 与 Shamir Share Generation 是两个不得合并、互相推导或互相替代的字段；Shamir 轮换后立即生成并验证新 Snapshot，旧 Generation 的 Share 保留到与其一一绑定的最后一份 Snapshot 到期且 Restore 验证通过；Backup、Restore 与恢复演练本身是 Security Floor，其调度、保留、Object Lock、阈值与演练周期都是版本化 GitOps 运维配置而管理后台只读展示有效值与证据——两个 Generation 混淆或提前销毁旧分片都会让历史恢复能力静默消失，而未经演练的恢复能力不能被声明为存在。
- Root Private Key 保持离线，每个环境只使用自己的 Intermediate、签发策略、CRL 与证书库存；公开 Root Bundle 是经 GitOps 审核、版本化并绑定 digest/review evidence 的 PKI Artifact，`TrustBundlePort` 只分发公开材料而不分发 Private Key、Token、Intermediate 或可签发凭据；证书过期、吊销状态或 Trust Bundle 不可证明时受控 mTLS Client Fail Closed 而不降级为跳过校验，PKI 发行与吊销均记录证书标识、用途、环境、Issuer、时间、结果与 Correlation ID——离线根与只读分发让信任传播不携带签发能力，而未知的吊销状态必须按已吊销处理。
- Gateway 叶证书有效期 `30` 天并提前 `10` 天进入轮换窗口，每次续签固定 `privateKey.rotationPolicy=Always` 以生成新的 Leaf Private Key，且证书签发、Secret 更新、Gateway 热加载与实际对外 Serial/SAN/Chain/有效期形成可观测闭环；Full CRL 每 `24` 小时发布并最多给予 `6` 小时受控传播宽限，OCSP 响应有效期 `4` 小时且不使用 Delta CRL，紧急吊销在 Revocation 可靠提交后立即 rotate/publish Full CRL 并验证签名、Issuer、Serial 状态与实际发布内容——复用私钥的"轮换"不降低泄露影响，而吊销只有被消费者真正看到之后才生效。
- Root 或 Intermediate 轮换使用双 Root/双链重叠：先发布新旧 Root Bundle 并验证 Node、Workload、Runtime 与受控终端的分发覆盖，再切换新 Intermediate/Leaf Chain；旧 Issuer 保持只读 CRL/OCSP 能力，直到全部相关 Leaf、缓存窗口与安全缓冲结束且无消费者证据后才退役——先切换后验证会让未更新的消费者立刻失去信任链。
- 公开 CRL、OCSP 与证书链只经只读 `pki-publication` 发布：它不持有 OpenBao Token、Kubernetes Secret、CA/Leaf Private Key 或签发/吊销权限，Gateway 只允许精确 `/.well-known/pki/` 状态路径与协议规定的方法并拒绝 Cookie、Authorization、Session、未知 Issuer、超限请求与非 PKI 路径——发布面必须窄到即使被攻破也无法签发。
- 数据服务只接受当前环境、当前用途的受信任传输身份与最小访问身份，证书、Database Role、ACL User、NKey、Machine JWT、Secret 路径与运维身份不跨环境或用途复用，Runtime、DDL、备份、复制、监控与运维/Break-glass 身份彼此隔离且不得互相替代（Break-glass 身份默认不可用）；证书与身份轮换只允许短时新旧重叠并在验证新身份后立即吊销旧身份；身份、证书、授权或吊销状态不可证明时连接 Fail Closed，禁止回退明文、匿名、default user 或共享高权限凭据——网络可达或单一凭据都不能替代完整授权链，长期并存的旧身份等于长期敞开的备用入口。
- 数据服务的客户端与北向入口只使用普通 ClusterIP，同组件 StatefulSet 的 Route、Internode 或 Peer Discovery 可以使用 `clusterIP: None` 的 Headless Service 与稳定 Pod DNS，但只开放成员端口并同时受 mTLS、成员身份校验与双向 default-deny NetworkPolicy 限制；所有数据服务禁止 NodePort、LoadBalancer 与公网暴露，并按当前 Environment、Deployable Unit、用途与协议端口精确放行；Sandbox、Browser、Agent 与普通用户都不获得数据服务的网络路径、证书、NKey、Machine JWT 或 Admin Credential——成员发现的需要不应带来额外的外部暴露面，不可信执行面与人类客户端也不应直接触达数据面。
- 每个环境使用独立 CSPRNG 生成的 `32-byte` `secretbox` key 并仅在 `EncryptionConfiguration.secret` 字段以 Base64 表示，EncryptionConfiguration Schema 固定为 `apiserver.config.k8s.io/v1`，全部当前 Active API Server 的有序 Keyring、Resource Catalog、Provider 顺序与内容哈希必须一致，启动前 Pre-start Gate 验证 `--encryption-provider-config`、Schema、Catalog、Keyring、配置哈希、generation、文件权限与恢复材料完整性，成员扩容或替换必须先通过同一 Gate 并与现有成员达成一致；全新 Cluster 完全不配置任何 identity provider，`identity` 只允许作为既有明文迁移期间的最后临时读 fallback 且永不作为 writer，并在验证完成后从 Live Configuration 移除——不一致的 Keyring 会让部分 Secret 在部分节点不可读，而可写的 identity provider 等于把 Secret 明文写回 etcd。
- `Sensitive API Resource Catalog` 至少包含 `secrets` 与 `configmaps`，只在数据分类、API Discovery 与资源标识校验后加入确实承载敏感 Payload 的 CRD，并使用官方精确小写复数 `resource` 或 `resource.group` 标识（例如 `widgets.example.io`）而不使用 Kind、API Version、模糊业务名称或 `*.*` Wildcard；Catalog、CRD 或 Provider 的改变属于新的 PCS/GitOps 变更，不能由平台后台动态修改——加密范围必须精确、可枚举且可审核。
- 新 Key 必须加入同一 provider array 中现有 `secretbox` provider 的同一个 `keys` 数组，先作为第二个 read candidate 再提升为第一个 writer，变更通过原子文件替换逐台 Drain、restart、verify，禁止各 API Server 使用不同 Keyring 或并行写配置——顺序错误会产生用当前 Keyring 无法解密的对象。
- 每次配置、Catalog 或 Keyring 变更都先生成 `BACKUP_VERIFIED` Pre-change etcd Snapshot，且该 Snapshot 只绑定变更时实际 Effective 的 Provider 顺序、Active Writer、完整 Read Keyring、Catalog、Config Hash 与不可变 Recovery Bundle ID；包含新 Key 或下一阶段顺序的 Candidate Bundle 必须使用不同 Bundle ID 并标记 `PENDING`，不能绑定到 Pre-change Snapshot 也不能在对应配置生效前冒充 Effective Recovery Bundle——快照与其解密材料必须一一对应。
- 每次 Keyring 轮换与恢复都执行 Sensitive Catalog 的全量幂等 rewrite，并验证 API read 与 canary write/read 成功、预期对象数量与重写计数一致、不输出 Payload 的原始 etcd 抽样 Envelope 前缀为 `k8s:enc:secretbox:v1:<keyName>:`、全部 Active API Server 的 Config Hash/Generation/Keyring 顺序一致；只有全部通过才允许结束该轮迁移，旧 read key 也只能在证明当前 Catalog 已全部由新 writer 重写后移出 Live Keyring——只有全量重写被证明，旧 Key 才可能安全退出。
- 只要任一保留 Snapshot/Object Version 仍依赖旧 key，其 Key Material 就必须继续封存在该 Snapshot 精确绑定的不可变 Recovery Bundle 与离线 Recovery Kit 中并由 Restore Drill 证明可读；恢复时先恢复并验证 Keyring 与 EncryptionConfiguration 再接触 etcd 数据，缺少任一历史 Key 或配置证据时不得启动 API Server 读取 Secret——按当前 Live Keyring 清理历史密钥会静默销毁恢复能力。
- `stateful-rwo-lowlatency` 的当前 Alibaba Provider Mapping 为每个环境使用独立专用 `Aliyun_AES_256` CMK 并启用 Deletion Protection，该 CMK 不与 OS、Ceph、Object、OpenBao Seal 或其他环境复用；Key 环境不匹配、Key 不可用或 Provider 无法证明 Volume 已加密时 Provision/Ready Fail Closed，禁止回退默认 Key、Local PV、Ceph/NAS 或明文 Volume，RWO Volume 重挂前还必须完成旧 Writer 的 Detach/Fence——加密边界必须与故障域一致，而依赖新 Attach 覆盖旧 Writer 会同时破坏数据与其完整性证据。
- Host OSD 从首次 Provision 即设置 `encryptedDevice: "true"` 以 dm-crypt/LUKS 加密，既有明文 OSD 只能通过逐 OSD Replace、Backfill 与健康 Gate 迁移；Ceph 的 `dmcrypt_key`、Lockbox 与 CephX 解锁链由 ceph-volume 与 MON 管理而不能声明由 OpenBao 托管，OS/MON 存储同样提供静态加密且恢复材料不得只存在于同一 Node 或 Disk，Go-live 前必须生成离线加密 Ceph Recovery Bundle 并验证 Node restart、Disk replace、MON quorum 故障与 Key recovery——恢复材料与被保护数据同处一地等于没有恢复材料。
- 常规 RGW Bucket 通过每环境独立的 Transit Mount、Role、Policy 与 Key Domain 提供 SSE-S3，Transit Key 固定 `compatibility_mode=0`、不可导出且不允许 plaintext backup，OpenBao 以 Vault-compatible KMS 方式接入并必须在 DEV 通过 encryption API、Presigned Request、Checksum/Version、Multipart、Versioning、Object Lock、RGW restart、seal/unseal、Token renew、Key rotation 与旧对象 recovery read 的兼容 Gate；任一关键用例、Transit 或 Agent 不可用时对象读写 Fail Closed 且绝不回退明文，任何活跃 Object Version、Retention 或 Lock 仍需要的旧 Key Version 都不得 trim/delete——密钥不可导出与不可提前销毁共同保证对象长期可读且不可外流。
- `openbao-recovery` 不依赖同一 Transit 能力而使用离线 OpenPGP client encryption，其 Private Key 与 Passphrase 不进入任何在线系统、Cluster、OpenBao、Artifact 或日志；恢复各阶段都验证环境绑定、对象版本、签名/校验和、Keyring/证书与 Audit 证据，验证失败时保持恢复冻结——离线 OpenPGP 是打破"用待恢复系统解密其自身恢复材料"这一循环的唯一根。
- 需要扫描的对象只有在 Verdict 为 `CLEAN` 且扫描覆盖完整时才可进入可用业务状态，其余 Verdict、超限、超时、签名库不可用与覆盖不完整全部 Fail Closed；平台内部受信流程生成且类型受约束的纯文本 Spec、Plan、日志可以由版本化 Source/Media Policy 跳过扫描，但该决定由服务端生成并绑定 Artifact Source、Media Category 与 Policy Version，Frontend、Agent 与调用方都不能声明可信，"跳过"也不得记录为 `CLEAN`——未完成的检查不能被解释为通过，可信来源必须由服务端判定、可回溯，更不能伪装成已检查。
- File Security Worker 与 `clamd/freshclam` 位于同一 Pod 并只经 Unix Socket 调用而不暴露 ClamAV 网络服务，签名库更新先验证签名、完整性与 Engine Load Test 再由 `clamd` 并发 Reload，超过陈旧上限的副本不能返回 `CLEAN` 且新对象保持不可用，单副本故障时环境并发下降但任务由持久化异步队列承接；扫描错误的有界重试、结构化异常终态、受控重新入队、Quarantine 不可绕过与 Artifact 业务状态由 [02](./02-requirement-workflow.md) 拥有，上传配额、Object Version 与 Bucket Capacity 以 [07](./07-data-messaging-storage.md) 为准——过期引擎给出的"干净"结论没有意义，而扫描机制与业务状态必须分属不同 owner。
- 运行镜像必须具备可验证 provenance、SBOM、漏洞扫描与签名，部署 Gate 验证镜像 digest、签名身份、SBOM、扫描结论与 PCS 兼容性且不满足任一条件的镜像不得进入工作负载，扫描结论与例外只记录受限摘要与证据引用；签名有效或 Build 成功都不能绕过扫描——通过 Gate 的唯一方式是真的被扫描过。
- Image Security 使用独立 Trivy 与 `ImageSecurityPort` 而不复用 ClamAV、CI 或 Jenkins，Quarantine 保存不可变 Manifest/List Digest，Scanner 使用 read-only、repository-scoped Registry Identity；Vulnerability DB、Java DB 与 Checks 按固定周期更新并设置 Warning/Critical/Expired 三级 Freshness Gate，数据库过期、Coverage 不完整、Schema/Digest/Smoke Test 失败或 Scanner Error 均 Fail Closed——扫描器只需读取镜像，而陈旧漏洞库的通过结论是虚假的安全感。
- 不可绕过的镜像 Security Floor 包含 Trust/Provenance 失败、Coverage 不完整、Embedded Secret、Base OS EOL、CISA KEV 与 Critical Finding，High 默认 Block 且只允许对精确 Image Digest 与精确 Finding 建立限时、可审计 Exception 而不能覆盖上述 Floor；Image Security 不重新定义 [03](./03-agent-skill-model.md)/[04](./04-sandbox-runtime.md) 的 Build 或 Sandbox 生命周期——例外必须精确、限时，否则会退化为常态。
- 任何需要 Audit 的受保护状态变更只有在 Audit 与对应持久证据可靠提交后才能成功：平台 Audit 的可靠提交点是与领域事实同一 PostgreSQL 事务的持久化提交（见[平台应用与集成](./06-platform-application-integration.md)），OpenBao 等独立来源以其自身 Audit Device 成功记录为准，WORM 归档不是业务成功的同步前置——证据与事实同事务提交，异步归档才不会阻塞业务。
- Audit Coverage 至少包括 Identity/认证因子重置、授权/配置、Requirement/Workflow/MR/Attempt、Secret/PKI、Archive/Restore/Delete、DLQ/Replay、Provider Feed、Break-glass、加密轮换、文件/镜像判定、工作负载安全异常与治理操作；平台、OpenBao、Provider 与 Kubernetes Audit 独立保存并可按 Correlation ID、环境与对象关联，任一来源都不能替代其他来源——多来源独立留证才能在单一系统被篡改时交叉验证。
- `audit-archiver` 以 at-least-once 语义异步归档：对象键由 Audit 事实唯一 ID 与内容哈希构成，使重试与重放收敛为同一 WORM 对象，只追加而不修改或删除既有对象，并维护可观测的归档 Watermark 与积压深度——幂等对象键让重试不产生重复证据。
- 归档积压、来源缓冲余量或 `audit-worm` 容量任一按当前扩容 Lead Time 无法覆盖时进入 Critical 告警并使相关受保护写操作 Fail Closed；归档失败不回滚已提交的业务事务而只阻止后续受保护写入，归档链随 `audit-worm` 所属 Object Storage Capability 激活启用，激活前权威 Audit 事实由 PostgreSQL 事实及其 Backup 链保留——不能被记录的动作不允许发生，但已成立的事实不能被撤销。
- `audit-worm` 默认使用 365 天 `COMPLIANCE` Object Lock；Audit Retention 期限、Legal Hold/调查冻结、策略级删除资格与不可缩短的 Security Floor 都由本文判定，任何身份都不能在 Retention 到期前删除、缩短或绕过锁定，[07](./07-data-messaging-storage.md) 只拥有 Object Version、容量计入、精确删除执行与 Reconciler 机制并必须消费本文产生的资格——审计保留期由安全 owner 单方判定，执行方不得另行解释。
- Audit 是独立于业务投影与 Telemetry 的追加式不可篡改事实，只关联身份、时间、环境、目标、动作、结果、原因、版本与 Correlation ID，不保存 Secret、密码、TOTP、Token、Private Key、完整 Presigned URL、Prompt 或源码，其 WORM 保存策略也不由业务归档或对象逻辑删除替代——审计要能追责，但不能把访问材料复制成新的泄露面。
- Break-glass 仅通过 [01](./01-identity-organization-authorization.md) 的受限 Recovery Port 与 GitOps 锁定的一次性 Job/CLI 执行，不经 Web 页面、普通平台 API 或直接数据库修改，并必须给出原因、双 Audit 证据、执行范围与失效时间；无法建立审计双写、身份验证、受限范围或恢复证据时 Break-glass 不执行——最高权限路径必须又窄又留证。
- 平台只读展示安全、配置、轮换、过期与恢复证据，管理后台不提供云资源、Kubernetes、Secret 或恢复材料的通用写入口，Console Access 也不会获得 Secret、Private Key、Cloud Admin Credential 或跨环境信任材料；Super Admin 的配置权限与带外恢复资格由 [01](./01-identity-organization-authorization.md) 判定，Policy 发布过程由 [10](./10-configuration-governance.md) 约束——只读展示与受控入口都不应升级为基础设施管理面。
- 每个 Provider Signing Key 精确绑定 Environment、Binding Kind、Binding ID Scope、Binding Generation 与 Collector Lineage，Private Key 保持在 Cluster 外受控边界而平台只持有验证所需的公开材料；新增 Key 先在 CANARY 验证签名、Scope、时钟与回放防护再进入 ACTIVE，旧 Key 在 VERIFY_ONLY 期间只用于验证既有输入并在满足切换证据后进入 RETIRED 或 REVOKED——验证方不需要签名能力，重叠期让轮换既不中断验证也不放宽验证。
- DR 恢复必须同时恢复并验证 Trust Store 与 [06](./06-platform-application-integration.md) 所有 lineage 的 High-water Mark，二者不能静默清零，也不得以未知 Key 接受新的 Provider 输入；无法证明 Trust/High-water 连续性时 Feed 固定为 `UNKNOWN` 并按 06 Contract 建立受控新 Lineage，绝不重置既有 Lineage 的 High-water——单调序列是重放与回滚攻击的唯一有效防线。

## 与其他模块的关系

下表是本模块自身视角：08 从各模块消费什么、向各模块提供什么。各模块的完整 Contract 由其自身定义，本文不复制其状态、参数或协议字段。

| 模块 | 消费 | 提供 |
| --- | --- | --- |
| [00 平台总览](./00-platform-overview.md) | 模块边界、依赖方向与端到端责任链约定 | 责任链各环节共同遵守的 Trust、Secret、加密、供应链、Audit 与 Break-glass 的 Fail Closed Contract |
| [01 身份、组织与授权](./01-identity-organization-authorization.md) | 本地身份、Session、Capability、Super Admin 与受限 Recovery Port 语义，以及本领域相关的 Audit Trigger 与业务摘要 | 密码 pepper 与认证材料保护、Audit Envelope、可靠提交、脱敏、WORM、Retention 与安全恢复 Contract，以及 Break-glass 的执行边界 |
| [02 Requirement Workflow](./02-requirement-workflow.md) | 需要扫描的 Source/Media 判定输入、Artifact 业务状态与扫描分支归属 | 文件扫描机制与 Verdict 语义、Object Lock、Audit Envelope、脱敏与保留 Contract |
| [03 Agent、Skill 与 Model](./03-agent-skill-model.md) | 本领域的 Audit Trigger（Binding、状态转换、模型回退、取消、权限吊销）与业务摘要 | Secret 注入、Audit Envelope、脱敏与保留 Contract |
| [04 Sandbox Runtime](./04-sandbox-runtime.md) | 本领域的 Audit Trigger（物化、Lease、Fence、凭据吊销、清理结果）与业务摘要 | Secret 与 Lease 事实、`tmpfs` 注入、供应链与扫描机制、Audit 保留与访问规则 |
| [05 Source Control 与交付](./05-source-control-delivery.md) | 本领域的 Audit Trigger（Binding、SHA、外部 Effect、Review Decision、Merge、Reconciliation）与业务摘要 | Secret Reference 与短期凭据机制、Audit Envelope、脱敏与保留规则 |
| [06 平台应用与集成](./06-platform-application-integration.md) | `ConsoleAccessPort` 定义的 Console Access 语义、External Provider Envelope 字段与 Ingest/High-water 算法，以及 Feed 与公告链路的 Audit Trigger | Provider 信任材料与 Key Lifecycle、Secret、加密、供应链与文件扫描机制、Audit Envelope 与保留规则、非敏感标识边界 |
| [07 数据、消息与存储](./07-data-messaging-storage.md) | 数据服务拓扑与恢复链、`audit-worm` 与 `openbao-recovery` 的对象版本、容量计入与精确删除执行 | 数据服务的传输/工作负载身份/最小访问 Contract、静态与对象加密、Object Lock 语义、Audit Retention 与 Legal Hold 资格 |
| [09 基础设施与运维](./09-infrastructure-operations.md) | Platform Environment、Cluster、网络、PCS 锁定的组件版本/digest、物理容量与 Cluster DR 语义 | Kubernetes API、Volume、Ceph 与 Object 的静态加密语义，Workload Identity、PKI 与供应链 Gate 的安全判定 |
| [10 Configuration Governance](./10-configuration-governance.md) | Draft、Effective Snapshot 与 Promotion 的通用配置生命周期语义 | 配置命令与 Policy 发布的安全边界、Audit 与 Break-glass 约束 |
| [12 实施路线图](./12-implementation-roadmap.md) | 实施阶段、Capability 激活状态、Release 验收与 Reliability/Capacity Profile 选择 | Capability Activation Gate 必须证明的 Security Floor、恢复顺序与 Restore 证据 |
| [参数附录](./appendix-parameters.md) | OpenBao 与 Scanner 的资源、PVC、阈值、Snapshot 调度与 DR 目标 | 本文正文中的定性规则 |
