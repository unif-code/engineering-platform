import type { RequirementListPage, RequirementSummary } from './type';

export type RequirementTablePageResult =
  | {
      data: RequirementSummary[];
      nextCursor: string | null;
      success: true;
    }
  | {
      data: [];
      error: unknown;
      success: false;
    };

export interface CursorPagination {
  readonly cursors: readonly (string | null)[];
}

export function createCursorPagination(): CursorPagination {
  return { cursors: [null] };
}

function assertCursorPage(pagination: CursorPagination, page: number): void {
  if (
    !Number.isSafeInteger(page) ||
    page < 1 ||
    page > pagination.cursors.length
  ) {
    throw new RangeError(`Requirement cursor page ${page} is not available`);
  }
}

export function cursorForPage(
  pagination: CursorPagination,
  page: number,
): string | undefined {
  assertCursorPage(pagination, page);
  return pagination.cursors[page - 1] ?? undefined;
}

export function hasNextCursorPage(
  pagination: CursorPagination,
  page: number,
): boolean {
  assertCursorPage(pagination, page);
  return page < pagination.cursors.length;
}

export function recordNextCursor(
  pagination: CursorPagination,
  page: number,
  nextCursor: string | null,
): CursorPagination {
  assertCursorPage(pagination, page);
  return {
    cursors: [
      ...pagination.cursors.slice(0, page),
      ...(nextCursor === null ? [] : [nextCursor]),
    ],
  };
}

export async function loadRequirementTablePage(
  load: () => Promise<RequirementListPage>,
): Promise<RequirementTablePageResult> {
  try {
    const page = await load();
    return {
      data: page.items,
      nextCursor: page.nextCursor,
      success: true,
    };
  } catch (error) {
    return { data: [], error, success: false };
  }
}
