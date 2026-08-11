import {
  type ActionType,
  type ProColumns,
  ProTable,
  type ProTableProps,
} from '@ant-design/pro-components';
import { Button } from 'antd';
import { type MutableRefObject, useMemo } from 'react';
import { SemanticTag } from '@/components/SemanticTag';
import type { PolicyTableQueryParams, PolicyVersionRow } from './type';

interface PolicyVersionHistoryProps {
  actionRef: MutableRefObject<ActionType | undefined>;
  onRollback: (version: PolicyVersionRow) => void;
  request: NonNullable<
    ProTableProps<PolicyVersionRow, PolicyTableQueryParams>['request']
  >;
  rollbackDisabled: boolean;
}

export function PolicyVersionHistory({
  actionRef,
  onRollback,
  request,
  rollbackDisabled,
}: PolicyVersionHistoryProps) {
  const columns = useMemo<ProColumns<PolicyVersionRow>[]>(
    () => [
      {
        dataIndex: 'version',
        render: (_, row) => `版本 ${row.version}`,
        title: '版本',
        width: 100,
      },
      { dataIndex: 'publishedBy', title: '发布人', width: 140 },
      {
        dataIndex: 'publishedAt',
        title: '发布时间',
        valueType: 'dateTime',
        width: 180,
      },
      { dataIndex: 'reason', title: '原因' },
      {
        dataIndex: 'current',
        render: (_, row) =>
          row.current ? (
            <SemanticTag label="当前" tone="success" />
          ) : (
            <SemanticTag label="历史" tone="neutral" />
          ),
        title: '状态',
        width: 90,
      },
      {
        render: (_, row) =>
          row.current ? null : (
            <Button
              aria-label={`Rollback 版本 ${row.version}`}
              disabled={rollbackDisabled}
              onClick={() => onRollback(row)}
              type="link"
            >
              Rollback
            </Button>
          ),
        title: '操作',
        valueType: 'option',
        width: 110,
      },
    ],
    [onRollback, rollbackDisabled],
  );

  return (
    <section aria-label="版本历史">
      <ProTable<PolicyVersionRow, PolicyTableQueryParams>
        actionRef={actionRef}
        columns={columns}
        headerTitle="版本历史"
        options={false}
        pagination={false}
        request={request}
        rowKey="version"
        scroll={{ x: 820 }}
        search={false}
        toolBarRender={false}
      />
    </section>
  );
}
