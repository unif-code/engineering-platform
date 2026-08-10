import {
  BellOutlined,
  LogoutOutlined,
  SearchOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  App,
  AutoComplete,
  Avatar,
  Badge,
  Button,
  Input,
  Space,
  Tooltip,
  Typography,
} from 'antd';
import { useState } from 'react';
import { ThemeSelector } from '@/features/theme';
import { ApiError } from '@/services/transport';

const SEARCH_OPTIONS = [
  { label: '搜索任务', value: '搜索任务' },
  { label: '搜索工作区', value: '搜索工作区' },
  { label: '搜索 Artifact', value: '搜索 Artifact' },
];

export interface HeaderActionsProps {
  onLogout: () => Promise<void>;
  user?: { name: string } | null;
}

export function HeaderActions({ onLogout, user }: HeaderActionsProps) {
  const { message } = App.useApp();
  const [loggingOut, setLoggingOut] = useState(false);
  const userName = user?.name.trim() || '当前用户';
  const initial = user?.name.trim().slice(0, 1);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await onLogout();
    } catch (error) {
      const detail =
        error instanceof ApiError
          ? error.problem.detail
          : error instanceof Error
            ? error.message
            : undefined;
      void message.error(detail || '退出登录失败，请重试');
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <Space size="middle">
      <AutoComplete
        className="w-72"
        onSelect={() => {
          void message.info('静态原型：全局搜索暂未接入。');
        }}
        options={SEARCH_OPTIONS}
      >
        <Input
          aria-label="全局搜索"
          placeholder="搜索任务、工作区、Artifact"
          prefix={<SearchOutlined />}
        />
      </AutoComplete>
      <ThemeSelector />
      <Tooltip title="消息入口">
        <Badge dot>
          <Button
            aria-label="消息入口"
            icon={<BellOutlined />}
            onClick={() => {
              void message.info('静态原型：消息入口暂未接入。');
            }}
            type="text"
          />
        </Badge>
      </Tooltip>
      <Space size="small">
        <span aria-label={`用户：${userName}`} role="img">
          <Avatar icon={initial ? undefined : <UserOutlined />}>
            {initial}
          </Avatar>
        </span>
        <Typography.Text>{userName}</Typography.Text>
      </Space>
      <Tooltip title="退出登录">
        <Button
          aria-label="退出登录"
          icon={<LogoutOutlined />}
          loading={loggingOut}
          onClick={() => {
            void handleLogout();
          }}
          type="text"
        />
      </Tooltip>
    </Space>
  );
}
