import {
  DownOutlined,
  LogoutOutlined,
  SearchOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  App,
  AutoComplete,
  Avatar,
  Button,
  Dropdown,
  Input,
  type MenuProps,
  Space,
  Tooltip,
  Typography,
} from 'antd';
import { useState } from 'react';
import {
  createThemeMenuItems,
  getThemeMenuKey,
  getThemeModeFromMenuKey,
  usePlatformTheme,
} from '@/features/theme';
import { ApiError } from '@/services/transport';

export interface HeaderActionsProps {
  onLogout: () => Promise<void>;
  user?: { name: string } | null;
}

export function HeaderActions({ onLogout, user }: HeaderActionsProps) {
  const { message } = App.useApp();
  const { mode, setMode } = usePlatformTheme();
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

  const handleUserMenuClick: MenuProps['onClick'] = ({ key }) => {
    const nextMode = getThemeModeFromMenuKey(key);
    if (nextMode) {
      setMode(nextMode);
      return;
    }
    if (key === 'logout') {
      void handleLogout();
    }
  };

  const userMenuItems: MenuProps['items'] = [
    ...createThemeMenuItems(mode),
    { type: 'divider' },
    {
      disabled: loggingOut,
      icon: <LogoutOutlined aria-hidden="true" />,
      key: 'logout',
      label: '退出登录',
    },
  ];

  return (
    <Space size="small">
      <Tooltip title="当前版本暂未接入">
        <span data-disabled-search>
          <AutoComplete disabled style={{ width: 220 }}>
            <Input
              aria-label="全局搜索"
              placeholder="搜索任务、工作区、Artifact"
              prefix={<SearchOutlined aria-hidden="true" />}
            />
          </AutoComplete>
        </span>
      </Tooltip>
      <Dropdown
        menu={{
          items: userMenuItems,
          onClick: handleUserMenuClick,
          selectable: true,
          selectedKeys: [getThemeMenuKey(mode)],
        }}
        placement="bottomRight"
        trigger={['click']}
      >
        <Button aria-label={`${userName}账号菜单`} type="text">
          <Space size="small">
            <span aria-label={`用户：${userName}`} role="img">
              <Avatar
                icon={initial ? undefined : <UserOutlined aria-hidden="true" />}
              >
                {initial}
              </Avatar>
            </span>
            <Typography.Text>{userName}</Typography.Text>
            <DownOutlined aria-hidden="true" />
          </Space>
        </Button>
      </Dropdown>
    </Space>
  );
}
