import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AdminSkillsPage from '.';

describe('AdminSkillsPage', () => {
  it('保留最终原型的技能目录与详情空间并明确无真实数据', () => {
    render(<AdminSkillsPage />);

    expect(
      screen.getByText(
        'SDD 方法与仓库规范技能随版本包发布；Agent 按仓库技术栈自动匹配，执行启动时版本冻结进 Binding（执行绑定）',
      ),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: '新建技能' })).toMatchObject({
      disabled: true,
      title: '当前版本暂未接入',
    });

    for (const regionName of ['技能目录', '规范原文', '版本历史']) {
      expect(
        within(screen.getByRole('region', { name: regionName })).getByText(
          '当前没有真实数据',
        ),
      ).toBeVisible();
    }
  });

  it('不再渲染静态技能、版本与人员记录', () => {
    render(<AdminSkillsPage />);

    for (const staleText of [
      'superpowers',
      'grill-me',
      '前端开发规范 (React)',
      '康宁',
      'v5.0',
    ]) {
      expect(screen.queryAllByText(staleText)).toHaveLength(0);
    }
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
