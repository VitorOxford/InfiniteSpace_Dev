// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import WorkspaceView from '@/views/WorkspaceView.vue'
import AuthView from '@/views/AuthView.vue'
import AccountView from '@/views/AccountView.vue'
import HomeView from '@/views/HomeView.vue'
import { supabase } from '@/supabase'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      // CORREÇÃO: A rota raiz (/) agora redireciona para a home.
      path: '/',
      redirect: '/home',
    },
    {
      // A HomeView é a página principal após o login.
      path: '/home',
      name: 'home',
      component: HomeView,
      meta: { requiresAuth: true },
    },
    {
      // O editor agora tem sua própria rota dedicada e não é mais a raiz.
      path: '/workspace',
      name: 'workspace',
      component: WorkspaceView,
      meta: { requiresAuth: true },
    },
    {
      path: '/account',
      name: 'account',
      component: AccountView,
      meta: { requiresAuth: true },
    },
    {
      path: '/auth',
      name: 'auth',
      component: AuthView,
    },
    {
      // Mantendo a rota de cadastro que criamos anteriormente.
      path: '/register',
      name: 'register',
      component: () => import('@/views/RegisterView.vue'),
    },
  ],
})

router.beforeEach(async (to, from, next) => {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth)

  if (requiresAuth && !session) {
    next({ name: 'auth' })
  } else if ((to.name === 'auth' || to.name === 'register') && session) {
    // Esta parte já está correta, redirecionando para a home.
    next({ name: 'home' })
  } else {
    next()
  }
})

export default router
