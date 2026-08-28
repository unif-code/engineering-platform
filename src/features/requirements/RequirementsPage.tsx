import {
  type ActionType,
  PageContainer,
  type ProColumns,
  ProTable,
  type ProTableProps,
} from '@ant-design/pro-components';
import { history, useLocation, useModel } from '@umijs/max';
import { Alert, Button, Empty, Select, Typography } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SemanticTag } from '@/components/SemanticTag';
import { hasWorkspaceCapability } from '@/features/auth';
import { CreateRequirementModal } from './CreateRequirementModal';
import {
  REQUIREMENT_PAGE_SIZE,
  REQUIREMENT_STATE_META,
  REQUIREMENT_TYPE_META,
} from './constant';
import { formatRequirementError } from './error';
import { useStyles } from './index.style';
import { loadRequirementTablePage } from './list.util';
import { listRequirements } from './service';
import type { CreateRequirementResult, RequirementSummary } from './type';

interface RequirementTableParams {
  cursor?: string;
  cursorPage: number;
  limit: number;
  workspaceId: string;
}

interface RequirementListLocation {
  cursor?: string;
  page: number;
  previous?: RequirementListLocation;
  workspaceId?: string;
}

interface RequirementListHistoryState {
  requirementList?: RequirementListLocation;
}

function parseRequirementListLocation(
  search: string,
  readableWorkspaceIds: ReadonlySet<string>,
  fallbackWorkspaceId?: string,
): RequirementListLocation {
  const params = new URLSearchParams(search);
  const requestedWorkspaceId = params.get('workspaceId') ?? undefined;
  const workspaceId =
    requestedWorkspaceId && readableWorkspaceIds.has(requestedWorkspaceId)
      ? requestedWorkspaceId
      : fallbackWorkspaceId;
  const cursor = params.get('cursor')?.trim() || undefined;
  const requestedPage = Number(params.get('page'));
  const page =
    cursor && Number.isSafeInteger(requestedPage) && requestedPage >= 2
      ? requestedPage
      : 1;
  return {
    ...(page === 1 ? {} : { cursor }),
    page,
    workspaceId,
  };
}

function buildRequirementListPath(location: RequirementListLocation): string {
  const params = new URLSearchParams();
  if (location.workspaceId) {
    params.set('workspaceId', location.workspaceId);
  }
  if (location.cursor) {
    params.set('cursor', location.cursor);
    params.set('page', String(location.page));
  }
  const search = params.toString();
  return search ? `/requirements?${search}` : '/requirements';
}

const formatUpdatedAt = (value: string) =>
  new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    hour12: false,
    timeStyle: 'short',
    timeZone: 'Asia/Shanghai',
  }).format(new Date(value));

