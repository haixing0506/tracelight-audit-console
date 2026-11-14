import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'dashboard',
    component: () => import('../views/DashboardView.vue'),
    meta: { title: '安全运营总览', group: '工作台' },
  },
  {
    path: '/logs',
    name: 'logs',
    component: () => import('../views/LogsView.vue'),
    meta: { title: '审计日志', group: '工作台' },
  },
  {
    path: '/alerts',
    name: 'alerts',
    component: () => import('../views/AlertsView.vue'),
    meta: { title: '风险告警', group: '工作台' },
  },
  {
    path: '/sources',
    name: 'sources',
    component: () => import('../views/SourcesView.vue'),
    meta: { title: '数据源管理', group: '管理' },
  },
  {
    path: '/operations',
    name: 'operations',
    component: () => import('../views/OperationsView.vue'),
    meta: { title: '运行日志', group: '管理' },
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

export default router
