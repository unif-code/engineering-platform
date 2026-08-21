import { createTotpCode } from '@root/tests/auth-fixtures';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { App, ConfigProvider, theme } from 'antd';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  PolicyCatalogResponse,
  PolicyDraft,
  PolicyPreview,
  PolicyValidationResult,
  PolicyVersionsResponse,
  PublishedPolicyVersion,
} from '@/features/administration';
import { ApiError } from '@/services/transport';

const administrationMocks = vi.hoisted(() => ({
  createPolicyDraft: vi.fn(),
  listPolicyCatalog: vi.fn(),
  listPolicyVersions: vi.fn(),
  previewPolicyDraft: vi.fn(),
  publishPolicyDraft: vi.fn(),
  rollbackPolicyVersion: vi.fn(),
  updatePolicyDraft: vi.fn(),
  validatePolicyDraft: vi.fn(),
}));

vi.mock('@umijs/max', async () => ({
  ...(await import('@tanstack/react-query')),
}));

vi.mock('@/features/administration', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/administration')>()),
  ...administrationMocks,
}));

import AdminPoliciesPage from '.';

function styleRulesFor(element: Element): string {
  const classNames = [...element.classList];
  const collectRules = (rules: CSSRuleList): string[] =>
    [...rules].flatMap((rule) => {
      const nestedRules = (rule as CSSRule & { cssRules?: CSSRuleList })
        .cssRules;
      return [rule.cssText, ...(nestedRules ? collectRules(nestedRules) : [])];
    });
  return [...document.styleSheets]
    .flatMap((sheet) => collectRules(sheet.cssRules))
    .filter((rule) => classNames.some((name) => rule.includes(`.${name}`)))
    .join('\n');
}

const INITIAL_WAIT = { timeout: 5_000 };
const PAGE_INTERACTION_TEST_TIMEOUT = 30_000;
const PREVIEW_BUTTON_NAME = /预\s*览/;
const PUBLISH_BUTTON_NAME = /发\s*布/;
const VALIDATE_BUTTON_NAME = /校\s*验/;

const deepFreezeDto = <T,>(value: T): T => {
  if (Array.isArray(value)) {
    return Object.freeze(value.map((entry) => deepFreezeDto(entry))) as T;
  }
  if (typeof value === 'object' && value !== null) {
    return Object.freeze(
      Object.fromEntries(
        Object.entries(value).map(([key, entry]) => [
          key,
          deepFreezeDto(entry),
        ]),
      ),
    ) as T;
  }
  return value;
};

const POLICY_CATALOG_FIXTURE = deepFreezeDto<PolicyCatalogResponse>({
  activeVersion: 1,
  items: [
    {
      activeValue: 24,
      activeVersion: 1,
      defaultValue: 24,
      description: '一次性临时密码签发后的有效小时数',
      effectSemantics: '仅影响后续签发的一次性临时密码。',
      key: 'identity.temp_password_ttl_hours',
      label: '临时密码有效期',
      max: 72,
      min: 1,
      namespace: 'identity',
      unit: '小时',
      valueType: 'INTEGER',
    },
    {
      activeValue: 'NEVER',
      activeVersion: 1,
      defaultValue: 'NEVER',
      description: '正式密码的过期周期',
      effectSemantics: '发布后用于后续认证时的密码有效性判断。',
      enumOptions: [
        { label: '永不过期', value: 'NEVER' },
        { label: '90 天', value: '90_DAYS' },
        { label: '180 天', value: '180_DAYS' },
      ],
      key: 'identity.password_expiry',
      label: '密码过期周期',
      namespace: 'identity',
      unit: null,
      valueType: 'ENUM',
    },
    {
      activeValue: 3,
      activeVersion: 1,
      defaultValue: 3,
      description: '同一账号同时有效的 Session 数量上限',
      effectSemantics: '发布后登录会逐出超出上限的最旧 Session。',
      key: 'identity.session_limit',
      label: 'Session 上限',
      max: 10,
      min: 1,
      namespace: 'identity',
      unit: '个',
      valueType: 'INTEGER',
    },
    {
      activeValue: 60,
      activeVersion: 1,
      defaultValue: 60,
      description: '人员 Session 连续无活动后的失效分钟数',
      effectSemantics: '发布后用于认证 API 的空闲 Session 判定。',
      key: 'identity.session_idle_minutes',
      label: 'Session 空闲期限',
      max: 240,
      min: 15,
      namespace: 'identity',
      unit: '分钟',
      valueType: 'INTEGER',
    },
    {
      activeValue: 'STANDARD',
      activeVersion: 1,
      defaultValue: 'STANDARD',
      description: '连续失败后按标准档位退避',
      effectSemantics: '发布后仅影响后续登录失败的服务端退避判定。',
      enumOptions: [{ label: '标准', value: 'STANDARD' }],
      key: 'identity.login_backoff_profile',
      label: '登录失败退避',
      namespace: 'identity',
      unit: null,
      valueType: 'ENUM',
    },
    {
      activeValue: 5,
      activeVersion: 1,
      defaultValue: 5,
      description: '同一 TOTP Challenge 可失败的最大次数',
      effectSemantics: '发布后仅影响新创建的 TOTP Challenge。',
      key: 'identity.totp_attempt_limit',
      label: 'TOTP 尝试上限',
      max: 10,
      min: 3,
      namespace: 'identity',
      unit: '次',
      valueType: 'INTEGER',
    },
    {
      activeValue: 30,
      activeVersion: 1,
      defaultValue: 30,
      description: 'Draft 无活动后自动归档的等待天数',
      effectSemantics: '按 NEXT_SCHEDULE 仅影响后续自动归档调度。',
      key: 'identity.draft_auto_archive_days',
      label: 'Draft 自动归档等待期',
      max: 365,
      min: 1,
      namespace: 'identity',
      unit: '天',
      valueType: 'INTEGER',
    },
  ],
  namespace: 'identity',
  scope: 'PLATFORM',
});