export function RequirementsPage() {
  const { styles } = useStyles();
  const { initialState } = useModel('@@initialState');
  const location = useLocation();
  const sessionKey =
    initialState?.principal?.accountId ?? initialState?.principal?.employeeId;
  const actionRef = useRef<ActionType | undefined>(undefined);
  const requestSequenceRef = useRef(0);
  const readableWorkspaces = useMemo(
    () =>
      (initialState?.workspaces ?? []).filter((workspace) =>
        hasWorkspaceCapability(
          initialState?.scopedCapabilities ?? [],
          'requirement.read',
          workspace.id,
        ),
      ),
    [initialState?.scopedCapabilities, initialState?.workspaces],
  );
  const createWorkspaces = useMemo(
    () =>
      (initialState?.workspaces ?? []).filter((workspace) =>
        hasWorkspaceCapability(
          initialState?.scopedCapabilities ?? [],
          'requirement.create',
          workspace.id,
        ),
      ),
    [initialState?.scopedCapabilities, initialState?.workspaces],
  );
  const readableWorkspaceIds = useMemo(
    () => new Set(readableWorkspaces.map((workspace) => workspace.id)),
    [readableWorkspaces],
  );
  const initialListLocation = parseRequirementListLocation(
    location.search,
    readableWorkspaceIds,
    readableWorkspaces[0]?.id,
  );
  const [workspaceId, setWorkspaceId] = useState<string | undefined>(
    () => initialListLocation.workspaceId,
  );
  const [currentPage, setCurrentPage] = useState(initialListLocation.page);
  const [currentCursor, setCurrentCursor] = useState<string | undefined>(
    initialListLocation.cursor,
  );
  const previousLocationRef = useRef<RequirementListLocation | undefined>(
    undefined,
  );
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [rows, setRows] = useState<RequirementSummary[]>([]);
  const [listError, setListError] = useState<unknown>();
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const invalidatePendingRequests = useCallback(() => {
    requestSequenceRef.current += 1;
  }, []);

  const applyListLocation = useCallback(
    (nextLocation: RequirementListLocation) => {
      invalidatePendingRequests();
      setWorkspaceId(nextLocation.workspaceId);
      setCurrentPage(nextLocation.page);
      setCurrentCursor(nextLocation.cursor);
      previousLocationRef.current = nextLocation.previous;
      setNextCursor(null);
      setRows([]);
      setListError(undefined);
    },
    [invalidatePendingRequests],
  );

  useEffect(() => {
    const parsedLocation = parseRequirementListLocation(
      location.search,
      readableWorkspaceIds,
      readableWorkspaces[0]?.id,
    );
    const historyLocation = (
      location.state as RequirementListHistoryState | null
    )?.requirementList;
    const nextLocation =
      historyLocation &&
      buildRequirementListPath(historyLocation) ===
        buildRequirementListPath(parsedLocation)
        ? { ...parsedLocation, previous: historyLocation.previous }
        : parsedLocation;
    if (
      workspaceId !== nextLocation.workspaceId ||
      currentPage !== nextLocation.page ||
      currentCursor !== nextLocation.cursor ||
      previousLocationRef.current !== nextLocation.previous
    ) {
      applyListLocation(nextLocation);
    }
    const canonicalPath = buildRequirementListPath(nextLocation);
    if (`${location.pathname}${location.search}` !== canonicalPath) {
      history.replace(canonicalPath, { requirementList: nextLocation });
    }
  }, [
    applyListLocation,
    currentCursor,
    currentPage,
    location.pathname,
    location.search,
    location.state,
    readableWorkspaceIds,
    readableWorkspaces,
    workspaceId,
  ]);

  useEffect(
    () => () => {
      invalidatePendingRequests();
    },
    [invalidatePendingRequests],
  );

  const navigateToListLocation = useCallback(
    (nextLocation: RequirementListLocation) => {
      history.push(buildRequirementListPath(nextLocation), {
        requirementList: nextLocation,
      });
      applyListLocation(nextLocation);
    },
    [applyListLocation],
  );

  const resetWorkspaceList = useCallback(
    (nextWorkspaceId: string | undefined) => {
      navigateToListLocation({ page: 1, workspaceId: nextWorkspaceId });
    },
    [navigateToListLocation],
  );

  const goToNextPage = useCallback(() => {
    const activeCursor = nextCursor as string;
    const activeWorkspaceId = workspaceId as string;
    navigateToListLocation({
      cursor: activeCursor,
      page: currentPage + 1,
      previous: {
        ...(currentCursor === undefined ? {} : { cursor: currentCursor }),
        page: currentPage,
        previous: previousLocationRef.current,
        workspaceId: activeWorkspaceId,
      },
      workspaceId: activeWorkspaceId,
    });
  }, [
    currentCursor,
    currentPage,
    navigateToListLocation,
    nextCursor,
    workspaceId,
  ]);

  const goToPreviousPage = useCallback(() => {
    const previousLocation =
      previousLocationRef.current as RequirementListLocation;
    history.back();
    applyListLocation(previousLocation);
  }, [applyListLocation]);

  const requestParams = useMemo<RequirementTableParams | undefined>(
    () =>
      workspaceId
        ? {
            ...(currentCursor === undefined ? {} : { cursor: currentCursor }),
            cursorPage: currentPage,
            limit: REQUIREMENT_PAGE_SIZE,
            workspaceId,
          }
        : undefined,
    [currentCursor, currentPage, workspaceId],
  );

  const requestRequirements = useCallback<
    NonNullable<
      ProTableProps<RequirementSummary, RequirementTableParams>['request']
    >
  >(async (params) => {
    const requestSequence = ++requestSequenceRef.current;
    setRows([]);
    const result = await loadRequirementTablePage(() =>
      listRequirements({
        ...(params.cursor === undefined ? {} : { cursor: params.cursor }),
        limit: params.limit,
        workspaceId: params.workspaceId,
      }),
    );
    if (requestSequence !== requestSequenceRef.current) {
      return { data: [], success: false };
    }
    if (!result.success) {
      setListError(result.error);
      setNextCursor(null);
      setRows([]);
      return { data: [], success: false };
    }
    setListError(undefined);
    setRows(result.data);
    setNextCursor(result.nextCursor);
    return { data: result.data, success: true };
  }, []);

  const retry = useCallback(() => {
    invalidatePendingRequests();
    setRows([]);
    setListError(undefined);
    void actionRef.current?.reload();
  }, [invalidatePendingRequests]);

  const handleCreated = useCallback(
    async (result: CreateRequirementResult) => {
      setCreateOpen(false);
      invalidatePendingRequests();
      setRows([]);
      setListError(undefined);
      await actionRef.current?.reload();
      history.push(
        `/requirements/${encodeURIComponent(result.requirement.id)}`,
      );
    },
    [invalidatePendingRequests],
  );

  const columns = useMemo<ProColumns<RequirementSummary>[]>(
    () => [
      {
        dataIndex: 'id',
        render: (_, row) => (
          <Button
            aria-label={`查看需求 ${row.id}`}
            className={styles.requirementId}
            onClick={() =>
              history.push(`/requirements/${encodeURIComponent(row.id)}`)
            }
            size="small"
            type="link"
          >
            {row.id}
          </Button>
        ),
        title: '需求 ID',
        width: 220,
      },
      { dataIndex: 'title', title: '标题', width: 360 },
      {
        dataIndex: 'type',
        render: (_, row) => (
          <SemanticTag {...REQUIREMENT_TYPE_META[row.type]} />
        ),
        title: '类型',
        width: 120,
      },
      {
        dataIndex: 'state',
        render: (_, row) => (
          <SemanticTag {...REQUIREMENT_STATE_META[row.state]} />
        ),
        title: '状态',
        width: 120,
      },
      {
        dataIndex: 'updatedAt',
        render: (_, row) => (
          <time dateTime={row.updatedAt}>{formatUpdatedAt(row.updatedAt)}</time>
        ),
        title: '更新时间',
        width: 180,
      },
    ],
    [styles.requirementId],
  );

  const hasPreviousPage = previousLocationRef.current !== undefined;
  const hasNextPage = nextCursor !== null;

  return (
    <PageContainer ghost pageHeaderRender={false}>
      <div className={styles.page}>
        <header className={styles.pageHeader}>
          <div className={styles.heading}>
            <Typography.Title className={styles.title} level={2}>
              需求
            </Typography.Title>
            <p className={styles.description}>
              从真实 Requirement 事实查看开发入口与当前状态
            </p>
          </div>
          <div className={styles.headerActions}>
            <div className={styles.workspaceField}>
              <span className={styles.workspaceLabel}>工作区</span>
              <Select
                aria-label="工作区"
                className={styles.workspaceSelect}
                disabled={readableWorkspaces.length === 0}
                onChange={resetWorkspaceList}
                options={readableWorkspaces.map((workspace) => ({
                  label: workspace.name,
                  value: workspace.id,
                }))}
                placeholder="选择可读取的工作区"
                showSearch={{ optionFilterProp: 'label' }}
                value={workspaceId}
                virtual={false}
              />
            </div>
            {createWorkspaces.length > 0 && sessionKey ? (
              <Button onClick={() => setCreateOpen(true)} type="primary">
                创建需求
              </Button>
            ) : null}
          </div>
        </header>

        {readableWorkspaces.length === 0 || requestParams === undefined ? (
          <Empty
            className={styles.emptyWorkspace}
            description="当前账号没有可读取的工作区"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <>
            {listError ? (
              <Alert
                action={<Button onClick={retry}>重试加载需求列表</Button>}
                showIcon
                title={formatRequirementError(listError, '需求列表加载失败')}
                type="error"
              />
            ) : null}
            <ProTable<RequirementSummary, RequirementTableParams>
              actionRef={actionRef}
              columns={columns}
              dataSource={rows}
              locale={{
                emptyText: (
                  <Empty
                    description="暂无真实需求"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                ),
              }}
              onLoadingChange={(value) => setLoading(Boolean(value))}
              options={false}
              pagination={false}
              params={requestParams}
              request={requestRequirements}
              rowKey="id"
              scroll={{ x: 1000 }}
              search={false}
              size="small"
              toolBarRender={false}
            />
            <nav aria-label="需求列表分页" className={styles.pagination}>
              <Button
                disabled={!hasPreviousPage || loading}
                onClick={goToPreviousPage}
              >
                上一页
              </Button>
              <span className={styles.pageNumber}>第 {currentPage} 页</span>
              <Button disabled={!hasNextPage || loading} onClick={goToNextPage}>
                下一页
              </Button>
            </nav>
          </>
        )}
        {createOpen && sessionKey ? (
          <CreateRequirementModal
            initialWorkspaceId={
              createWorkspaces.some((workspace) => workspace.id === workspaceId)
                ? workspaceId
                : createWorkspaces[0]?.id
            }
            onCancel={() => setCreateOpen(false)}
            onCreated={handleCreated}
            open
            sessionKey={sessionKey}
            workspaces={createWorkspaces}
          />
        ) : null}
      </div>
    </PageContainer>
  );
}
