<script setup>
import { ref } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { RouterLink } from 'vue-router'

const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const isLoading = ref(false)
const errorMsg = ref('')

async function handleSubmit() {
  if (isLoading.value) return
  isLoading.value = true
  errorMsg.value = ''

  try {
    await authStore.handleLogin({ email: email.value, password: password.value })
    authStore.setAuthenticating(true);
  } catch (error) {
    errorMsg.value = error.message || 'Ocorreu um erro desconhecido.'
    isLoading.value = false;
  }
}
</script>

<template>
  <div class="auth-container">
    <div class="auth-card">
      <div class="card-content">
        <img src="https://fvtzdioouypsooogsoow.supabase.co/storage/v1/object/public/logo/logo%20teste.png" alt="Logo" class="logo" />
        <h1 class="title">Bem-vindo de volta!</h1>
        <p class="subtitle">Faça login para continuar sua jornada criativa.</p>

        <form @submit.prevent="handleSubmit" class="auth-form" novalidate>
          <div class="input-group">
            <input type="email" id="email" v-model="email" placeholder=" " required :disabled="isLoading" />
            <label for="email">Seu e-mail</label>
          </div>
          <div class="input-group">
            <input type="password" id="password" v-model="password" placeholder=" " required :disabled="isLoading" />
            <label for="password">Sua senha</label>
          </div>

          <p v-if="errorMsg" class="error-message">{{ errorMsg }}</p>

          <button type="submit" class="submit-btn" :disabled="isLoading">
            <span class="btn-text">{{ isLoading ? 'Processando...' : 'Entrar' }}</span>
          </button>
        </form>

        <p class="register-link">
          Não tem uma conta?
          <router-link to="/register">Cadastre-se</router-link>
        </p>
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
  background: linear-gradient(135deg, var(--c-palette-sky-light), var(--c-palette-mint), var(--c-palette-lemon), var(--c-palette-peach));
  background-size: 400% 400%;
  animation: gradient 18s ease infinite;
  padding: 2rem;
}

@keyframes gradient {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.auth-card {
  width: 100%;
  max-width: 420px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border-radius: var(--radius-lg);
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.1);
  padding: var(--spacing-6);
}

.card-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.logo {
  width: 70px;
  height: auto;
  margin-bottom: var(--spacing-5);
}

.title {
  font-size: 1.8rem;
  font-weight: var(--fw-bold);
  color: var(--c-text-primary);
}

.subtitle {
  font-size: var(--fs-base);
  margin-top: var(--spacing-1);
  margin-bottom: var(--spacing-5);
  color: var(--c-text-secondary);
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
  padding: 12px 14px;
  border-radius: var(--radius-md);
  border: 1px solid var(--c-border);
  background: var(--c-white);
  font-size: var(--fs-base);
  color: var(--c-text-primary);
  transition: all 0.2s ease;
}

.input-group input:focus {
  outline: none;
  border-color: var(--c-primary);
  box-shadow: 0 0 0 3px rgba(59, 178, 239, 0.2);
}

.input-group label {
  position: absolute;
  top: 13px;
  left: 14px;
  color: var(--c-text-secondary);
  pointer-events: none;
  transition: all 0.2s ease;
  background-color: var(--c-white);
  padding: 0 4px;
}

.input-group input:focus + label,
.input-group input:not(:placeholder-shown) + label {
  top: -8px;
  left: 10px;
  font-size: var(--fs-xs);
  color: var(--c-primary);
}

.error-message {
  color: #e53e3e;
  font-size: var(--fs-sm);
  margin-top: -8px;
}

.submit-btn {
  padding: 14px;
  border-radius: var(--radius-md);
  background: var(--c-primary);
  color: var(--c-white);
  font-size: var(--fs-base);
  font-weight: var(--fw-semibold);
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.submit-btn:hover:not(:disabled) {
    background: var(--c-primary-hover);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.register-link {
  margin-top: var(--spacing-5);
  font-size: var(--fs-sm);
  color: var(--c-text-secondary);
}

.register-link a {
  color: var(--c-primary);
  font-weight: var(--fw-semibold);
  text-decoration: none;
}

.register-link a:hover {
  text-decoration: underline;
}
</style>
