import {
  AppstoreOutlined,
  AuditOutlined,
  BarChartOutlined,
  BellOutlined,
  ClusterOutlined,
  ControlOutlined,
  HomeOutlined,
  MenuOutlined,
  ReadOutlined,
  RobotOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import type React from 'react';
import { APP_PATHS, type RouteKey } from '@/constants/route';

export type NavigationGroupKey = 'user' | 'admin';

export interface RouteRegistration {
  path: string;
  group: NavigationGroupKey;
  icon: React.ReactNode;
}

export const ROUTE_REGISTRY = {
  home: {
    path: APP_PATHS.home,
    group: 'user',
    icon: <HomeOutlined />,
  },
  tasks: {
    path: APP_PATHS.tasks,
    group: 'user',
    icon: <UnorderedListOutlined />,
  },
  workspaces: {
    path: APP_PATHS.workspaces,
    group: 'user',
    icon: <AppstoreOutlined />,
  },
  messages: {
    path: APP_PATHS.messages,
    group: 'user',
    icon: <BellOutlined />,
  },
  teamBoard: {
    path: APP_PATHS.teamBoard,
    group: 'user',
    icon: <BarChartOutlined />,
  },
  audit: {
    path: APP_PATHS.audit,
    group: 'user',
    icon: <AuditOutlined />,
  },
  admin: {
    path: APP_PATHS.admin,
    group: 'admin',
    icon: <ControlOutlined />,
  },
  adminWorkspaces: {
    path: APP_PATHS.adminWorkspaces,
    group: 'admin',
    icon: <ClusterOutlined />,
  },
  adminSkills: {
    path: APP_PATHS.adminSkills,
    group: 'admin',
    icon: <ReadOutlined />,
  },
  adminModels: {
    path: APP_PATHS.adminModels,
    group: 'admin',
    icon: <RobotOutlined />,
  },
  adminRoles: {
    path: APP_PATHS.adminRoles,
    group: 'admin',
    icon: <SafetyCertificateOutlined />,
  },
  adminUsers: {
    path: APP_PATHS.adminUsers,
    group: 'admin',
    icon: <TeamOutlined />,
  },
  adminMenus: {
    path: APP_PATHS.adminMenus,
    group: 'admin',
    icon: <MenuOutlined />,
  },
} satisfies Record<RouteKey, RouteRegistration>;

export function isRouteKey(value: string): value is RouteKey {
  return Object.hasOwn(ROUTE_REGISTRY, value);
}

export function getRouteRegistration(
  value: string,
): RouteRegistration | undefined {
  return isRouteKey(value) ? ROUTE_REGISTRY[value] : undefined;
}
