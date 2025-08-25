<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { useAuthStore } from '@/stores/authStore'

const authStore = useAuthStore()

// --- Estado do Componente ---
const email = ref('')
const password = ref('')
const isLogin = ref(true)
const isLoading = ref(false)
const errorMsg = ref('')

// --- Lógica de Submissão ---
async function handleSubmit() {
  if (isLoading.value) return
  isLoading.value = true
  errorMsg.value = ''

  try {
    if (isLogin.value) {
      await authStore.handleLogin({ email: email.value, password: password.value })
    } else {
      if (password.value.length < 6) {
        throw new Error('A senha deve ter pelo menos 6 caracteres.')
      }
      await authStore.handleSignUp({ email: email.value, password: password.value })
    }
    // Ativa a tela de loading. A navegação será feita pelo componente de loading.
    authStore.setAuthenticating(true);

  } catch (error) {
    errorMsg.value = error.message || 'Ocorreu um erro desconhecido.'
    isLoading.value = false; // Para o loading apenas se der erro
  }
}


// --- Propriedades Computadas para o Template ---
const title = computed(() => (isLogin.value ? 'Bem-vindo de volta!' : 'Crie sua conta'))
const subtitle = computed(() => (isLogin.value ? 'Faça login para continuar' : 'Comece sua jornada conosco'))
const buttonText = computed(() => {
  if (isLoading.value) return 'Processando...'
  return isLogin.value ? 'Entrar' : 'Cadastrar'
})
const toggleText = computed(() => (isLogin.value ? 'Não tem uma conta? Cadastre-se' : 'Já tem uma conta? Faça login'))

function toggleMode() {
  isLogin.value = !isLogin.value
  errorMsg.value = ''
}

// Garante que o estado de autenticação seja resetado se o usuário sair da página
onUnmounted(() => {
    authStore.setAuthenticating(false);
});
</script>

<template>
  <div class="auth-container">
    <div class="background-gradient"></div>
    <div class="auth-card">
      <div class="card-content">
        <img src="/logo.svg" alt="MockupCreator Pro Logo" class="logo" />
        <h1 class="title">{{ title }}</h1>
        <p class="subtitle">{{ subtitle }}</p>

        <form @submit.prevent="handleSubmit" class="auth-form" novalidate>
          <div class="input-group">
            <input
              type="email"
              id="email"
              v-model="email"
              placeholder=" "
              required
              :disabled="isLoading"
            />
            <label for="email">Seu e-mail</label>
          </div>
          <div class="input-group">
            <input
              type="password"
              id="password"
              v-model="password"
              placeholder=" "
              required
              :disabled="isLoading"
            />
            <label for="password">Sua senha</label>
          </div>

          <p v-if="errorMsg" class="error-message">{{ errorMsg }}</p>

          <button type="submit" class="submit-btn" :disabled="isLoading">
            <span class="btn-text">{{ buttonText }}</span>
          </button>
        </form>

        <a @click="toggleMode" class="toggle-link">{{ toggleText }}</a>
      </div>
    </div>
    <div class="marquee">
      <div class="marquee-content">
        <span>Workspace Infinito</span>
        <span class="separator">◆</span>
        <span>Renderização em Tempo Real</span>
        <span class="separator">◆</span>
        <span>Assets Premium</span>
        <span class="separator">◆</span>
        <span>Colaboração em Nuvem</span>
        <span class="separator">◆</span>
        <span>Exportação de Alta Qualidade</span>
        <span class="separator">◆</span>
      </div>
      <div class="marquee-content" aria-hidden="true">
        <span>Workspace Infinito</span>
        <span class="separator">◆</span>
        <span>Renderização em Tempo Real</span>
        <span class="separator">◆</span>
        <span>Assets Premium</span>
        <span class="separator">◆</span>
        <span>Colaboração em Nuvem</span>
        <span class="separator">◆</span>
        <span>Exportação de Alta Qualidade</span>
        <span class="separator">◆</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  overflow: hidden;
  position: relative;
}