const POLICY_VERSION_FIXTURES = deepFreezeDto<PolicyVersionsResponse>({
  items: [
    {
      current: true,
      namespace: 'identity',
      publishedAt: '2026-08-01T08:00:00.000Z',
      publishedBy: 'SYSTEM_SEED',
      reason: '平台初始化默认策略',
      scope: 'PLATFORM',
      version: 1,
    },
  ],
});

const CONTENT_60 = deepFreezeDto({
  'identity.draft_auto_archive_days': 30,
  'identity.login_backoff_profile': 'STANDARD',
  'identity.password_expiry': 'NEVER',
  'identity.session_idle_minutes': 60,
  'identity.session_limit': 3,
  'identity.temp_password_ttl_hours': 24,
  'identity.totp_attempt_limit': 5,
});
const CONTENT_10 = deepFreezeDto({
  ...CONTENT_60,
  'identity.session_idle_minutes': 10,
});
const CONTENT_30 = deepFreezeDto({
  ...CONTENT_60,
  'identity.session_idle_minutes': 30,
});
const CONTENT_45 = deepFreezeDto({
  ...CONTENT_60,
  'identity.session_idle_minutes': 45,
});

const policyDraft = (
  content: Record<string, number | string>,
  revision: number,
  overrides: Partial<PolicyDraft> = {},
) =>
  deepFreezeDto<PolicyDraft>({
    baseVersion: 1,
    content,
    etag: `"v${revision}"`,
    id: 'draft-1',
    namespace: 'identity',
    revision,
    scope: 'PLATFORM',
    stale: false,
    status: 'DRAFT',
    updatedAt: `2026-08-18T08:0${revision}:00.000Z`,
    ...overrides,
  });

const DRAFT_V1 = policyDraft(CONTENT_60, 1);
const DRAFT_10_V2 = policyDraft(CONTENT_10, 2);
const DRAFT_30_V2 = policyDraft(CONTENT_30, 2);
const DRAFT_30_V4 = policyDraft(CONTENT_30, 4);
const DRAFT_45_V4 = policyDraft(CONTENT_45, 4);
const ROLLBACK_DRAFT = policyDraft(CONTENT_60, 1, { baseVersion: 2 });

const VALID_30_V3 = deepFreezeDto<PolicyValidationResult>({
  etag: '"v3"',
  issues: [],
  revision: 3,
  valid: true,
});
const VALID_30_V4 = deepFreezeDto<PolicyValidationResult>({
  etag: '"v4"',
  issues: [],
  revision: 4,
  valid: true,
});
const VALID_30_V5 = deepFreezeDto<PolicyValidationResult>({
  etag: '"v5"',
  issues: [],
  revision: 5,
  valid: true,
});
const INVALID_10_V3 = deepFreezeDto<PolicyValidationResult>({
  etag: '"v3"',
  issues: [
    {
      code: 'OUT_OF_RANGE',
      key: 'identity.session_idle_minutes',
      message: 'Session 空闲期限必须在 15～240 之间',
    },
  ],
  revision: 3,
  valid: false,
});
const PREVIEW_30 = deepFreezeDto<PolicyPreview>({
  baseVersion: 1,
  changes: [
    {
      afterValue: 30,
      beforeValue: 60,
      changed: true,
      effectSemantics: '发布后用于认证 API 的空闲 Session 判定。',
      key: 'identity.session_idle_minutes',
      label: 'Session 空闲期限',
    },
  ],
  draftId: 'draft-1',
  etag: '"v2"',
  namespace: 'identity',
  revision: 2,
});
const PUBLISHED_VERSION_2 = deepFreezeDto<PublishedPolicyVersion>({
  namespace: 'identity',
  publishedAt: '2026-08-18T09:00:00.000Z',
  reason: '收紧 Session 空闲期限',
  scope: 'PLATFORM',
  version: 2,
});

