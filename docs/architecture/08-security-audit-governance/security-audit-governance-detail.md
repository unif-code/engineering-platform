# 安全、审计与治理详细说明

> 文档层级：L2 规范事实源
> 对应主文：[安全、审计与治理](./security-audit-governance.md)

## 1. 责任边界与环境状态

本文是安全、Secret、PKI、加密、Audit、供应链、Provider 信任材料与 Break-glass 的唯一规范事实源。它消费 01 的本地身份、Session、Capability、Super Admin 和 Recovery Port 语义，却不复制这些业务状态或授权判定；它消费 06 的 Console Access 与 External Provider Contract，却不复制其链接、Envelope 或 Ingest 算法；它消费 07 的数据服务恢复链和 09 的环境、Cluster、网络、容量与 DR 语义。

DEV 是当前唯一实例化的 Platform Environment，当前仓库仍是 Umi Max 前端模板。Python Control Plane、数据服务、基础设施和 PROD 是批准的目标架构，不表示已有对应运行实例。未来 PROD 从同源代码、Contract、GitOps 与 PCS 在独立 Account、VPC、Cluster 中重新实例化，不共享 DEV 的运行实例、Session、数据、凭据、密钥或故障域。

## 2. 身份材料保护

账号、密码生命周期、TOTP Enrollment、Session 失效与授权语义以[身份、组织与授权](../01-identity-organization-authorization/identity-organization-authorization-detail.md)为准。密码验证使用 Argon2id、每个密码独立 salt 和由 OpenBao 提供的 pepper；平台只保存受保护的派生验证结果。

密码、临时密码、TOTP Code、TOTP Secret、Session Cookie、Access Token、Refresh Token、Private Key、完整 Presigned URL、Prompt、源码正文及可直接重放的凭据禁止出现在：

- Browser 的持久化存储、Frontend Bundle、客户端日志或错误提示；
- 应用日志、Trace 属性、Metric Label、告警标签和外部状态 Envelope；
- Audit 正文、普通 Artifact、Git、镜像层和非受控对象元数据。

Audit 和 Telemetry 只允许记录不可逆引用、受限摘要、结果、版本、时间与 Correlation ID。需要排查时，使用受权的目标系统查询，不复制敏感原文进入平台。

## 3. OpenBao、Workload Identity 与 Agent Injector

每个环境部署独立 OpenBao。Kubernetes Auth 为每个服务建立独立 ServiceAccount、Auth Role 和最小权限 Policy，Role 精确绑定 Namespace 与 ServiceAccount；服务仅能读取自己用途的 Secret 路径和必要的短期凭据。Workload 使用 `audience=openbao` 的 projected ServiceAccount Token，OpenBao 仅以本环境、最小权限 TokenReview 验证该身份；不接受默认 Audience、长期 ServiceAccount Token 或跨环境身份。平台不提供集中高权 Token Broker，也不把平台 API 变成 Secret 转发通道。

OpenBao Server `2.6.1`、官方 Helm Chart `0.28.6`、Agent Injector 和附属镜像的精确版本/digest 是 PCS Candidate 与冻结部署输入；不得使用浮动 Tag。OpenBao 使用 Integrated Storage（Raft），不以 PostgreSQL 或业务数据服务作为 Storage Backend。DEV 使用 3 个 Voting Server、quorum 2；未来 PROD 使用 5 个 Voting Server、quorum 3。每个 Server 使用独立 10 GiB SSD RWO Data PVC，并通过 Anti-Affinity 与 Topology Spread 分散；同一时刻只有一个 Active，其他满足 quorum 的 Voting Server 为同步 Standby。

| 环境 | Voting Server | 单 Server Request | 单 Server Limit | 单 Server Data PVC |
| --- | ---: | --- | --- | ---: |
| DEV | 3 | 250m CPU / 512 MiB | 1 CPU / 1 GiB | 10 GiB |
| PROD | 5 | 500m CPU / 1 GiB | 2 CPU / 2 GiB | 10 GiB |

Data PVC 使用低延迟、非共享、支持在线扩容的 SSD RWO StorageClass；70%/85% 为 Warning/Critical，扩容不执行在线缩容。Server 副本数固定为 DEV 3、PROD 5，不使用 HPA；资源变化经 GitOps 逐节点执行，并重新验证 quorum、Raft Catch-up、PKI、Snapshot 与故障切换。