.background-gradient {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(-45deg, #0d99ff, #0077cc, #171a1f, #5a6472);
  background-size: 400% 400%;
  animation: gradient 15s ease infinite;
  z-index: 1;
}

@keyframes gradient {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.auth-card {
  position: relative;
  z-index: 2;
  width: 100%;
  max-width: 420px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(25px);
  -webkit-backdrop-filter: blur(25px);
  border-radius: var(--radius-lg);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
  padding: var(--spacing-6);
  color: var(--c-white);
}

.card-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.logo {
  width: 48px;
  height: 48px;
  margin-bottom: var(--spacing-4);
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
}

.title {
  font-size: 1.75rem;
  font-weight: var(--fw-bold);
  margin: 0;
}

.subtitle {
  font-size: var(--fs-base);
  margin-top: var(--spacing-1);
  margin-bottom: var(--spacing-5);
  color: rgba(255, 255, 255, 0.8);
}

.auth-form {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

.input-group {
  position: relative;
}

.input-group input {
  width: 100%;
  padding: 14px 16px;
  border-radius: var(--radius-md);
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.15);
  font-family: inherit;
  font-size: var(--fs-base);
  color: var(--c-white);
  transition: border-color 0.2s ease, background-color 0.2s ease;
}

.input-group input:focus {
  outline: none;
  border-color: var(--c-primary);
  background-color: rgba(0, 0, 0, 0.1);
}

.input-group label {
  position: absolute;
  top: 15px;
  left: 16px;
  font-size: var(--fs-base);
  color: rgba(255, 255, 255, 0.7);
  pointer-events: none;
  transition: all 0.2s ease;
}

.input-group input:focus + label,
.input-group input:not(:placeholder-shown) + label {
  top: -8px;
  left: 12px;
  font-size: var(--fs-xs);
  color: var(--c-primary);
  background: #1e293b;
  padding: 0 4px;
  border-radius: 2px;
}

.error-message {
  color: #ff8a8a;
  font-size: var(--fs-sm);
  margin: calc(-1 * var(--spacing-2)) 0;
  text-align: center;
}

.submit-btn {
  padding: 14px;
  border-radius: var(--radius-md);
  background-color: var(--c-primary);
  color: var(--c-white);
  font-size: var(--fs-base);
  font-weight: var(--fw-semibold);
  cursor: pointer;
  transition: background-color 0.2s ease, transform 0.1s ease;
  position: relative;
}

.submit-btn:hover:not(:disabled) {
  background-color: var(--c-primary-hover);
  transform: translateY(-2px);
}

.submit-btn:active:not(:disabled) {
  transform: translateY(0);
}

.submit-btn:disabled {
  background-color: var(--c-text-tertiary);
  cursor: not-allowed;
}

.toggle-link {
  margin-top: var(--spacing-5);
  color: rgba(255, 255, 255, 0.8);
  font-size: var(--fs-sm);
  text-decoration: none;
  cursor: pointer;
  transition: color 0.2s ease;
}

.toggle-link:hover {
  color: var(--c-white);
  text-decoration: underline;
}

/* MARQUEE STYLES */
.marquee {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  padding: var(--spacing-3) 0;
  background: rgba(0, 0, 0, 0.2);
  white-space: nowrap;
  overflow: hidden;
  z-index: 2;
  display: flex;
}

.marquee-content {
  display: flex;
  align-items: center;
  animation: marquee 40s linear infinite;
}

.marquee-content span {
  font-size: var(--fs-base);
  font-weight: var(--fw-medium);
  color: rgba(255, 255, 255, 0.9);
  padding: 0 var(--spacing-5);
}

.marquee-content .separator {
  color: var(--c-primary);
  font-size: 1.2rem;
}

@keyframes marquee {
  from {
    transform: translateX(0%);
  }
  to {
    transform: translateX(-100%);
  }
}
</style>
