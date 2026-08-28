import { describe, expect, it, vi } from 'vitest';
import {
  canonicalizeRequirementInput,
  prepareRequirementSubmission,
} from './submission';
import type { CreateRequirementInput } from './type';

const input: CreateRequirementInput = {
  acceptanceCriteria: ['任务分支必须来自精确 main SHA'],
  description: '创建第一个确定性任务分支',
  initialRepositoryId: 'repository-1',
  title: '建立任务分支',
  type: 'feat',
  workspaceId: 'workspace-1',
};

describe('Requirement submission identity', () => {
  it('提交前规范化用户文本，但保留 acceptance criteria 顺序', () => {
    expect(
      canonicalizeRequirementInput({
        ...input,
        acceptanceCriteria: ['  第一条  ', ' 第二条 '],
        description: '  创建第一个确定性任务分支  ',
        title: '  建立任务分支  ',
      }),
    ).toEqual({
      ...input,
      acceptanceCriteria: ['第一条', '第二条'],
    });
  });

  it('首次提交生成 key，网络结果未知后的相同规范 payload 重试复用 key', () => {
    const createKey = vi
      .fn<() => string>()
      .mockReturnValueOnce('requirement-key-1')
      .mockReturnValueOnce('requirement-key-2');

    const first = prepareRequirementSubmission(input, undefined, createKey);
    const retry = prepareRequirementSubmission(
      {
        ...input,
        acceptanceCriteria: [' 任务分支必须来自精确 main SHA '],
        description: ` ${input.description} `,
      },
      first.identity,
      createKey,
    );

    expect(first.input).toEqual(input);
    expect(first.identity.idempotencyKey).toBe('requirement-key-1');
    expect(retry).toEqual(first);
    expect(createKey).toHaveBeenCalledTimes(1);
  });

  it('任一规范 payload 字段变化都会建立新的 submission/key', () => {
    const createKey = vi
      .fn<() => string>()
      .mockReturnValueOnce('requirement-key-1')
      .mockReturnValueOnce('requirement-key-2');
    const first = prepareRequirementSubmission(input, undefined, createKey);

    const edited = prepareRequirementSubmission(
      { ...input, title: '建立并验证任务分支' },
      first.identity,
      createKey,
    );

    expect(edited.input.title).toBe('建立并验证任务分支');
    expect(edited.identity.idempotencyKey).toBe('requirement-key-2');
    expect(edited.identity.canonicalPayload).not.toBe(
      first.identity.canonicalPayload,
    );
    expect(createKey).toHaveBeenCalledTimes(2);
  });

  it('acceptance criteria 调序也属于 payload 变化', () => {
    const createKey = vi
      .fn<() => string>()
      .mockReturnValueOnce('requirement-key-1')
      .mockReturnValueOnce('requirement-key-2');
    const first = prepareRequirementSubmission(
      { ...input, acceptanceCriteria: ['第一条', '第二条'] },
      undefined,
      createKey,
    );

    const reordered = prepareRequirementSubmission(
      { ...input, acceptanceCriteria: ['第二条', '第一条'] },
      first.identity,
      createKey,
    );

    expect(reordered.identity.idempotencyKey).toBe('requirement-key-2');
  });
});
