import { describe, expect, it } from 'vitest';
import {
  createCursorPagination,
  cursorForPage,
  hasNextCursorPage,
  loadRequirementTablePage,
  recordNextCursor,
} from './list.util';

describe('Requirement cursor pagination', () => {
  it('第一页不发送 cursor，只有服务端 nextCursor 才能解锁下一页', () => {
    const firstPage = createCursorPagination();

    expect(cursorForPage(firstPage, 1)).toBeUndefined();
    expect(hasNextCursorPage(firstPage, 1)).toBe(false);

    const secondPageReady = recordNextCursor(firstPage, 1, 'cursor-page-2');

    expect(hasNextCursorPage(secondPageReady, 1)).toBe(true);
    expect(cursorForPage(secondPageReady, 2)).toBe('cursor-page-2');
  });

  it('支持按已知 cursor 顺序前进和返回，不构造服务端 total', () => {
    const firstPage = createCursorPagination();
    const secondPageReady = recordNextCursor(firstPage, 1, 'cursor-page-2');
    const thirdPageReady = recordNextCursor(
      secondPageReady,
      2,
      'cursor-page-3',
    );

    expect(cursorForPage(thirdPageReady, 1)).toBeUndefined();
    expect(cursorForPage(thirdPageReady, 2)).toBe('cursor-page-2');
    expect(cursorForPage(thirdPageReady, 3)).toBe('cursor-page-3');
    expect(thirdPageReady).toEqual({
      cursors: [null, 'cursor-page-2', 'cursor-page-3'],
    });
  });

  it('终止 cursor 会截断旧的后续页，Workspace 切换可恢复第一页状态', () => {
    const staleThirdPage = recordNextCursor(
      recordNextCursor(createCursorPagination(), 1, 'cursor-page-2'),
      2,
      'cursor-page-3',
    );

    const terminalSecondPage = recordNextCursor(staleThirdPage, 2, null);

    expect(terminalSecondPage).toEqual({
      cursors: [null, 'cursor-page-2'],
    });
    expect(hasNextCursorPage(terminalSecondPage, 2)).toBe(false);
    expect(createCursorPagination()).toEqual({ cursors: [null] });
  });

  it('拒绝跳到尚未由服务端 cursor 解锁的页面', () => {
    const firstPage = createCursorPagination();

    expect(() => cursorForPage(firstPage, 2)).toThrowError(
      'Requirement cursor page 2 is not available',
    );
    expect(() => recordNextCursor(firstPage, 2, 'cursor-page-3')).toThrowError(
      'Requirement cursor page 2 is not available',
    );
  });
});

describe('Requirement ProTable request adapter', () => {
  it('把真实 cursor 页适配为成功结果且不添加 total', async () => {
    const requirement = {
      id: 'requirement-1',
      state: 'CREATED' as const,
      title: '建立任务分支',
      type: 'feat' as const,
      updatedAt: '2026-08-28T08:01:00Z',
      workspaceId: 'workspace-1',
    };

    await expect(
      loadRequirementTablePage(async () => ({
        items: [requirement],
        nextCursor: 'cursor-page-2',
      })),
    ).resolves.toEqual({
      data: [requirement],
      nextCursor: 'cursor-page-2',
      success: true,
    });
  });

  it('失败时返回 success:false、空数据并保留同一个归一化 Problem', async () => {
    const problem = new Error('Requirement list failed');

    const result = await loadRequirementTablePage(async () => {
      throw problem;
    });

    expect(result).toEqual({ data: [], error: problem, success: false });
    expect(result).not.toHaveProperty('total');
  });
});