const catalogAt = (
  activeVersion: number,
  idleMinutes: number,
): PolicyCatalogResponse =>
  deepFreezeDto({
    activeVersion,
    items: POLICY_CATALOG_FIXTURE.items.map((item) => ({
      ...item,
      activeValue:
        item.key === 'identity.session_idle_minutes'
          ? idleMinutes
          : item.activeValue,
      activeVersion,
    })),
    namespace: 'identity',
    scope: 'PLATFORM',
  });

const CATALOG_VERSION_2 = catalogAt(2, 30);
const VERSIONS_2 = deepFreezeDto<PolicyVersionsResponse>({
  items: [
    {
      current: true,
      namespace: 'identity',
      publishedAt: '2026-08-18T09:00:00.000Z',
      publishedBy: '示例管理员',
      reason: '收紧 Session 空闲期限',
      scope: 'PLATFORM',
      version: 2,
    },
    {
      ...POLICY_VERSION_FIXTURES.items[0],
      current: false,
    },
  ],
});
const VERSIONS_4 = deepFreezeDto<PolicyVersionsResponse>({
  items: [
    {
      current: true,
      namespace: 'identity',
      publishedAt: '2026-08-18T12:00:00.000Z',
      publishedBy: '示例管理员',
      reason: '第四版策略',
      scope: 'PLATFORM',
      version: 4,
    },
    {
      current: false,
      namespace: 'identity',
      publishedAt: '2026-08-18T11:00:00.000Z',
      publishedBy: '示例管理员',
      reason: '第三版策略',
      scope: 'PLATFORM',
      version: 3,
    },
    {
      current: false,
      namespace: 'identity',
      publishedAt: '2026-08-18T10:00:00.000Z',
      publishedBy: '示例管理员',
      reason: '第二版策略',
      scope: 'PLATFORM',
      version: 2,
    },
    {
      ...POLICY_VERSION_FIXTURES.items[0],
      current: false,
    },
  ],
});

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={{ token: { motion: false } }}>
        <App>
          <AdminPoliciesPage />
        </App>
      </ConfigProvider>
    </QueryClientProvider>,
  );
}

async function findPolicySettings() {
  await screen.findByText(
    '改动先落草稿，经校验与预览后整批发布；每次发布都记录原因与操作人，可按版本回滚',
    {},
    INITIAL_WAIT,
  );
  const settings = await screen.findByRole(
    'region',
    { name: 'Policy 设置' },
    INITIAL_WAIT,
  );
  await screen.findByRole(
    'spinbutton',
    { name: 'Session 空闲期限' },
    INITIAL_WAIT,
  );
  return settings;
}

async function setIdleMinutes(user: UserEvent, value: string) {
  const input = screen.getByRole('spinbutton', { name: 'Session 空闲期限' });
  await user.clear(input);
  await user.type(input, value);
}

async function validateDraft(user: UserEvent) {
  await user.click(screen.getByRole('button', { name: VALIDATE_BUTTON_NAME }));
  await screen.findByText('校验通过', {}, INITIAL_WAIT);
}

async function publishVersionTwo(user: UserEvent, totpCode: string) {
  await findPolicySettings();
  await setIdleMinutes(user, '30');
  await validateDraft(user);
  await user.click(screen.getByRole('button', { name: PUBLISH_BUTTON_NAME }));
  const dialog = await screen.findByRole('dialog', { name: '发布 Policy' });
  await user.type(
    within(dialog).getByRole('textbox', { name: '发布原因' }),
    '收紧 Session 空闲期限',
  );
  await user.type(
    within(dialog).getByRole('textbox', { name: 'TOTP 验证码' }),
    totpCode,
  );
  await user.click(within(dialog).getByRole('button', { name: '确认发布' }));
  return dialog;
}

function arrangeValidDraft() {
  administrationMocks.createPolicyDraft.mockResolvedValueOnce(DRAFT_V1);
  administrationMocks.updatePolicyDraft.mockResolvedValueOnce(DRAFT_30_V2);
  administrationMocks.validatePolicyDraft.mockResolvedValueOnce(VALID_30_V3);
}

beforeEach(() => {
  Object.values(administrationMocks).forEach((mock) => {
    mock.mockReset();
  });
  administrationMocks.listPolicyCatalog.mockResolvedValue(
    POLICY_CATALOG_FIXTURE,
  );
  administrationMocks.listPolicyVersions.mockResolvedValue(
    POLICY_VERSION_FIXTURES,
  );
});

