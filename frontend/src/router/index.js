import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/store/modules/user'

const routes = [
  // 首页（营销页面）
  {
    path: '/',
    name: 'Home',
    component: () => import('@/pages/HomePage.vue'),
    meta: { requiresAuth: false, title: '智能医学教学材料生成平台' }
  },
  // 登录页（保留独立入口）
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/pages/Login.vue'),
    meta: { requiresAuth: false, title: '登录' }
  },
  {
    path: '/explore',
    name: 'Explore',
    component: () => import('@/pages/Explore.vue'),
    meta: { requiresAuth: false, title: '教学资源中心' }
  },
  {
    path: '/complete-profile',
    name: 'CompleteProfile',
    component: () => import('@/pages/CompleteProfile.vue'),
    meta: { requiresAuth: true, title: '完善个人信息' }
  },
  // Dashboard（需要认证）
  {
    path: '/dashboard',
    component: () => import('@/pages/Dashboard.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/dashboard/resources'
      },
      {
        path: 'resources',
        name: 'ResourceList',
        component: () => import('@/pages/FolderManage.vue'),
        meta: { title: '我的资源' }
      },
      {
        path: 'resources/create',
        name: 'CreateResource',
        component: () => import('@/pages/CreateResource.vue'),
        meta: { title: '创建资源' }
      },
      {
        path: 'resources/edit/:id',
        name: 'EditResource',
        component: () => import('@/pages/CreateResource.vue'),
        meta: { title: '编辑资源' }
      },
      {
        path: 'templates',
        name: 'TemplateCenter',
        component: () => import('@/pages/TemplateCenter.vue'),
        meta: { title: '模板中心' }
      },
      {
        path: 'help',
        name: 'Help',
        component: () => import('@/pages/Help.vue'),
        meta: { title: '帮助中心' }
      },
      // 管理员路由（需要管理员权限）
      {
        path: 'admin/stats',
        name: 'AdminStats',
        component: () => import('@/pages/admin/AdminStats.vue'),
        meta: { title: '数据看板', requiresAdmin: true }
      },
      {
        path: 'admin/users',
        name: 'AdminUsers',
        component: () => import('@/pages/admin/AdminUsers.vue'),
        meta: { title: '用户管理', requiresAdmin: true }
      },
      {
        path: 'admin/resources',
        name: 'AdminResources',
        component: () => import('@/pages/admin/AdminResources.vue'),
        meta: { title: '全站资源', requiresAdmin: true }
      },
      {
        path: 'admin/logs',
        name: 'AdminLogs',
        component: () => import('@/pages/admin/AdminLogs.vue'),
        meta: { title: '操作日志', requiresAdmin: true }
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/pages/NotFound.vue'),
    meta: { title: '404' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

/**
 * 路由守卫
 */
router.beforeEach(async (to, from, next) => {
  // 设置页面标题
  document.title = to.meta.title || '智能医学教学材料生成平台'

  const userStore = useUserStore()

  // 需要认证的路由
  if (to.meta.requiresAuth) {
    if (userStore.isLoggedIn) {
      // 已登录，验证Token有效性
      const isValid = await userStore.verifyToken()
      if (isValid) {
        // 检查是否需要管理员权限
        if (to.meta.requiresAdmin && !userStore.isAdmin) {
          // 非管理员访问管理员页面，跳转到Dashboard
          next('/dashboard')
        } else {
          next()
        }
      } else {
        next('/login')
      }
    } else {
      // 未登录，跳转到登录页
      next('/login')
    }
  } else {
    // 不需要认证的路由
    if (to.path === '/login' && userStore.isLoggedIn) {
      // 已登录用户访问登录页，跳转到Dashboard
      next('/dashboard')
    } else {
      next()
    }
  }
})

export default router
