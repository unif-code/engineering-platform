import {
  ProDescriptions,
  type ProDescriptionsProps,
} from '@ant-design/pro-components';
import { Drawer, type DrawerProps } from 'antd';
import type { ReactNode } from 'react';

export interface DetailDrawerProps<TRecord extends Record<string, any>> {
  open: boolean;
  title: ReactNode;
  size?: DrawerProps['size'];
  onClose: NonNullable<DrawerProps['onClose']>;
  dataSource?: TRecord;
  columns: NonNullable<ProDescriptionsProps<TRecord>['columns']>;
  column?: ProDescriptionsProps<TRecord>['column'];
  extra?: DrawerProps['extra'];
}

export function DetailDrawer<TRecord extends Record<string, any>>({
  open,
  title,
  size,
  onClose,
  dataSource,
  columns,
  column = 1,
  extra,
}: DetailDrawerProps<TRecord>) {
  return (
    <Drawer
      destroyOnHidden
      extra={extra}
      onClose={onClose}
      open={open}
      size={size}
      title={title}
    >
      {dataSource ? (
        <ProDescriptions<TRecord>
          bordered
          column={column}
          columns={columns}
          dataSource={dataSource}
          size="small"
        />
      ) : null}
    </Drawer>
  );
}
