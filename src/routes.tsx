import type { ReactNode } from 'react';
import HomePage from './pages/HomePage';

export interface RouteConfig {
  name: string;
  path: string;
  element: ReactNode;
  visible?: boolean;
  /** 无需登录即可访问；未标记的路由需要认证（未使用 RouteGuard 时无效果） */
  public?: boolean;
}

export const routes: RouteConfig[] = [
  {
    name: 'Home',
    path: '/',
    element: <HomePage />,
    public: true,
  },
];
