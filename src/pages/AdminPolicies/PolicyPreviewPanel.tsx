import {
  type ProColumns,
  ProTable,
  type ProTableProps,
} from '@ant-design/pro-components';
import { useCallback, useMemo } from 'react';
import type { PolicyPreview } from '@/features/administration';
import { formatPolicyValue } from './constant';
import { useStyles } from './index.style';
import type { PolicyPreviewRow, PolicyTableQueryParams } from './type';

interface PolicyPreviewPanelProps {
  preview: PolicyPreview;
}

export function PolicyPreviewPanel({ preview }: PolicyPreviewPanelProps) {
  const { styles } = useStyles();
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
    <section aria-label="Policy Preview" className={styles.preview}>
      <ProTable<PolicyPreviewRow, PolicyTableQueryParams>
        columns={columns}
        headerTitle="Policy Preview"
        options={false}
        pagination={false}
        params={{ refresh: preview.baseVersion }}
        request={requestPreviewRows}
        rowKey="key"
        search={false}
        toolBarRender={false}
      />
    </section>
  );
}
