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
      // --- CORREÇÃO APLICADA AQUI ---
      // A rota raiz agora leva diretamente para o workspace.
      path: '/',
      name: 'workspace', // Nome da rota principal agora é 'workspace'
      component: WorkspaceView,
      meta: { requiresAuth: true },
    },
    {
      // Rota antiga de workspace mantida para compatibilidade, redireciona para a raiz.
      path: '/workspace',
      redirect: '/',
    },
    {
      // A HomeView pode ser mantida para um futuro dashboard
      path: '/home',
      name: 'home',
      component: HomeView,
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
  ],
})

router.beforeEach(async (to, from, next) => {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth)

  if (requiresAuth && !session) {
    next({ name: 'auth' })
  } else if (to.name === 'auth' && session) {
    // Redireciona para o workspace ao invés da home
    next({ name: 'workspace' })
  } else {
    next()
  }
})

export default router
