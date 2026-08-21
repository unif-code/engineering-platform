import {
  type ProColumns,
  ProTable,
  type ProTableProps,
} from '@ant-design/pro-components';
import { useCallback, useMemo } from 'react';
import type { PolicyPreview } from '@/features/administration';
import { formatPolicyValue } from './constant';
import type { PolicyPreviewRow, PolicyTableQueryParams } from './type';

interface PolicyPreviewPanelProps {
  preview: PolicyPreview;
}

export function PolicyPreviewPanel({ preview }: PolicyPreviewPanelProps) {
  const columns = useMemo<ProColumns<PolicyPreviewRow>[]>(
    () => [
      { dataIndex: 'label', title: 'Policy Key', width: 180 },
      {
        dataIndex: 'beforeValue',
        render: (_, row) => formatPolicyValue(row.beforeValue),
        title: '当前值',
        width: 120,
      },
      {
        dataIndex: 'afterValue',
        render: (_, row) => formatPolicyValue(row.afterValue),
        title: 'Draft 值',
        width: 120,
      },
      { dataIndex: 'effectSemantics', title: '生效语义' },
    ],
    [],
  );
  const requestPreviewRows = useCallback<
    NonNullable<
      ProTableProps<PolicyPreviewRow, PolicyTableQueryParams>['request']
    >
  >(
    async () => ({
      data: preview.changes.map((change) => ({ ...change })),
      success: true,
      total: preview.changes.length,
    }),
    [preview.changes],
  );

  return (
    <section aria-label="Policy Preview" data-density="compact">
      <ProTable<PolicyPreviewRow, PolicyTableQueryParams>
        cardProps={{ styles: { body: { paddingInline: 0 } } }}
        columns={columns}
        headerTitle="Policy Preview"
        options={false}
        pagination={false}
        params={{ refresh: preview.baseVersion }}
        request={requestPreviewRows}
        rowKey="key"
        search={false}
        size="small"
        toolBarRender={false}
      />
    </section>
  );
}
