import { BgColorsOutlined } from '@ant-design/icons';
import { Button, Dropdown, type MenuProps } from 'antd';
import { usePlatformTheme } from './ThemeProvider';
import type { ThemeMode } from './type';

const THEME_ITEMS: MenuProps['items'] = [
  { key: 'system', label: '跟随系统' },
  { key: 'light', label: '浅色' },
  { key: 'dark', label: '深色' },
];

export function ThemeSelector() {
  const { mode, setMode } = usePlatformTheme();

  return (
    <Dropdown
      menu={{
        items: THEME_ITEMS,
        onClick: ({ key }) => setMode(key as ThemeMode),
        selectable: true,
        selectedKeys: [mode],
      }}
      trigger={['click']}
    >
      <Button aria-label="主题设置" icon={<BgColorsOutlined />} type="text" />
    </Dropdown>
  );
}