OpenBao API/UI Listener 只启用 TLS 1.2/1.3，并以 ClusterIP 暴露。8200 仅允许 Agent Injector、批准的 Workload、受控运维和备份入口访问；8201 仅允许 OpenBao Pod 之间的 Raft/Cluster mTLS 通信。Sandbox、Browser 和未登记 Namespace 均无 OpenBao 网络路径；明文 Listener、NodePort、LoadBalancer 和公网暴露均被禁止。

各环境默认 Workload Token TTL 为 1 小时，续期和撤销严格受所属 Auth Role/Policy 控制。OpenBao Agent Injector 在每个 Cluster 以两个无状态副本跨 Node 运行：DEV 单副本 Request/Limit 为 `50m CPU / 128 MiB` 与 `250m CPU / 256 MiB`，未来 PROD 为 `100m CPU / 256 MiB` 与 `500m CPU / 512 MiB`。注入的 Agent Sidecar 计入所属业务 Workload，不计入 Server 或 Injector 容量。

Agent Injector 只将 Secret 写入 Pod `tmpfs` 内存文件，并用文件权限限制读取者。Secret 禁止写入环境变量、镜像、Git、Prompt、Artifact、PV、日志、Trace 或 Metric；进程退出、Pod 销毁或 Lease 失效时，内存文件随运行时清除。Workload 必须通过其自身 Kubernetes Identity 获取短期 Token，不共享人类或其他服务的 Token。

首版数据库凭据是按服务、用途、Schema 与环境隔离的静态最小权限凭据，由 Agent Injector 写入 Pod `tmpfs` 文件；Deployment、Helm Values、ConfigMap 和 Environment Variable 不保存凭据。未来启用动态数据库凭据时，只替换 `SecretManagerPort`/credential provider、轮换与连接重建实现，不改变领域模块、数据库 owner 或授权语义。

每个环境采用 Shamir `5/3` 初始化：共五个分片，任意三个可完成解封。没有外部 Seal KMS/HSM。当前所有分片由同一保管人暂管，这是明确的治理例外，不构成多人制衡；交接、盘点、使用与变更都必须写入独立 Audit。OpenBao Root Token 不作为日常服务凭据，Root 操作只在受控 Break-glass 条件下执行。

OpenBao Audit 同时尝试写入独立 Audit PVC 与 stdout 两个 `file` Audit Device。一个 Device 发生非阻塞失败而另一个成功记录时请求可以继续；两个 Device 均无法记录时请求 Fail Closed。归档 Audit 写入 `audit-worm`，默认保留 365 天 `COMPLIANCE` Object Lock；对象保护、精确版本与清理由[数据、消息与存储](../07-data-messaging-storage/data-messaging-storage-detail.md)拥有。

每个 OpenBao Pod 的 Audit PVC 与 Raft Data PVC 分离：DEV 为 5 GiB，未来 PROD 为 10 GiB。本地缓冲默认保留 7 天，不是长期权威归档；PVC 使用率在 70%/85% 进入 Warning/Critical。两个 `file` Audit Device 以 HCL/GitOps 声明，一个落入独立 Audit PVC，另一个写入 stdout；均采用 JSON、`log_raw=false` 与 HMAC 保护。任一 Device 失败但另一个可记录时请求可继续，两个 Device 都无法记录时必须 Fail Closed。

OpenBao Raft Snapshot 使用应用一致性快照，不以多个 PVC/CSI Snapshot 充当恢复来源。DEV 每 6 小时生成并保留 7 天；未来 PROD 每 1 小时生成，保留 48 小时周期点和 30 天每日点。DEV 每月、PROD 每季度在隔离环境执行完整恢复演练；DR 目标为 DEV `RPO ≤ 6h`、`RTO ≤ 60min` 及 PROD `RPO ≤ 1h`、`RTO ≤ 60min`。调度、保留、Object Lock、阈值和演练周期均为版本化 GitOps 运维配置，管理后台只读展示有效值与证据。

