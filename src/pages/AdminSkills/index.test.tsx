import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from 'antd';
import { describe, expect, it } from 'vitest';
import AdminSkillsPage from '.';

function renderPage() {
  return render(
    <App>
      <AdminSkillsPage />
    </App>,
  );
}

function getSkillCard(skillKey: string) {
  return screen.getByRole('article', {
    name: `${skillKey} 技能卡片`,
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
  it('以卡片目录呈现固定 Skill 及 active/deprecated 状态', () => {
    renderPage();

    const catalog = screen.getByRole('region', { name: '技能目录' });
    expect(within(catalog).getAllByRole('article')).toHaveLength(3);

    const requirementCard = getSkillCard('requirement-clarifier');
    expect(requirementCard).toHaveTextContent('需求澄清');
    expect(requirementCard).toHaveTextContent('1.4.0');
    expect(requirementCard).toHaveTextContent('active');

    expect(getSkillCard('implementation-planner')).toBeInTheDocument();

    const reviewCard = getSkillCard('code-reviewer');
    expect(reviewCard).toHaveTextContent('代码审查');
    expect(reviewCard).toHaveTextContent('deprecated');
  });

  it('新增 Modal 包含规定字段，合法提交只反馈且重开为空', async () => {
    const user = userEvent.setup();
    renderPage();
    const initialCardCount = screen.getAllByRole('article').length;

    await user.click(screen.getByRole('button', { name: '新增 Skill' }));
    const dialog = await screen.findByRole('dialog', { name: '新增 Skill' });

    await user.type(
      within(dialog).getByRole('textbox', { name: '名称' }),
      '静态测试 Skill',
    );
    await user.type(
      within(dialog).getByRole('textbox', { name: 'Key' }),
      'static-test-skill',
    );
    await user.type(
      within(dialog).getByRole('textbox', { name: '版本' }),
      '0.1.0',
    );
    await user.type(
      within(dialog).getByRole('textbox', { name: '说明' }),
      '仅验证静态原型提交',
    );
    await user.click(within(dialog).getByRole('button', { name: /新\s*增/ }));

    await expectStaticAction('新增 Skill');
    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: '新增 Skill' }),
      ).not.toBeInTheDocument();
    });
    expect(screen.getAllByRole('article')).toHaveLength(initialCardCount);
    expect(
      screen.queryByRole('article', {
        name: 'static-test-skill 技能卡片',
      }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '新增 Skill' }));
    const reopenedDialog = await screen.findByRole('dialog', {
      name: '新增 Skill',
    });
    expect(
      within(reopenedDialog).getByRole('textbox', { name: '名称' }),
    ).toHaveValue('');
    expect(
      within(reopenedDialog).getByRole('textbox', { name: 'Key' }),
    ).toHaveValue('');
  });

  it('编辑 Modal 回填 fixture，提交并重开后仍保持原值与状态', async () => {
    const user = userEvent.setup();
    renderPage();
    const requirementCard = getSkillCard('requirement-clarifier');

    await user.click(
      within(requirementCard).getByRole('button', {
        name: '编辑 requirement-clarifier',
      }),
    );
    const dialog = await screen.findByRole('dialog', { name: '编辑 Skill' });
    const nameInput = within(dialog).getByRole('textbox', { name: '名称' });

    expect(nameInput).toHaveValue('需求澄清');
    expect(within(dialog).getByRole('textbox', { name: 'Key' })).toHaveValue(
      'requirement-clarifier',
    );
    expect(within(dialog).getByRole('textbox', { name: '版本' })).toHaveValue(
      '1.4.0',
    );
    expect(within(dialog).getByRole('textbox', { name: '说明' })).toHaveValue(
      '把模糊需求整理为可验证的目标、范围与约束。',
    );

    await user.clear(nameInput);
    await user.type(nameInput, '不会保存的名称');
    await user.click(within(dialog).getByRole('button', { name: /保\s*存/ }));

    await expectStaticAction('编辑 Skill requirement-clarifier');
    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: '编辑 Skill' }),
      ).not.toBeInTheDocument();
    });

    const unchangedCard = getSkillCard('requirement-clarifier');
    expect(unchangedCard).toHaveTextContent('需求澄清');
    expect(unchangedCard).not.toHaveTextContent('不会保存的名称');
    expect(unchangedCard).toHaveTextContent('active');

    await user.click(
      within(unchangedCard).getByRole('button', {
        name: '编辑 requirement-clarifier',
      }),
    );
    const reopenedDialog = await screen.findByRole('dialog', {
      name: '编辑 Skill',
    });
    expect(
      within(reopenedDialog).getByRole('textbox', { name: '名称' }),
    ).toHaveValue('需求澄清');
  });

  it('发版、停用与归档只反馈，不改变 card 集合或 status', async () => {
    const user = userEvent.setup();
    renderPage();
    const initialCardCount = screen.getAllByRole('article').length;
    const requirementCard = getSkillCard('requirement-clarifier');

    await user.click(
      within(requirementCard).getByRole('button', {
        name: '发版 requirement-clarifier',
      }),
    );
    await expectStaticAction('发版 Skill requirement-clarifier');

    await user.click(
      within(requirementCard).getByRole('button', {
        name: '停用 requirement-clarifier',
      }),
    );
    await expectStaticAction('停用 Skill requirement-clarifier');

    const reviewCard = getSkillCard('code-reviewer');
    await user.click(
      within(reviewCard).getByRole('button', {
        name: '归档 code-reviewer',
      }),
    );
    await expectStaticAction('归档 Skill code-reviewer');

    expect(screen.getAllByRole('article')).toHaveLength(initialCardCount);
    expect(getSkillCard('requirement-clarifier')).toHaveTextContent('active');
    expect(getSkillCard('code-reviewer')).toHaveTextContent('deprecated');
  });
});
