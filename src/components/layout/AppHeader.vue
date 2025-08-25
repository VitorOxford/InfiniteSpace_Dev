<script setup>
import { useAuthStore } from '@/stores/authStore'
import { useCanvasStore } from '@/stores/canvasStore'
import { useSubscriptionStore } from '@/stores/subscriptionStore'
import { useRouter } from 'vue-router'
import { computed } from 'vue'

const authStore = useAuthStore()
const canvasStore = useCanvasStore()
const subscriptionStore = useSubscriptionStore()
const router = useRouter()

const viewModeText = computed(() => {
  return canvasStore.workspace.viewMode === 'edit' ? 'Ver Mockup' : 'Voltar a Editar'
})

const planIcon = computed(() => {
  const plan = authStore.profile?.subscription_plan || 'free'
  switch (plan) {
    case 'basic':
      return 'shield-check'
    case 'pro':
      return 'gem'
    case 'enterprise':
      return 'crown'
    default:
      return 'shield'
  }
})

const planTooltip = computed(() => {
  const plan = authStore.profile?.subscription_plan || 'free'
  return `Plano ${plan.charAt(0).toUpperCase() + plan.slice(1)}`
})

function navigateToAccount() {
  router.push('/account')
}

async function logout() {
  await authStore.handleLogout()
  router.push('/auth')
}
</script>

<template>
  <header class="app-header">
    <div class="header-group left">
      <img
        src="/logo.svg"
        alt="Logo"
        class="logo"
        @click="router.push('/')"
        style="cursor: pointer"
      />
      <span class="divider"></span>
      <div class="document-title">MockupCreator Pro</div>
    </div>

    <div class="header-group center">
      <div class="unit-controls" v-if="canvasStore.workspace.viewMode === 'edit'">
        <button
          :class="{ active: canvasStore.workspace.rulers.unit === 'px' }"
          @click="canvasStore.setRulerUnit('px')"
        >
          PX
        </button>
        <button
          :class="{ active: canvasStore.workspace.rulers.unit === 'cm' }"
          @click="canvasStore.setRulerUnit('cm')"
        >
          CM
        </button>
        <button
          :class="{ active: canvasStore.workspace.rulers.unit === 'in' }"
          @click="canvasStore.setRulerUnit('in')"
        >
          IN
        </button>
      </div>
    </div>

    <div class="header-group right">
      <button @click="canvasStore.toggleViewMode()" class="btn btn-secondary">
        {{ viewModeText }}
      </button>

      <div class="user-actions">
        <button class="icon-btn" :title="planTooltip" @click="subscriptionStore.openModal()">
          <svg
            v-if="planIcon === 'shield'"
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
          </svg>
          <svg
            v-if="planIcon === 'shield-check'"
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            <path d="m9 12 2 2 4-4"></path>
          </svg>
          <svg
            v-if="planIcon === 'gem'"
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M6 3h12l4 6-10 13L2 9Z" />
            <path d="M12 22 6 9l-4-6h16l-4 6" />
            <path d="M2 9h20" />
          </svg>
          <svg
            v-if="planIcon === 'crown'"
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
          </svg>
        </button>

        <button class="icon-btn" title="Minha Conta" @click="navigateToAccount">
          <img
            v-if="authStore.profile && authStore.profile.avatar_url"
            :src="authStore.profile.avatar_url"
            alt="Avatar"
            class="header-avatar"
          />
          <svg
            v-else
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
        </button>

        <button @click="logout" class="icon-btn" title="Sair">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
        </button>
      </div>
    </div>
  </header>
</template>

<style scoped>
.header-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid var(--c-border);
}
.app-header {
  height: var(--header-height);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--spacing-4);
  background-color: var(--c-surface);
  border-bottom: 1px solid var(--c-border);
  z-index: 100;
}
.header-group {
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
}
.header-group.center {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}
.logo {
  height: 24px;
}
.divider {
  width: 1px;
  height: 24px;
  background-color: var(--c-border);
}
.document-title {
  font-weight: var(--fw-semibold);
  color: var(--c-text-primary);
}
.user-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  border: 1px solid var(--c-border);
  padding: var(--spacing-1);
  border-radius: var(--radius-full);
}
.icon-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--c-text-secondary);
  border-radius: var(--radius-full);
}
.icon-btn:hover {
  background-color: var(--c-surface-dark);
  color: var(--c-text-primary);
}
.btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-2) var(--spacing-4);
  border-radius: var(--radius-md);
  font-weight: var(--fw-semibold);
  transition: var(--transition-fast);
  border: none;
  cursor: pointer;
}
.btn-secondary {
  background-color: var(--c-surface-dark);
  color: var(--c-text-primary);
  border: 1px solid var(--c-border);
}
.btn-secondary:hover {
  border-color: var(--c-border-hover);
  background-color: var(--c-background);
}
.unit-controls {
  display: flex;
  background-color: var(--c-surface-dark);
  border-radius: var(--radius-md);
  padding: var(--spacing-1);
}
.unit-controls button {
  padding: var(--spacing-1) var(--spacing-3);
  font-size: var(--fs-xs);
  font-weight: var(--fw-semibold);
  color: var(--c-text-secondary);
  border-radius: var(--radius-sm);
  transition: var(--transition-fast);
}
.unit-controls button.active {
  background-color: var(--c-white);
  color: var(--c-primary);
  box-shadow: var(--shadow-sm);
}
.unit-controls button:not(.active):hover {
  color: var(--c-text-primary);
}
</style>
