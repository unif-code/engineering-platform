import { describe, expect, it } from 'vitest';
import type { GrantSummary } from '@/features/administration';
import { GRANT_FIXTURES } from '../../../tests/fixtures/accessGovernance';
import { toGrantRow } from './constant';

function unknownGrant(
  capability: string,
  source: GrantSummary['source'],
): GrantSummary {
  return {
    ...GRANT_FIXTURES[0],
    capability,
    id: `unknown-${capability}`,
    source,
  };
}

describe('toGrantRow', () => {
  it('未知管理能力默认为当前管理员授予的高危直接授权', () => {
    expect(toGrantRow(unknownGrant('admin.unknown', 'MANUAL'))).toMatchObject({
      grantedBy: '当前管理员',
      principal: { type: 'ACCOUNT' },
      risk: 'HIGH',
      source: 'DIRECT',
    });
  });

  it('未知普通能力保持普通风险和继承来源', () => {
    expect(toGrantRow(unknownGrant('task.unknown', 'INHERITED'))).toMatchObject(
      {
        risk: 'NORMAL',
        source: 'INHERITED',
      },
    );
  });
});