describe('AdminPoliciesPage', {
  timeout: PAGE_INTERACTION_TEST_TIMEOUT,
}, () => {
  it('按新版原型呈现七个策略分类、当前值和待发布草稿区', async () => {
    const user = userEvent.setup();
    renderPage();

    await findPolicySettings();
    expect(screen.queryByText('当前版本 1')).not.toBeInTheDocument();
    expect(
      screen.getByRole('radiogroup', { name: 'Policy 分类' }),
    ).toBeVisible();
    for (const category of [
      '会话与登录策略',
      'Agent 执行限制',
      '模型调用配额',
      'Gate 审批规则',
      '代码仓库与 MR 策略',
      '审计与留存',
      '通知与消息',
    ]) {
      expect(
        within(
          screen.getByRole('radiogroup', { name: 'Policy 分类' }),
        ).getByText(category),
      ).toBeVisible();
    }
    expect(
      screen.getByRole('region', { name: 'Session 空闲期限策略' }),
    ).toBeVisible();
    const draftSummary = screen.getByRole('region', { name: '待发布草稿' });
    expect(draftSummary).toHaveTextContent('当前没有改动');
    const draftSummaryCss = styleRulesFor(draftSummary);
    expect(draftSummaryCss).toMatch(/position:\s*sticky/u);
    expect(draftSummaryCss).toMatch(/width:\s*330px/u);
    expect(draftSummaryCss).toContain(
      `padding: ${theme.getDesignToken().padding}px`,
    );
    expect(
      screen.getByRole('spinbutton', { name: 'Session 空闲期限' }),
    ).toHaveValue('60');
    expect(
      screen.getByRole('combobox', { name: '密码过期周期' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '新建草稿' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '保存草稿' }),
    ).not.toBeInTheDocument();

    await setIdleMinutes(user, '30');
    expect(
      await screen.findByRole('region', { name: 'Draft 编辑' }, INITIAL_WAIT),
    ).toHaveTextContent('60 分钟 → 30 分钟');
    const changeHint = screen.getByText('草稿 · 原值 60 分钟');
    expect(styleRulesFor(changeHint)).toContain(
      theme.getDesignToken().colorWarningText,
    );
  });

  it('校验前通过公开入口创建并保存 Draft，且每一步使用最新 ETag', async () => {
    administrationMocks.createPolicyDraft.mockResolvedValueOnce(DRAFT_V1);
    administrationMocks.updatePolicyDraft.mockResolvedValueOnce(DRAFT_30_V2);
    administrationMocks.validatePolicyDraft.mockResolvedValueOnce(VALID_30_V3);
    const user = userEvent.setup();
    renderPage();
    await findPolicySettings();
    const input = screen.getByRole('spinbutton', {
      name: 'Session 空闲期限',
    });
    const validate = screen.getByRole('button', {
      name: VALIDATE_BUTTON_NAME,
    });

    await user.clear(input);
    expect(validate).toBeDisabled();
    await user.type(input, '30');
    expect(validate).toBeEnabled();
    expect(
      screen.getByRole('button', { name: PUBLISH_BUTTON_NAME }),
    ).toBeDisabled();

    await validateDraft(user);
    expect(
      screen.getByRole('button', { name: PUBLISH_BUTTON_NAME }),
    ).toBeEnabled();
    expect(administrationMocks.createPolicyDraft).toHaveBeenCalledWith(
      'identity',
      { values: {} },
    );
    expect(administrationMocks.updatePolicyDraft).toHaveBeenCalledWith(
      'identity',
      'draft-1',
      {
        content: {
          'identity.draft_auto_archive_days': 30,
          'identity.login_backoff_profile': 'STANDARD',
          'identity.password_expiry': 'NEVER',
          'identity.session_idle_minutes': 30,
          'identity.session_limit': 3,
          'identity.temp_password_ttl_hours': 24,
          'identity.totp_attempt_limit': 5,
        },
      },
      '"v1"',
    );
    expect(administrationMocks.validatePolicyDraft).toHaveBeenCalledWith(
      'identity',
      'draft-1',
      '"v2"',
    );
  });

  it('创建接口已返回完整候选时跳过冗余 Update', async () => {
    administrationMocks.createPolicyDraft.mockResolvedValueOnce(DRAFT_30_V2);
    administrationMocks.validatePolicyDraft.mockResolvedValueOnce(VALID_30_V3);
    const user = userEvent.setup();
    renderPage();
    await findPolicySettings();
    await setIdleMinutes(user, '30');

    await validateDraft(user);

    expect(administrationMocks.updatePolicyDraft).not.toHaveBeenCalled();
    expect(administrationMocks.validatePolicyDraft).toHaveBeenCalledWith(
      'identity',
      'draft-1',
      '"v2"',
    );
  });

  it('保存后再次编辑时可撤销本地编辑并恢复服务端候选', async () => {
    administrationMocks.createPolicyDraft.mockResolvedValueOnce(DRAFT_V1);
    administrationMocks.updatePolicyDraft.mockResolvedValueOnce(DRAFT_30_V2);
    administrationMocks.validatePolicyDraft
      .mockResolvedValueOnce(VALID_30_V3)
      .mockResolvedValueOnce(VALID_30_V4);
    const user = userEvent.setup();
    renderPage();
    await findPolicySettings();
    await setIdleMinutes(user, '30');
    await validateDraft(user);
    await setIdleMinutes(user, '45');

    const undo = screen.getByRole('button', { name: '撤销本地编辑' });
    expect(undo).toBeEnabled();
    await user.click(undo);

    expect(
      screen.getByRole('spinbutton', { name: 'Session 空闲期限' }),
    ).toHaveValue('30');
    expect(
      screen.getByRole('region', { name: '待发布草稿' }),
    ).toHaveTextContent('60 分钟 → 30 分钟');
    expect(undo).toBeDisabled();
    await validateDraft(user);
    expect(administrationMocks.updatePolicyDraft).toHaveBeenCalledTimes(1);
    expect(administrationMocks.validatePolicyDraft).toHaveBeenNthCalledWith(
      2,
      'identity',
      'draft-1',
      '"v3"',
    );
  });

  it('未保存编辑可直接恢复当前生效值且不创建 Draft', async () => {
    const user = userEvent.setup();
    renderPage();
    await findPolicySettings();
    await setIdleMinutes(user, '30');

    await user.click(screen.getByRole('button', { name: '撤销本地编辑' }));

    expect(
      screen.getByRole('spinbutton', { name: 'Session 空闲期限' }),
    ).toHaveValue('60');
    expect(administrationMocks.createPolicyDraft).not.toHaveBeenCalled();
  });

  it('Draft ETag 409 保留编辑态并显示固定并发冲突提示', async () => {
    administrationMocks.createPolicyDraft.mockResolvedValueOnce(DRAFT_V1);
    administrationMocks.updatePolicyDraft.mockRejectedValueOnce(
      new ApiError({
        detail: '已被并发修改，刷新后重试',
        requestId: 'req-policy-conflict',
        status: 409,
        title: 'DRAFT_CONFLICT',
      }),
    );
    const user = userEvent.setup();
    renderPage();
    await findPolicySettings();
    await setIdleMinutes(user, '30');

    await user.click(
      screen.getByRole('button', { name: VALIDATE_BUTTON_NAME }),
    );

    expect(
      await screen.findByText(/已被并发修改，刷新后重试/, {}, INITIAL_WAIT),
    ).toBeVisible();
    expect(
      screen.getByRole('region', { name: 'Draft 编辑' }),
    ).toBeInTheDocument();
  });

  it.each([
    { action: '校验', button: VALIDATE_BUTTON_NAME },
    { action: '预览', button: PREVIEW_BUTTON_NAME },
  ])('Draft 自动保存失败时阻止$action并保留编辑态', async ({ button }) => {
    administrationMocks.createPolicyDraft.mockRejectedValueOnce(
      new Error('Draft 存储暂不可用'),
    );
    const user = userEvent.setup();
    renderPage();
    await findPolicySettings();
    await setIdleMinutes(user, '30');

    await user.click(screen.getByRole('button', { name: button }));

    expect(
      await screen.findByText(/Draft 存储暂不可用/, {}, INITIAL_WAIT),
    ).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Draft 编辑' })).toBeVisible();
    expect(administrationMocks.validatePolicyDraft).not.toHaveBeenCalled();
    expect(administrationMocks.previewPolicyDraft).not.toHaveBeenCalled();
  });

  it.each([
    {
      action: '校验',
      button: VALIDATE_BUTTON_NAME,
      expected: 'Policy 校验服务不可用',
      mock: administrationMocks.validatePolicyDraft,
    },
    {
      action: '预览',
      button: PREVIEW_BUTTON_NAME,
      expected: 'Policy 预览服务不可用',
      mock: administrationMocks.previewPolicyDraft,
    },
  ])(
    '$action失败展示服务端错误且保留 Draft',
    async ({ button, expected, mock }) => {
      administrationMocks.createPolicyDraft.mockResolvedValueOnce(DRAFT_V1);
      administrationMocks.updatePolicyDraft.mockResolvedValueOnce(DRAFT_30_V2);
      mock.mockRejectedValueOnce(new Error(expected));
      const user = userEvent.setup();
      renderPage();
      await findPolicySettings();
      await setIdleMinutes(user, '30');

      await user.click(screen.getByRole('button', { name: button }));

      expect(
        await screen.findByText(new RegExp(expected), {}, INITIAL_WAIT),
      ).toBeInTheDocument();
      expect(screen.getByRole('region', { name: 'Draft 编辑' })).toBeVisible();
    },
  );

  it('Validate 展示越界 issue，修正后通过校验', async () => {
    administrationMocks.createPolicyDraft.mockResolvedValueOnce(DRAFT_V1);
    administrationMocks.updatePolicyDraft
      .mockResolvedValueOnce(DRAFT_10_V2)
      .mockResolvedValueOnce(DRAFT_30_V4);
    administrationMocks.validatePolicyDraft
      .mockResolvedValueOnce(INVALID_10_V3)
      .mockResolvedValueOnce(VALID_30_V5);
    const user = userEvent.setup();
    renderPage();
    await findPolicySettings();
    await setIdleMinutes(user, '10');
    await user.click(
      screen.getByRole('button', { name: VALIDATE_BUTTON_NAME }),
    );

    expect(
      await screen.findByText(/Session 空闲期限必须在 15～240 之间/),
    ).toBeVisible();

    await setIdleMinutes(user, '30');
    await validateDraft(user);
    expect(administrationMocks.updatePolicyDraft).toHaveBeenNthCalledWith(
      2,
      'identity',
      'draft-1',
      expect.objectContaining({
        content: expect.objectContaining({
          'identity.session_idle_minutes': 30,
        }),
      }),
      '"v3"',
    );
  });

  it('编辑发生在 Validate 请求之后时丢弃旧候选结果', async () => {
    let resolveValidation:
      | ((value: PolicyValidationResult) => void)
      | undefined;
    const validationResponse = new Promise<PolicyValidationResult>(
      (resolve) => {
        resolveValidation = resolve;
      },
    );
    administrationMocks.createPolicyDraft.mockResolvedValueOnce(DRAFT_V1);
    administrationMocks.updatePolicyDraft
      .mockResolvedValueOnce(DRAFT_30_V2)
      .mockResolvedValueOnce(DRAFT_45_V4);
    administrationMocks.validatePolicyDraft
      .mockReturnValueOnce(validationResponse)
      .mockResolvedValueOnce(VALID_30_V5);
    const user = userEvent.setup();
    renderPage();
    await findPolicySettings();
    await setIdleMinutes(user, '30');

    await user.click(
      screen.getByRole('button', { name: VALIDATE_BUTTON_NAME }),
    );
    await waitFor(() => {
      expect(administrationMocks.validatePolicyDraft).toHaveBeenCalledWith(
        'identity',
        'draft-1',
        '"v2"',
      );
    });
    await setIdleMinutes(user, '45');
    await act(async () => {
      resolveValidation?.(VALID_30_V3);
      await validationResponse;
    });

    expect(screen.queryByText('校验通过')).not.toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: VALIDATE_BUTTON_NAME }),
    );
    await waitFor(() => {
      expect(administrationMocks.updatePolicyDraft).toHaveBeenNthCalledWith(
        2,
        'identity',
        'draft-1',
        expect.objectContaining({
          content: expect.objectContaining({
            'identity.session_idle_minutes': 45,
          }),
        }),
        '"v3"',
      );
    });
  });

  it('Preview 通过公开入口呈现 Draft 前后值与生效语义', async () => {
    administrationMocks.createPolicyDraft.mockResolvedValueOnce(DRAFT_V1);
    administrationMocks.updatePolicyDraft.mockResolvedValueOnce(DRAFT_30_V2);
    administrationMocks.previewPolicyDraft.mockResolvedValueOnce(PREVIEW_30);
    const user = userEvent.setup();
    renderPage();
    await findPolicySettings();
    await setIdleMinutes(user, '30');
    await user.click(screen.getByRole('button', { name: PREVIEW_BUTTON_NAME }));
    const preview = await screen.findByRole(
      'region',
      { name: 'Policy Preview' },
      INITIAL_WAIT,
    );

    expect(preview).toHaveAttribute('data-density', 'compact');
    expect(
      await within(preview).findByRole(
        'row',
        { name: /Session 空闲期限.*60.*30.*认证 API 的空闲 Session 判定/ },
        INITIAL_WAIT,
      ),
    ).toBeInTheDocument();
    expect(administrationMocks.previewPolicyDraft).toHaveBeenCalledWith(
      'identity',
      'draft-1',
      '"v2"',
    );
    await user.click(
      within(screen.getByRole('dialog', { name: 'Policy Preview' })).getByRole(
        'button',
        { name: 'Close' },
      ),
    );
    expect(screen.queryByRole('dialog', { name: 'Policy Preview' })).toBeNull();
  });

  it('编辑发生在 Preview 请求之后时丢弃旧预览', async () => {
    let resolvePreview: ((value: PolicyPreview) => void) | undefined;
    const previewResponse = new Promise<PolicyPreview>((resolve) => {
      resolvePreview = resolve;
    });
    administrationMocks.createPolicyDraft.mockResolvedValueOnce(DRAFT_V1);
    administrationMocks.updatePolicyDraft.mockResolvedValueOnce(DRAFT_30_V2);
    administrationMocks.previewPolicyDraft.mockReturnValueOnce(previewResponse);
    const user = userEvent.setup();
    renderPage();
    await findPolicySettings();
    await setIdleMinutes(user, '30');
    await user.click(screen.getByRole('button', { name: PREVIEW_BUTTON_NAME }));
    await waitFor(() => {
      expect(administrationMocks.previewPolicyDraft).toHaveBeenCalled();
    });

    await setIdleMinutes(user, '45');
    await act(async () => {
      resolvePreview?.(PREVIEW_30);
      await previewResponse;
    });

    expect(screen.queryByRole('dialog', { name: 'Policy Preview' })).toBeNull();
  });

  it.each([
    {
      detail: 'Draft Base 已落后，请刷新后重试',
      requestId: 'req-policy-publish-409',
      status: 409,
    },
    {
      detail: 'Policy 校验未通过',
      requestId: 'req-policy-publish-422',
      status: 422,
    },
  ])(
    'Publish $status 保留 Modal 并展示 detail 与 requestId',
    async ({ detail, requestId, status }) => {
      const totpCode = createTotpCode();
      arrangeValidDraft();
      administrationMocks.publishPolicyDraft.mockRejectedValueOnce(
        new ApiError({
          detail,
          requestId,
          status,
          title: 'POLICY_PUBLISH_ERROR',
        }),
      );
      const user = userEvent.setup();
      renderPage();

      const dialog = await publishVersionTwo(user, totpCode);

      expect(administrationMocks.publishPolicyDraft).toHaveBeenCalledWith(
        'identity',
        'draft-1',
        { reason: '收紧 Session 空闲期限', totpCode },
        '"v3"',
      );
      expect(await screen.findByText(new RegExp(detail))).toHaveTextContent(
        `requestId: ${requestId}`,
      );
      expect(dialog).toBeInTheDocument();
      await user.click(within(dialog).getByRole('button', { name: /取\s*消/ }));
      expect(screen.queryByRole('dialog', { name: '发布 Policy' })).toBeNull();
    },
  );

  it('Publish 成功刷新 catalog，当前值更新且版本增加一', async () => {
    const totpCode = createTotpCode();
    administrationMocks.listPolicyCatalog
      .mockReset()
      .mockResolvedValueOnce(POLICY_CATALOG_FIXTURE)
      .mockResolvedValueOnce(CATALOG_VERSION_2);
    administrationMocks.listPolicyVersions
      .mockReset()
      .mockResolvedValueOnce(POLICY_VERSION_FIXTURES)
      .mockResolvedValueOnce(VERSIONS_2);
    arrangeValidDraft();
    administrationMocks.publishPolicyDraft.mockResolvedValueOnce(
      PUBLISHED_VERSION_2,
    );
    const user = userEvent.setup();
    renderPage();

    const dialog = await publishVersionTwo(user, totpCode);

    expect(await screen.findByText('Policy 已发布')).toBeInTheDocument();
    expect(administrationMocks.publishPolicyDraft).toHaveBeenCalledWith(
      'identity',
      'draft-1',
      { reason: '收紧 Session 空闲期限', totpCode },
      '"v3"',
    );
    expect(await screen.findByText('版本 2', {}, INITIAL_WAIT)).toBeVisible();
    expect(
      screen.getByRole('spinbutton', { name: 'Session 空闲期限' }),
    ).toHaveValue('30');
    await waitFor(() => {
      expect(dialog).not.toBeInTheDocument();
    });
  });

  it('最近三次之外提供全部版本入口并展示完整历史', async () => {
    administrationMocks.listPolicyVersions.mockResolvedValueOnce(VERSIONS_4);
    const user = userEvent.setup();
    renderPage();
    await findPolicySettings();

    const history = screen.getByRole('region', { name: '版本历史' });
    const allVersions = await within(history).findByRole(
      'button',
      { name: '全部 4 个版本' },
      INITIAL_WAIT,
    );
    expect(within(history).getByText('最近 3 次')).toBeVisible();

    await user.click(allVersions);
    const drawer = await screen.findByRole(
      'dialog',
      { name: '版本历史' },
      INITIAL_WAIT,
    );
    expect(
      within(drawer).getByText('共 4 个版本 · 回滚只还原该版本涉及的配置项'),
    ).toBeVisible();
    for (const version of [4, 3, 2, 1]) {
      expect(within(drawer).getByText(`版本 ${version}`)).toBeVisible();
    }
  });

  it('从历史版本 Rollback 后通过公开入口进入新 Draft 编辑态', async () => {
    const totpCode = createTotpCode();
    administrationMocks.listPolicyCatalog.mockResolvedValueOnce(
      CATALOG_VERSION_2,
    );
    administrationMocks.listPolicyVersions.mockResolvedValueOnce(VERSIONS_2);
    administrationMocks.rollbackPolicyVersion.mockResolvedValueOnce(
      ROLLBACK_DRAFT,
    );
    const user = userEvent.setup();
    renderPage();
    await findPolicySettings();
    const rollback = await screen.findByRole(
      'button',
      { name: '回滚版本 1' },
      INITIAL_WAIT,
    );

    await user.click(rollback);
    const dialog = await screen.findByRole('dialog', {
      name: '创建回滚 Draft',
    });
    await user.type(
      within(dialog).getByRole('textbox', { name: '回滚原因' }),
      '回滚到稳定版本',
    );
    await user.type(
      within(dialog).getByRole('textbox', { name: 'TOTP 验证码' }),
      totpCode,
    );
    await user.click(within(dialog).getByRole('button', { name: '确认创建' }));

    expect(await screen.findByText('已创建回滚 Draft')).toBeInTheDocument();
    expect(administrationMocks.rollbackPolicyVersion).toHaveBeenCalledWith(
      'identity',
      {
        reason: '回滚到稳定版本',
        toVersion: 1,
        totpCode,
      },
      2,
    );
    const editor = await screen.findByRole('region', { name: 'Draft 编辑' });
    expect(
      within(editor).getByRole('spinbutton', { name: 'Session 空闲期限' }),
    ).toHaveValue('60');
  });

  it('Rollback 失败保留 Modal 与错误，取消后清理失败态', async () => {
    const totpCode = createTotpCode();
    administrationMocks.listPolicyCatalog.mockResolvedValueOnce(
      CATALOG_VERSION_2,
    );
    administrationMocks.listPolicyVersions.mockResolvedValueOnce(VERSIONS_2);
    administrationMocks.rollbackPolicyVersion.mockRejectedValueOnce(
      new ApiError({
        detail: '目标版本已不可回滚',
        requestId: 'req-policy-rollback-409',
        status: 409,
      }),
    );
    const user = userEvent.setup();
    renderPage();
    await findPolicySettings();
    await user.click(
      await screen.findByRole('button', { name: '回滚版本 1' }, INITIAL_WAIT),
    );
    const dialog = await screen.findByRole('dialog', {
      name: '创建回滚 Draft',
    });
    await user.type(
      within(dialog).getByRole('textbox', { name: '回滚原因' }),
      '验证失败态',
    );
    await user.type(
      within(dialog).getByRole('textbox', { name: 'TOTP 验证码' }),
      totpCode,
    );
    await user.click(within(dialog).getByRole('button', { name: '确认创建' }));

    expect(await screen.findByText(/目标版本已不可回滚/)).toHaveTextContent(
      'requestId: req-policy-rollback-409',
    );
    expect(dialog).toBeVisible();
    await user.click(within(dialog).getByRole('button', { name: /取\s*消/ }));
    expect(screen.queryByRole('dialog', { name: '创建回滚 Draft' })).toBeNull();
  });

  it('Catalog 与版本查询失败分别展示服务端问题', async () => {
    administrationMocks.listPolicyCatalog.mockRejectedValueOnce(
      new ApiError({
        detail: 'Policy Catalog 无权访问',
        requestId: 'req-policy-catalog-403',
        status: 403,
      }),
    );
    administrationMocks.listPolicyVersions.mockRejectedValueOnce(
      new ApiError({
        detail: 'Policy 历史无权访问',
        requestId: 'req-policy-versions-403',
        status: 403,
      }),
    );
    renderPage();

    expect(
      await screen.findByText(/Policy Catalog 无权访问/, {}, INITIAL_WAIT),
    ).toHaveTextContent('requestId: req-policy-catalog-403');
    expect(
      await screen.findByText(/Policy 历史无权访问/, {}, INITIAL_WAIT),
    ).toHaveTextContent('requestId: req-policy-versions-403');
    expect(
      screen.getByRole('button', { name: '重试加载 Policy Catalog' }),
    ).toBeVisible();
    expect(
      screen.getByRole('button', { name: '重试加载 Policy 历史' }),
    ).toBeVisible();
    expect(screen.getByText('该分类暂无已冻结策略')).toBeVisible();
  });

  it('存在未保存编辑时禁止 Rollback 覆盖当前 Draft', async () => {
    administrationMocks.listPolicyCatalog.mockResolvedValueOnce(
      CATALOG_VERSION_2,
    );
    administrationMocks.listPolicyVersions.mockResolvedValueOnce(VERSIONS_2);
    const user = userEvent.setup();
    renderPage();
    await findPolicySettings();
    await setIdleMinutes(user, '45');

    expect(
      await screen.findByRole('button', { name: '回滚版本 1' }, INITIAL_WAIT),
    ).toBeDisabled();
  });
});
