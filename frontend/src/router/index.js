import Vue from 'vue';
import VueRouter from 'vue-router';

Vue.use(VueRouter);

const routes = [
  {
    path: '/',
    redirect: '/preview'
  },
  {
    path: '/preview',
    name: 'Preview',
    component: () => import('../views/user/Preview.vue'),
    meta: { title: '全景图预览' }
  },
  {
    path: '/preview',
    name: 'Preview',
    component: () => import('../views/user/Preview.vue'),
    meta: { title: '全景图预览' }
  },
  {
    path: '/compare',
    name: 'VersionCompare',
    component: () => import('../views/user/VersionCompare.vue'),
    meta: { title: '版本对比' }
  },
  {
    path: '/admin/login',
    name: 'AdminLogin',
    component: () => import('../views/admin/Login.vue'),
    meta: { title: '管理员登录' }
  },
  {
    path: '/admin',
    component: () => import('../views/admin/Dashboard.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/admin/panoramas'
      },
      {
        path: 'panoramas',
        name: 'PanoramaManage',
        component: () => import('../views/admin/PanoramaManage.vue'),
        meta: { title: '全景图管理', requiresAuth: true }
      },
      {
        path: 'markers',
        name: 'MarkerManage',
        component: () => import('../views/admin/MarkerManage.vue'),
        meta: { title: '标记点管理', requiresAuth: true }
      }
    ]
  }
];

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes
});

// 路由守卫 - 检查需要认证的页面
router.beforeEach((to, from, next) => {
  // 设置页面标题
  document.title = to.meta.title ? `${to.meta.title} - 全景图管理系统` : '全景图管理系统';

  // 检查是否需要认证
  if (to.matched.some(record => record.meta.requiresAuth)) {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      next({
        path: '/admin/login',
        query: { redirect: to.fullPath }
      });
    } else {
      next();
    }
  } else {
    next();
  }
});

export default router;
