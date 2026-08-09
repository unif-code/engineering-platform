export default [
  { path: '/login', component: './Login', layout: false },
  {
    path: '/',
    wrappers: ['@/features/auth/RouteGuard'],
    routes: [
      { path: '/', redirect: '/home' },
      { name: '首页', path: '/home', component: './Home' },
      { name: '管理后台', path: '/admin', component: './Admin' },
    ],
  },
];