OpenBao/Chart/Plugin 升级以及高风险 Auth、Policy、Secret Engine、Seal、Shamir 或 Transit Key 变更前，必须生成并验证按需 Snapshot。每份 Manifest 绑定 Environment、Cluster ID、Snapshot Time、OpenBao/Chart/Image Version、Raft Index、Seal Generation、独立的 Shamir Share Generation、Object Version、Size、SHA-256 与 OpenPGP Recipient Fingerprint；Seal Generation 与 Shamir Share Generation 是两个独立字段，不得合并、互相推导或互相替代。`openbao-recovery` 对象使用 Versioning 和默认 7 天 `GOVERNANCE` Object Lock。Shamir 轮换后立即生成并验证新 Snapshot；旧 Shamir Share Generation 的 Share 保留到与其一一绑定的最后一份 Snapshot 到期且 Restore 验证通过。`snapshot-force` 只能由受控 Break-glass 身份在批准的恢复窗口执行，CronJob 和普通运维身份没有该权限。

## 4. OpenBao PKI 与 Trust Bundle

OpenBao PKI 提供环境内证书签发，cert-manager 负责 Kubernetes 工作负载证书生命周期。证书层级固定为：

```text
离线 Organization Root：ECDSA P-384 / SHA-384，10 年
  └── 环境独立 Online Intermediate：P-256，3 年
        └── Gateway 与 Workload Leaf：P-256
```

Root Private Key 保持离线；每个环境只使用自己的 Intermediate、签发策略、CRL 和证书库存。公开 Root Bundle 是经 GitOps 审核、版本化且绑定 digest/review evidence 的 PKI Artifact；`TrustBundlePort` 将其分发到批准的 Node、Workload 和受控员工终端，不能分发 Private Key、Token、Intermediate 或可签发凭据。PKI 发行和吊销均记录证书标识、用途、环境、Issuer、时间、结果与 Correlation ID。

Gateway Leaf 有效期 30 天，提前 10 天进入轮换窗口。Full CRL 每 24 小时发布，并给予最多 6 小时的受控传播宽限；OCSP 响应有效期 4 小时；不使用 Delta CRL。紧急吊销在 Revocation 可靠提交后立即 rotate/publish Full CRL 并验证签名、Issuer、Serial 状态和实际发布内容。依赖吊销状态的受控 mTLS Client 在 CRL/OCSP 状态不可证明时 Fail Closed。

Root 或 Intermediate 轮换使用双 Root/双链重叠：先发布新旧 Root Bundle，验证 Node、Workload、Runtime 与受控终端的分发覆盖，再切换新 Intermediate/Leaf Chain。旧 Issuer 保持只读 CRL/OCSP 能力，旧 Root/链只有在全部相关 Leaf、缓存窗口与安全缓冲结束且无消费者证据后才能退役。公开 CRL、OCSP 和证书链只通过只读 `pki-publication` 发布。

每个环境的 `pki-publication` 使用两个跨 Node 分散的无状态副本。它只访问当前环境的公开 Issuer Certificate、Full CRL 与 OCSP Read Endpoint，不持有 OpenBao Token、Kubernetes Secret、CA/Leaf Private Key 或签发/吊销权限。Gateway 只允许精确 `/.well-known/pki/` 状态路径与协议规定的方法，拒绝 Cookie、Authorization、Session、未知 Issuer、超限请求和非 PKI 路径。

每次 Gateway 叶证书续签必须设定 `privateKey.rotationPolicy=Always`，生成新的 Leaf Private Key；证书签发、Secret 更新、Gateway 热加载和实际对外证书 Serial/SAN/Chain/有效期形成可观测闭环。PKI 状态路径、CRL/OCSP 响应及 Trust Bundle 仅传播公开材料；轮换期间旧 Issuer 保持必要的只读吊销状态，直到其已签发叶证书、缓存窗口与安全缓冲均满足退役条件。

## 5. Kubernetes API Secretbox Data-at-rest Encryption

每个环境使用独立 CSPRNG 生成的 32-byte `secretbox` key，仅在 `EncryptionConfiguration.secret` 字段以 Base64 表示。EncryptionConfiguration Schema 固定为 `apiserver.config.k8s.io/v1`；三个 API Server 的有序 Keyring、Resource Catalog、Provider 顺序和内容哈希必须一致。启动前 Pre-start Gate 验证 `--encryption-provider-config`、Schema、Catalog、Keyring、配置哈希、generation、文件权限和恢复材料完整性。全新 Cluster 完全不配置任何 identity provider。

`Sensitive API Resource Catalog` 至少包含 `secrets` 与 `configmaps`，并只在经过数据分类、API Discovery 与资源标识校验后加入确实承载敏感 Payload 的 CRD。Catalog 使用官方精确小写复数 `resource` 或 `resource.group` 标识，例如 `widgets.example.io`，不使用 Kind、API Version、模糊业务名称或 `*.*` Wildcard。Catalog、CRD 或 Provider 的改变属于新的 PCS/GitOps 变更，不能由平台后台动态修改。

