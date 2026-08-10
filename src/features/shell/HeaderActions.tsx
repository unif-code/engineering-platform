import { BellOutlined, SearchOutlined, UserOutlined } from '@ant-design/icons';
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
import { ThemeSelector } from '@/features/theme';

const SEARCH_OPTIONS = [
  { label: '搜索任务', value: '搜索任务' },
  { label: '搜索工作区', value: '搜索工作区' },
  { label: '搜索 Artifact', value: '搜索 Artifact' },
];

export interface HeaderActionsProps {
  user?: { name: string } | null;
}

export function HeaderActions({ user }: HeaderActionsProps) {
  const { message } = App.useApp();
  const userName = user?.name.trim() || '当前用户';
  const initial = user?.name.trim().slice(0, 1);

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
    </Space>
  );
}
