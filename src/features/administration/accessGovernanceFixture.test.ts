import { describe, expect, it } from 'vitest';
import {
  ACCOUNT_FIXTURES,
  AUDIT_EVENT_FIXTURES,
  GRANT_FIXTURES,
  ORGANIZATION_TREE_FIXTURE,
  POLICY_CATALOG_FIXTURE,
  POLICY_VERSION_FIXTURES,
  WORKSPACE_FIXTURES,
} from '../../../tests/fixtures/accessGovernance';

const expectDeeplyFrozen = (value: unknown): void => {
  if (typeof value !== 'object' || value === null) {
    return;
  }
  expect(Object.isFrozen(value)).toBe(true);
  for (const child of Object.values(value)) {
    expectDeeplyFrozen(child);
  }
};

describe('access governance shared DTO fixtures', () => {
  it('rejects mutation of the organization root collection', () => {
    expect(() => {
      ORGANIZATION_TREE_FIXTURE.items.push(ORGANIZATION_TREE_FIXTURE.items[0]);
    }).toThrow(TypeError);
  });

  it('rejects mutation of nested organization children', () => {
    expect(() => {
      ORGANIZATION_TREE_FIXTURE.items[0].children.splice(0, 1);
    }).toThrow(TypeError);
  });

  it('rejects mutation of nested Workspace leaders', () => {
    expect(() => {
      WORKSPACE_FIXTURES[0].leaders.push(WORKSPACE_FIXTURES[0].owner);
    }).toThrow(TypeError);
  });

  it('deep-freezes every exported fixture graph', () => {
    expectDeeplyFrozen(ACCOUNT_FIXTURES);
    expectDeeplyFrozen(ORGANIZATION_TREE_FIXTURE);
    expectDeeplyFrozen(WORKSPACE_FIXTURES);
    expectDeeplyFrozen(AUDIT_EVENT_FIXTURES);
    expectDeeplyFrozen(GRANT_FIXTURES);
    expectDeeplyFrozen(POLICY_CATALOG_FIXTURE);
    expectDeeplyFrozen(POLICY_VERSION_FIXTURES);
  });
});