`identity` 只允许作为既有明文迁移期间的最后临时读 fallback，永不作为 writer。新 Key 必须先作为同一 `secretbox.keys` 数组中的第二个 read candidate，再提升为第一个 writer；变更通过原子文件替换逐台 Drain、restart、verify，禁止各 API Server 使用不同 Keyring 或并行写配置。

每次 Keyring 轮换和恢复都执行 Sensitive Catalog 的全量幂等 rewrite，并验证：

1. API read 与 canary write/read 成功；
2. 预期对象数量与重写计数一致；
3. 原始 etcd 样本以 `k8s:enc:secretbox:v1:{keyName}:` 格式保存；
4. 三个 API Server 的 Config Hash、Generation 和 Keyring 顺序一致。

etcd snapshot 与 recovery bundle 必须绑定 config hash、generation 和完整历史 Keyring。恢复时先恢复并验证 Keyring 与 EncryptionConfiguration，再接触 etcd 数据；缺少任一历史 Key 或配置证据时，不得启动 API Server 读取 Secret。

## 6. Volume、Ceph 与 Object Encryption

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

## 7. File 与 Image Security

File Security Worker 使用 ClamAV 1.5.3。每个环境运行 2 个 replica，总并发为 4；单对象上限 100 MiB，`MaxScanSize=400 MiB`、`MaxRecursion=17`、`MaxFiles=10000`、`MaxScanTime=120s`。扫描结果固定为 `CLEAN`、`MALICIOUS`、`SUSPICIOUS` 或 `ERROR`。

每个 Scanner Replica 是带 `File Security Worker` 与 `clamd/freshclam` 的独立 StatefulSet Pod，通过 Pod 内 Unix Socket 调用，不暴露 ClamAV 网络服务。每副本使用独立 5 GiB RWO Signature PVC；ClamAV Container 的 Request/Limit 为 `1 CPU / 3 GiB` 与 `2 CPU / 6 GiB`，Worker Container 的 Request/Limit 为 `200m CPU / 256 MiB` 与 `1 CPU / 1 GiB`。两个副本以 Anti-Affinity/Topology Spread 分散，并设 `PDB minAvailable=1`。

`freshclam` 每 2 小时检查一次，并对副本使用受控随机 Jitter；数据库更新先验证签名、完整性和 Engine Load Test，再由 `clamd` Concurrent Reload。连续 6/12/24 小时未成功更新分别为 Warning/Critical/退出 Ready；超过 24 小时的副本不能返回 `CLEAN`，新对象保持不可用。`MaxThreads=2`、`MaxQueue=4`，单副本最多并发扫描 2 个对象；单副本故障时环境并发降至 2，由持久化异步队列承接任务。

只有 `CLEAN` 且扫描覆盖完整的对象可以进入可用业务状态。其余 Verdict、超限、超时、签名库不可用和覆盖不完整全部 Fail Closed；业务状态变更由其领域 owner 定义。文件上传配额、Object Version、Bucket Capacity 与 Artifact 语义以[07](../07-data-messaging-storage/data-messaging-storage-detail.md)为准。

运行镜像必须具备可验证 provenance、SBOM、漏洞扫描和签名。部署 Gate 验证镜像 digest、签名身份、SBOM、扫描结论和 PCS 兼容性；不满足任一条件的镜像不得进入工作负载。镜像扫描结论和例外只记录受限摘要与证据引用。

首版 Image Security 使用独立 Trivy 与 `ImageSecurityPort`，不复用 ClamAV、CI 或 Jenkins。Quarantine 中保存不可变 Manifest/List Digest；Scanner 使用 read-only、repository-scoped Registry Identity。每环境运行 2 个 Replica，每副本单并发；单副本 CPU Request/Limit 为 `500m/2 CPU`，Memory Request/Limit 为 `1/4 GiB`，Ephemeral Storage Request/Limit 为 `10/20 GiB`。

独立 `trivy-data-sync` 以 6 小时周期更新 Vulnerability DB，以 24 小时周期更新 Java DB 与 Checks。Freshness Gate 为：Vulnerability DB 12/18/24 小时 Warning/Critical/Expired；仅对相关镜像启用的 Java DB 为 36/48/72 小时；Checks 为 48/72 小时/7 天。数据库过期、Coverage 不完整、Schema/Digest/Smoke Test 失败或 Scanner Error 均 Fail Closed。

