<script setup>
import { ref } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { RouterLink } from 'vue-router'

const authStore = useAuthStore()

const fullName = ref('')
const phone = ref('')
const email = ref('')
const password = ref('')

const isLoading = ref(false)
const errorMsg = ref('')
const registrationSuccess = ref(false)

async function handleSubmit() {
  if (isLoading.value) return
  isLoading.value = true
  errorMsg.value = ''

  try {
    if (password.value.length < 6) {
      throw new Error('A senha deve ter pelo menos 6 caracteres.')
    }
    await authStore.handleSignUp({
      email: email.value,
      password: password.value,
      full_name: fullName.value,
      phone: phone.value,
    })
    registrationSuccess.value = true
  } catch (error) {
    errorMsg.value = error.message || 'Ocorreu um erro desconhecido.'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="register-layout">
    <div class="image-column">
      <div class="image-overlay">
        <h2>Crie mockups incríveis em segundos.</h2>
        <p>Junte-se à nossa comunidade e dê vida às suas estampas com realismo e agilidade.</p>
      </div>
    </div>

    <div class="form-column">
      <div class="form-wrapper">
        <img src="https://fvtzdioouypsooogsoow.supabase.co/storage/v1/object/public/logo/logo%20teste.png" alt="Logo" class="logo" />

        <div v-if="!registrationSuccess" class="form-content">
          <h1 class="title">Crie sua conta</h1>
          <p class="subtitle">Comece sua jornada conosco.</p>

          <form @submit.prevent="handleSubmit" class="auth-form" novalidate>
            <div class="input-group">
              <input type="text" id="fullName" v-model="fullName" placeholder=" " required :disabled="isLoading" />
              <label for="fullName">Nome Completo</label>
            </div>
            <div class="input-group">
              <input type="tel" id="phone" v-model="phone" placeholder=" " :disabled="isLoading" />
              <label for="phone">Telefone (Opcional)</label>
            </div>
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
              <span class="btn-text">{{ isLoading ? 'Processando...' : 'Criar Conta' }}</span>
            </button>
          </form>

          <p class="login-link">
            Já tem uma conta?
            <router-link to="/auth">Faça login</router-link>
          </p>
        </div>

        <div v-else class="success-message">
          <h1 class="title">Verifique seu e-mail</h1>
          <p class="subtitle">
            Enviamos um link de confirmação para <strong>{{ email }}</strong>. Por favor, clique no link para ativar sua conta.
          </p>
          <router-link to="/auth" class="btn-back">Voltar para o Login</router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.register-layout {
  display: flex;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

.image-column {
  width: 75%;
  height: 100%;
  background-image: url('https://images.pexels.com/photos/7130560/pexels-photo-7130560.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2');
  background-size: cover;
  background-position: center;
  position: relative;
  display: flex;
  align-items: flex-end;
  padding: 60px;
}

.image-overlay {
  background: linear-gradient(to top, rgba(0, 0, 0, 0.7), transparent);
  color: white;
  padding: 2rem;
  border-radius: var(--radius-lg);
  max-width: 500px;
}

.image-overlay h2 {
  font-size: 2.5rem;
  font-weight: var(--fw-bold);
  margin-bottom: 1rem;
}

.image-overlay p {
  font-size: 1.1rem;
  line-height: 1.6;
}

.form-column {
  width: 25%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--c-surface);
  padding: 2rem;
  overflow-y: auto;
}

.form-wrapper {
  width: 100%;
  max-width: 380px;
}

.logo {
  width: 60px;
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
  background: var(--c-surface-dark);
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
  background-color: var(--c-surface-dark);
  padding: 0 4px;
}

html.dark .input-group label {
    background-color: var(--c-surface);
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
  background-color: var(--c-success);
  color: var(--c-white);
  font-size: var(--fs-base);
  font-weight: var(--fw-semibold);
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.submit-btn:hover:not(:disabled) {
  background-color: #58b448;
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.login-link {
  margin-top: var(--spacing-5);
  font-size: var(--fs-sm);
  color: var(--c-text-secondary);
}

.login-link a {
  color: var(--c-primary);
  font-weight: var(--fw-semibold);
  text-decoration: none;
}

.login-link a:hover {
  text-decoration: underline;
}

.success-message {
  text-align: center;
}

.btn-back {
  display: inline-block;
  margin-top: 20px;
  padding: 10px 20px;
  background-color: transparent;
  border: 1px solid var(--c-border);
  color: var(--c-text-primary);
  border-radius: var(--radius-md);
  text-decoration: none;
  font-weight: var(--fw-semibold);
}

@media (max-width: 1024px) {
  .image-column {
    display: none;
  }
  .form-column {
    width: 100%;
  }
}
</style>
