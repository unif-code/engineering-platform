import type { ProTableProps } from '@ant-design/pro-components';
import { createProblemError } from '@root/tests/fixtures/problemError';
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
      <output aria-label="账号 ProTable request 返回">
        {result === undefined ? 'pending' : JSON.stringify(result)}
      </output>
    );
  },
}));

const administrationMocks = vi.hoisted(() => ({
  listAccounts: vi.fn(),
}));

vi.mock('@/features/administration', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/administration')>()),
  ...administrationMocks,
}));

import AdminUsersPage from '.';

beforeEach(() => {
  administrationMocks.listAccounts.mockReset();
});

it('账号列表 rejection 向 ProTable 返回失败并保留 Problem', async () => {
  administrationMocks.listAccounts.mockRejectedValue(
    createProblemError({
      detail: '无账号治理权限',
      requestId: 'req-account-boundary-403',
      status: 403,
    }),
  );

  render(
    <ConfigProvider theme={{ token: { motion: false } }}>
      <App>
        <AdminUsersPage />
      </App>
    </ConfigProvider>,
  );

  await waitFor(() => {
    expect(
      screen.getByRole('status', { name: '账号 ProTable request 返回' }),
    ).toHaveTextContent('{"data":[],"success":false,"total":0}');
  });
  expect(
    await within(screen.getByTestId('pro-page-container')).findByText(
      /无账号治理权限/,
    ),
  ).toHaveTextContent('requestId: req-account-boundary-403');
});