Image Security 状态独立于 Build 状态：

```text
PENDING_SCAN → PASSED | BLOCKED | ERROR | EXPIRED
```

签名有效或 Build 成功都不能绕过扫描。不可绕过 Security Floor 包含 Trust/Provenance 失败、Coverage 不完整、Embedded Secret、Base OS EOL、CISA KEV 与 Critical Finding；High 默认 Block，仅允许对精确 Image Digest 与精确 Finding 建立限时、可审计 Exception，且不能覆盖上述 Floor。Image Security 不重新定义 03/04 的 Build 或 Sandbox 生命周期。

## 8. Audit、WORM 与 Break-glass

Audit 是独立的追加式不可篡改事实。任何需要 Audit 的受保护状态变更，只有在 Audit 与对应持久证据可靠提交后才能成功；Audit 容量无法覆盖扩容 Lead Time 时相关写操作 Fail Closed。Coverage 至少包括 Identity/认证因子重置、授权/配置、Requirement/Workflow/MR/Attempt、Secret/PKI、Archive/Restore/Delete、DLQ/Replay、Provider Feed、Break-glass、加密轮换、文件/镜像判定、工作负载安全异常和治理操作。平台、OpenBao、Provider 与 Kubernetes Audit 独立保存并可按 Correlation ID、环境和对象关联；任一来源都不能替代其他来源。

`audit-worm` 默认使用 365 天 `COMPLIANCE` Object Lock。Audit 正文不保存 Secret、密码、TOTP、Token、Private Key、完整 Presigned URL、Prompt 或源码。对象版本、Retention、Legal Hold 与删除资格由 07 的 Object Retention Contract 定义。

Break-glass 仅通过 01 的受限 Recovery Port 和 GitOps 锁定的一次性 Job/CLI 执行，不经过 Web 页面、普通平台 API 或直接数据库修改。它使用短期、最小化的高权限资格，必须给出原因、双 Audit 证据、执行范围和失效时间。无法建立审计双写、身份验证、受限范围或恢复证据时，Break-glass 不执行。

## 9. External Provider Trust Material

06 定义 External Provider Envelope 字段、签名验证顺序、Ingest 和 High-water 算法；本文只定义其信任材料。每个 Signing Key 精确绑定 Environment、Binding Kind、Binding ID Scope、Binding Generation 与 Collector Lineage，Private Key 保持在 Cluster 外受控边界，平台只持有验证所需的公开材料。

Key Lifecycle 为：

```text
ADD_NEW → CANARY → ACTIVE → VERIFY_ONLY → RETIRED / REVOKED
```

新增 Key 先在 CANARY 验证签名、Scope、时钟与回放防护，再进入 ACTIVE；旧 Key 在 VERIFY_ONLY 期间只用于验证既有输入，满足切换证据后进入 RETIRED 或 REVOKED。DR 恢复必须同时恢复并验证 Trust Store 与 06 所有 lineage 的 High-water Mark；它们不能静默清零，也不能以未知 Key 接受新的 Provider 输入。无法证明 Trust/High-water 连续性时 Feed 固定为 `UNKNOWN`，并按 06 Contract 建立受控新 Lineage，绝不重置既有 Lineage 的 High-water。

Console 的预注册链接、允许列表、目标认证与打开 Audit 由 06 的 `ConsoleAccessPort` 定义。本文只保证 Console Access 不会获得 Secret、Private Key、Cloud Admin Credential 或跨环境信任材料。

## 10. 不变量

1. 每个环境的 OpenBao、PKI、Keyring、Transit、Audit、Trust Store 与恢复材料相互独立。
2. Secret 只通过最小权限 Workload Identity 与 Pod 内存文件短期分发，不进入任何持久化或可观测性载体。
3. 新 Kubernetes Cluster 禁止 identity provider；secretbox 轮换和恢复始终先完成一致 Keyring/配置验证。
4. OpenBao 恢复 Bucket 不依赖待恢复的 OpenBao Transit，离线 OpenPGP 是其唯一解密根。
5. Audit WORM、双写证据与 Break-glass 限制始终优先于高权限操作便利性。
6. Provider 信任材料、环境绑定与回放证据必须在恢复后保持连续、可验证和可审计。
