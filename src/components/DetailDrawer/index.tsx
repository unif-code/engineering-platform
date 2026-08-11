import {
  ProDescriptions,
  type ProDescriptionsProps,
} from '@ant-design/pro-components';
import { Drawer, type DrawerProps } from 'antd';
import type { ReactNode, RefObject } from 'react';

// biome-ignore lint/suspicious/noExplicitAny: ProDescriptionsProps 的泛型上界由上游定义为 Record<string, any>。
type DescriptionRecord = Record<string, any>;

export interface DetailDrawerProps<TRecord extends DescriptionRecord> {
  open: boolean;
  title: ReactNode;
  size?: DrawerProps['size'];
  onClose: NonNullable<DrawerProps['onClose']>;
  dataSource?: TRecord;
  columns: NonNullable<ProDescriptionsProps<TRecord>['columns']>;
  column?: ProDescriptionsProps<TRecord>['column'];
  extra?: DrawerProps['extra'];
  focusReturnRef?: RefObject<HTMLElement | null>;
  children?: ReactNode;
}

export function DetailDrawer<TRecord extends DescriptionRecord>({
  open,
  title,
  size,
  onClose,
  dataSource,
  columns,
  column = 1,
  extra,
  focusReturnRef,
  children,
}: DetailDrawerProps<TRecord>) {
  return (
    <Drawer
      afterOpenChange={(nextOpen) => {
        if (!nextOpen) {
          focusReturnRef?.current?.focus({ preventScroll: true });
        }
      }}
      destroyOnHidden
      extra={extra}
      focusable={focusReturnRef ? { focusTriggerAfterClose: false } : undefined}
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
      {children}
    </Drawer>
  );
}
