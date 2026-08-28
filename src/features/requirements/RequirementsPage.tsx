import {
  type ActionType,
  PageContainer,
  type ProColumns,
  ProTable,
  type ProTableProps,
} from '@ant-design/pro-components';
import { history, useModel } from '@umijs/max';
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
import {
  createCursorPagination,
  cursorForPage,
  hasNextCursorPage,
  loadRequirementTablePage,
  recordNextCursor,
} from './list.util';
import { listRequirements } from './service';
import type { CreateRequirementResult, RequirementSummary } from './type';

interface RequirementTableParams {
  cursor?: string;
  cursorPage: number;
  limit: number;
  workspaceId: string;
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
  const [workspaceId, setWorkspaceId] = useState<string | undefined>(
    () => readableWorkspaces[0]?.id,
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [cursorPagination, setCursorPagination] = useState(
    createCursorPagination,
  );
  const [rows, setRows] = useState<RequirementSummary[]>([]);
  const [listError, setListError] = useState<unknown>();
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const invalidatePendingRequests = useCallback(() => {
    requestSequenceRef.current += 1;
  }, []);

  const resetWorkspaceList = useCallback(
    (nextWorkspaceId: string | undefined) => {
      invalidatePendingRequests();
      setWorkspaceId(nextWorkspaceId);
      setCurrentPage(1);
      setCursorPagination(createCursorPagination());
      setRows([]);
      setListError(undefined);
    },
    [invalidatePendingRequests],
  );

  useEffect(() => {
    if (
      workspaceId !== undefined &&
      readableWorkspaces.some((workspace) => workspace.id === workspaceId)
    ) {
      return;
    }
    const firstReadableWorkspaceId = readableWorkspaces[0]?.id;
    if (workspaceId !== firstReadableWorkspaceId) {
      resetWorkspaceList(firstReadableWorkspaceId);
    }
  }, [readableWorkspaces, resetWorkspaceList, workspaceId]);

  useEffect(
    () => () => {
      invalidatePendingRequests();
    },
    [invalidatePendingRequests],
  );

  const currentCursor = cursorForPage(cursorPagination, currentPage);
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
      setRows([]);
      return { data: [], success: false };
    }
    setListError(undefined);
    setRows(result.data);
    setCursorPagination((pagination) =>
      recordNextCursor(pagination, params.cursorPage, result.nextCursor),
    );
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

  const hasPreviousPage = currentPage > 1;
  const hasNextPage = hasNextCursorPage(cursorPagination, currentPage);

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
                showSearch
                value={workspaceId}
                virtual={false}
              />
            </div>
            {createWorkspaces.length > 0 ? (
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
                onClick={() => {
                  invalidatePendingRequests();
                  setRows([]);
                  setListError(undefined);
                  setCurrentPage((page) => page - 1);
                }}
              >
                上一页
              </Button>
              <span className={styles.pageNumber}>第 {currentPage} 页</span>
              <Button
                disabled={!hasNextPage || loading}
                onClick={() => {
                  invalidatePendingRequests();
                  setRows([]);
                  setListError(undefined);
                  setCurrentPage((page) => page + 1);
                }}
              >
                下一页
              </Button>
            </nav>
          </>
        )}
        {createOpen ? (
          <CreateRequirementModal
            initialWorkspaceId={
              createWorkspaces.some((workspace) => workspace.id === workspaceId)
                ? workspaceId
                : createWorkspaces[0]?.id
            }
            onCancel={() => setCreateOpen(false)}
            onCreated={handleCreated}
            open
            workspaces={createWorkspaces}
          />
        ) : null}
      </div>
    </PageContainer>
  );
}
