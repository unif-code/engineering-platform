import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfigProvider } from 'antd';
import { describe, expect, it, vi } from 'vitest';
import { POLICY_CATALOG_FIXTURE } from '../../../tests/fixtures/accessGovernance';
import { applyPolicyNumberInput, PolicyDraftEditor } from './PolicyDraftEditor';

function policyByType(valueType: 'ENUM' | 'INTEGER') {
  const policy = POLICY_CATALOG_FIXTURE.items.find(
    (item) => item.valueType === valueType,
  );
  if (!policy) {
    throw new Error(`Policy fixture must include ${valueType} values`);
  }
  return policy;
}

const integerPolicy = policyByType('INTEGER');
const enumPolicy = policyByType('ENUM');

function renderEditor(
  content: Record<string, number | string | null>,
  onChange = vi.fn(),
) {
  render(
    <ConfigProvider theme={{ token: { motion: false } }}>
      <PolicyDraftEditor
        catalog={[integerPolicy, enumPolicy]}
        content={content}
        onChange={onChange}
      />
    </ConfigProvider>,
  );
  return onChange;
}

describe('PolicyDraftEditor', () => {
  it('只把空值和有限数字传给策略草稿', () => {
    const onChange = vi.fn();

    applyPolicyNumberInput(' ', integerPolicy.key, onChange);
    applyPolicyNumberInput('42', integerPolicy.key, onChange);
    applyPolicyNumberInput('not-a-number', integerPolicy.key, onChange);

    expect(onChange.mock.calls).toEqual([
      [integerPolicy.key, null],
      [integerPolicy.key, 42],
    ]);
  });

  it('把枚举选择通过真实策略 key 回传', async () => {
    const user = userEvent.setup();
    const onChange = renderEditor({
      [enumPolicy.key]: enumPolicy.activeValue,
      [integerPolicy.key]: integerPolicy.activeValue,
    });

    await user.click(screen.getByRole('combobox', { name: enumPolicy.label }));
    await user.click(screen.getByRole('option', { name: '90 天' }));

    expect(onChange).toHaveBeenCalledWith(enumPolicy.key, '90_DAYS');
  });

  it('类型不匹配时不把错误值传给控件', () => {
    renderEditor({
      [enumPolicy.key]: 123,
      [integerPolicy.key]: 'not-a-number',
    });

    expect(
      screen.getByRole('combobox', { name: enumPolicy.label }),
    ).toHaveTextContent('');
    expect(
      screen.getByRole('spinbutton', { name: integerPolicy.label }),
    ).toHaveValue('');
  });
});
