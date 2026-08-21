import type { ProTableProps } from '@ant-design/pro-components';
import { createProblemError } from '@root/tests/fixtures/problemError';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import { App, ConfigProvider } from 'antd';
import { useEffect, useState } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';

type TableRequest = NonNullable<
  ProTableProps<Record<string, unknown>, Record<string, unknown>>['request']
>;

vi.mock('@ant-design/pro-components', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@ant-design/pro-components')>()),
  ProTable: ({ request }: { request?: TableRequest }) => {
    const [result, setResult] = useState<Awaited<ReturnType<TableRequest>>>();

    useEffect(() => {
      let mounted = true;
      void request?.({}, {}, {}).then((nextResult) => {
        if (mounted) {
          setResult(nextResult);
        }
      });
      return () => {
        mounted = false;
      };
    }, [request]);

    return (
      <output aria-label="工作区 ProTable request 返回">
        {result === undefined ? 'pending' : JSON.stringify(result)}
      </output>
    );
  },
}));

const administrationMocks = vi.hoisted(() => ({
  getOrganizationTree: vi.fn(),
  listWorkspaces: vi.fn(),
}));

vi.mock('@umijs/max', async () => ({
  ...(await import('@tanstack/react-query')),
}));

vi.mock('@/features/administration', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/administration')>()),
  ...administrationMocks,
}));

import AdminWorkspacesPage from '.';

beforeEach(() => {
  administrationMocks.getOrganizationTree.mockReset();
  administrationMocks.listWorkspaces.mockReset();
  administrationMocks.getOrganizationTree.mockResolvedValue({ items: [] });
});

it('工作区列表 rejection 向 ProTable 返回失败并保留 Problem', async () => {
  administrationMocks.listWorkspaces.mockRejectedValue(
    createProblemError({
      detail: '无 Workspace 治理权限',
      requestId: 'req-workspace-boundary-403',
      status: 403,
    }),
  );
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={{ token: { motion: false } }}>
        <App>
          <AdminWorkspacesPage />
        </App>
      </ConfigProvider>
    </QueryClientProvider>,
  );

  await waitFor(() => {
    expect(
      screen.getByRole('status', { name: '工作区 ProTable request 返回' }),
    ).toHaveTextContent('{"data":[],"success":false,"total":0}');
  });
  expect(
    await within(screen.getByTestId('pro-page-container')).findByText(
      /无 Workspace 治理权限/,
    ),
  ).toHaveTextContent('requestId: req-workspace-boundary-403');
});
