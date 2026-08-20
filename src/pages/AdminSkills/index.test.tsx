import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from 'antd';
import { describe, expect, it } from 'vitest';
import AdminSkillsPage from '.';
import { getPreviousVersion, getPreviousVersions } from './version';

function renderPage() {
  return render(
    <App>
      <AdminSkillsPage />
    </App>,
  );
}

function getSkillOption(skillKey: string) {
  return screen.getByRole('button', {
    name: `选择技能 ${skillKey}`,
  });
}

function getSkillDetail(skillKey: string) {
  return screen.getByRole('region', {
    name: `${skillKey} 技能详情`,
  });
}

async function expectStaticAction(action: string) {
  const expected = `静态原型操作：${action}，未保存任何业务数据。`;

  await waitFor(() => {
    expect(
      screen
        .getAllByRole('alert')
        .some((alert) => alert.textContent?.includes(expected)),
    ).toBe(true);
  });
}

describe('AdminSkillsPage', () => {
  it('只为可递减的有效版本生成历史版本', () => {
    expect(getPreviousVersion('invalid')).toBeUndefined();
    expect(getPreviousVersion('v1.0')).toBeUndefined();
    expect(getPreviousVersion('v1.2')).toBe('v1.1');
    expect(getPreviousVersions('v1.0')).toEqual([]);
    expect(getPreviousVersions('v1.2')).toEqual(['v1.1']);
  });

  it('按原型呈现分组目录、规范原文和版本历史', async () => {
    const user = userEvent.setup();
    renderPage();

    const catalog = screen.getByRole('region', { name: '技能目录' });
    expect(
      within(catalog).getAllByRole('button', { name: /选择技能/ }),
    ).toHaveLength(9);
    expect(within(catalog).getByText('SDD 方法')).toBeInTheDocument();
    expect(within(catalog).getByText('仓库规范')).toBeInTheDocument();
    expect(within(catalog).getByText('平台默认')).toBeInTheDocument();
    expect(getSkillOption('superpowers')).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    const superpowersDetail = getSkillDetail('superpowers');
    expect(superpowersDetail).toHaveTextContent('SDD 方法');
    expect(superpowersDetail).toHaveTextContent('v5.0');
    expect(superpowersDetail).toHaveTextContent('214 任务');
    expect(superpowersDetail).toHaveTextContent('启用');
    expect(
      within(superpowersDetail).getByRole('heading', { name: '规范原文' }),
    ).toBeInTheDocument();
    expect(
      within(superpowersDetail).getByRole('heading', { name: '版本历史' }),
    ).toBeInTheDocument();

    await user.click(getSkillOption('pr-review-bot'));
    const reviewDetail = getSkillDetail('pr-review-bot');
    expect(reviewDetail).toHaveTextContent('PR 机器人审核');
    expect(
      within(reviewDetail).getByRole('img', { name: '平台默认，受保护' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '新建技能' })).toBeVisible();
    expect(
      screen.getByText(
        'SDD 方法与仓库规范技能随版本包发布；Agent 按仓库技术栈自动匹配，执行启动时版本冻结进 Binding（执行绑定）',
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(
        '管理 Agent 可用 Skill 的版本与生命周期；当前页面为静态数据投影',
      ),
    ).not.toBeInTheDocument();
  });

  it('新建技能先呈现对话生成、导入 ZIP 与手动创建三种入口', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: '新建技能' }));
    const dialog = await screen.findByRole('dialog', { name: '新建技能' });

    expect(
      within(dialog).getByRole('button', { name: /对话生成/ }),
    ).toHaveTextContent('描述目标，AI 生成规范草稿');
    expect(
      within(dialog).getByRole('button', { name: /导入 ZIP/ }),
    ).toHaveTextContent('上传规范文档包，解析生成');
    expect(
      within(dialog).getByRole('button', { name: /手动创建/ }),
    ).toHaveTextContent('按表单逐项填写');
    await user.click(within(dialog).getByRole('button', { name: 'Close' }));
  });

  it('对话生成先预览 AI 草稿，确认后只反馈且不添加技能', async () => {
    const user = userEvent.setup();
    renderPage();
    const initialSkillCount = screen.getAllByRole('button', {
      name: /选择技能/,
    }).length;

    await user.click(screen.getByRole('button', { name: '新建技能' }));
    await user.click(
      within(await screen.findByRole('dialog', { name: '新建技能' })).getByRole(
        'button',
        { name: /对话生成/ },
      ),
    );
    const chatDialog = await screen.findByRole('dialog', {
      name: '对话生成技能',
    });
    await user.type(
      within(chatDialog).getByRole('textbox', {
        name: '用一句话描述要生成的规范',
      }),
      '为所有 HTTP API 制定统一错误码规范',
    );
    await user.click(
      within(chatDialog).getByRole('button', { name: '生成草稿' }),
    );

    expect(within(chatDialog).getByText(/AI 草稿/)).toBeInTheDocument();
    expect(within(chatDialog).getByText('接口错误码规范')).toBeInTheDocument();
    expect(
      within(chatDialog).getByText('为所有 HTTP API 制定统一错误码规范'),
    ).toBeInTheDocument();
    await user.click(
      within(chatDialog).getByRole('button', { name: '返回修改' }),
    );
    expect(
      within(chatDialog).getByRole('textbox', {
        name: '用一句话描述要生成的规范',
      }),
    ).toHaveValue('为所有 HTTP API 制定统一错误码规范');
    expect(within(chatDialog).queryByText(/AI 草稿/)).not.toBeInTheDocument();
    await user.click(
      within(chatDialog).getByRole('button', { name: '生成草稿' }),
    );
    await user.click(
      within(chatDialog).getByRole('button', { name: '确认创建' }),
    );

    await expectStaticAction('对话生成技能 接口错误码规范');
    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: '对话生成技能' }),
      ).not.toBeInTheDocument();
    });
    expect(screen.getAllByRole('button', { name: /选择技能/ })).toHaveLength(
      initialSkillCount,
    );
    expect(screen.queryByText('接口错误码规范')).not.toBeInTheDocument();
  });

  it('导入 ZIP 明示演示文件，解析后只反馈且不添加技能', async () => {
    const user = userEvent.setup();
    renderPage();
    const initialSkillCount = screen.getAllByRole('button', {
      name: /选择技能/,
    }).length;

    await user.click(screen.getByRole('button', { name: '新建技能' }));
    await user.click(
      within(await screen.findByRole('dialog', { name: '新建技能' })).getByRole(
        'button',
        { name: /导入 ZIP/ },
      ),
    );
    const zipDialog = await screen.findByRole('dialog', {
      name: '导入 ZIP 生成技能',
    });
    expect(within(zipDialog).getByText('fe-standards.zip')).toBeInTheDocument();
    expect(
      within(zipDialog).getByText(/已就绪（演示文件）/),
    ).toBeInTheDocument();
    await user.click(
      within(zipDialog).getByRole('button', { name: '解析并生成' }),
    );

    await expectStaticAction('导入 ZIP 生成技能');
    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: '导入 ZIP 生成技能' }),
      ).not.toBeInTheDocument();
    });
    expect(screen.getAllByRole('button', { name: /选择技能/ })).toHaveLength(
      initialSkillCount,
    );
    expect(
      screen.queryByRole('button', { name: '选择技能 前端工程规范 (Vue3)' }),
    ).not.toBeInTheDocument();
  });

  it('手动创建使用原型字段，合法提交只反馈且重开为空', async () => {
    const user = userEvent.setup();
    renderPage();
    const initialSkillCount = screen.getAllByRole('button', {
      name: /选择技能/,
    }).length;

    await user.click(screen.getByRole('button', { name: '新建技能' }));
    await user.click(
      within(await screen.findByRole('dialog', { name: '新建技能' })).getByRole(
        'button',
        { name: /手动创建/ },
      ),
    );
    const dialog = await screen.findByRole('dialog', { name: '手动创建技能' });

    await user.type(
      within(dialog).getByRole('textbox', { name: '技能名称' }),
      '静态测试 Skill',
    );
    await user.click(within(dialog).getByRole('combobox', { name: '类型' }));
    await user.click(await screen.findByRole('option', { name: '仓库规范' }));
    await user.type(
      within(dialog).getByRole('textbox', { name: '适用技术栈' }),
      'React 19 / TypeScript',
    );
    await user.type(
      within(dialog).getByRole('textbox', { name: '规范内容' }),
      '仅验证静态原型提交',
    );
    await user.type(
      within(dialog).getByRole('textbox', { name: '发布版本' }),
      'v0.1',
    );
    await user.click(within(dialog).getByRole('button', { name: /新\s*建/ }));

    await expectStaticAction('新建技能');
    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: '手动创建技能' }),
      ).not.toBeInTheDocument();
    });
    expect(screen.getAllByRole('button', { name: /选择技能/ })).toHaveLength(
      initialSkillCount,
    );
    expect(
      screen.queryByRole('button', { name: '选择技能 静态测试 Skill' }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '新建技能' }));
    await user.click(
      within(await screen.findByRole('dialog', { name: '新建技能' })).getByRole(
        'button',
        { name: /手动创建/ },
      ),
    );
    const reopenedDialog = await screen.findByRole('dialog', {
      name: '手动创建技能',
    });
    expect(
      within(reopenedDialog).getByRole('textbox', { name: '技能名称' }),
    ).toHaveValue('');
    expect(
      within(reopenedDialog).getByRole('textbox', { name: '适用技术栈' }),
    ).toHaveValue('');
    await user.click(
      within(reopenedDialog).getByRole('button', { name: /取\s*消/ }),
    );
  });

  it('编辑 Modal 回填 fixture，提交并重开后仍保持原值与状态', async () => {
    const user = userEvent.setup();
    renderPage();
    const superpowersDetail = getSkillDetail('superpowers');

    await user.click(
      within(superpowersDetail).getByRole('button', {
        name: '编辑 / 发版 superpowers',
      }),
    );
    const dialog = await screen.findByRole('dialog', { name: '编辑技能' });
    const nameInput = within(dialog).getByRole('textbox', {
      name: '技能名称',
    });

    expect(nameInput).toHaveValue('superpowers');
    expect(
      within(dialog).getByRole('textbox', { name: '发布新版本' }),
    ).toHaveValue('v5.0');
    expect(
      within(dialog).getByRole('textbox', { name: '变更说明' }),
    ).toHaveValue('');
    expect(
      within(dialog).queryByRole('combobox', { name: '类型' }),
    ).not.toBeInTheDocument();
    expect(
      within(dialog).queryByRole('textbox', { name: '适用技术栈' }),
    ).not.toBeInTheDocument();
    expect(
      within(dialog).queryByRole('textbox', { name: '规范内容' }),
    ).not.toBeInTheDocument();

    await user.clear(nameInput);
    await user.type(nameInput, '不会保存的名称');
    await user.type(
      within(dialog).getByRole('textbox', { name: '变更说明' }),
      '优化执行约束',
    );
    await user.click(within(dialog).getByRole('button', { name: /保\s*存/ }));

    await expectStaticAction('编辑技能 superpowers');
    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: '编辑技能' }),
      ).not.toBeInTheDocument();
    });

    const unchangedDetail = getSkillDetail('superpowers');
    expect(unchangedDetail).toHaveTextContent('superpowers');
    expect(unchangedDetail).not.toHaveTextContent('不会保存的名称');
    expect(unchangedDetail).toHaveTextContent('启用');

    await user.click(
      within(unchangedDetail).getByRole('button', {
        name: '编辑 / 发版 superpowers',
      }),
    );
    const reopenedDialog = await screen.findByRole('dialog', {
      name: '编辑技能',
    });
    expect(
      within(reopenedDialog).getByRole('textbox', { name: '技能名称' }),
    ).toHaveValue('superpowers');
    await user.click(
      within(reopenedDialog).getByRole('button', { name: /取\s*消/ }),
    );
  });

  it('启用切换与归档只反馈，不改变 card 集合或状态', async () => {
    const user = userEvent.setup();
    renderPage();
    const initialSkillCount = screen.getAllByRole('button', {
      name: /选择技能/,
    }).length;
    const superpowersDetail = getSkillDetail('superpowers');

    await user.click(
      within(superpowersDetail).getByRole('button', {
        name: '启用切换 superpowers',
      }),
    );
    await expectStaticAction('启用切换 Skill superpowers');

    await user.click(getSkillOption('uniapp'));
    const inactiveDetail = getSkillDetail('uniapp');
    expect(inactiveDetail).toHaveTextContent('禁用');
    await user.click(
      within(inactiveDetail).getByRole('button', {
        name: '禁用切换 uniapp',
      }),
    );
    await expectStaticAction('禁用切换 Skill uniapp');

    await user.click(getSkillOption('frontend-react'));
    const reactDetail = getSkillDetail('frontend-react');
    await user.click(
      within(reactDetail).getByRole('button', {
        name: '归档 frontend-react',
      }),
    );
    await expectStaticAction('归档 Skill frontend-react');

    expect(screen.getAllByRole('button', { name: /选择技能/ })).toHaveLength(
      initialSkillCount,
    );
    await user.click(getSkillOption('superpowers'));
    expect(getSkillDetail('superpowers')).toHaveTextContent('启用');
    await user.click(getSkillOption('pr-review-bot'));
    expect(getSkillDetail('pr-review-bot')).toHaveTextContent('启用');
    const protectedArchive = within(getSkillDetail('pr-review-bot')).getByRole(
      'button',
      { name: '归档 pr-review-bot' },
    );
    expect(protectedArchive).toBeDisabled();
    expect(protectedArchive).toHaveAttribute(
      'title',
      '平台默认技能受保护，不可归档',
    );
  });
});
