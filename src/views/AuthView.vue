<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { RouterLink } from 'vue-router'

const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const isLoading = ref(false)
const errorMsg = ref('')

const videoSources = [
  "https://fvtzdioouypsooogsoow.supabase.co/storage/v1/object/public/logo/vid1.mp4",
  "https://fvtzdioouypsooogsoow.supabase.co/storage/v1/object/public/logo/vid2.mp4",
  "https://fvtzdioouypsooogsoow.supabase.co/storage/v1/object/public/logo/vid3.mp4"
];
const videoPlayerA = ref(null);
const videoPlayerB = ref(null);
const activePlayer = ref('A');
let currentVideoIndex = 0;

const incentivePhrases = [
  "Crie e edite artes, maquetes e muito mais!",
  "Dê vida às suas ideias com ferramentas poderosas.",
  "Transforme sua visão em realidade visual.",
  "Design sem limites, resultados impressionantes.",
  "Inspire-se, crie e compartilhe sua arte."
];
const currentPhraseIndex = ref(0);
let phraseInterval;

const playNextVideo = () => {
  currentVideoIndex = (currentVideoIndex + 1) % videoSources.length;
  const nextPlayer = activePlayer.value === 'A' ? videoPlayerB.value : videoPlayerA.value;
  nextPlayer.src = videoSources[currentVideoIndex];
  nextPlayer.load();
  nextPlayer.play();

  // Troca a opacidade para criar o crossfade
  activePlayer.value = activePlayer.value === 'A' ? 'B' : 'A';
};

onMounted(() => {
  phraseInterval = setInterval(() => {
    currentPhraseIndex.value = (currentPhraseIndex.value + 1) % incentivePhrases.length;
  }, 5000);

  // Inicia o primeiro vídeo
  if (videoPlayerA.value) {
    videoPlayerA.value.src = videoSources[0];
    videoPlayerA.value.play();
  }
});

onBeforeUnmount(() => {
  clearInterval(phraseInterval);
});

async function handleSubmit() {
  if (isLoading.value) return
  isLoading.value = true
  errorMsg.value = ''

  try {
    await authStore.handleLogin({ email: email.value, password: password.value })
    authStore.setAuthenticating(true);
  } catch (error) {
    if (error.message === 'Email not confirmed') {
      errorMsg.value = 'Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada.'
    } else if (error.message === 'Invalid login credentials') {
      errorMsg.value = 'E-mail ou senha inválidos. Tente novamente.'
    } else {
      errorMsg.value = 'Ocorreu um erro ao tentar fazer login.'
    }
    isLoading.value = false;
  }
}
</script>

<template>
  <div class="auth-wrapper login-layout">
    <div class="video-container">
      <video ref="videoPlayerA" muted playsinline class="background-video" :class="{ active: activePlayer === 'A' }" @ended="playNextVideo"></video>
      <video ref="videoPlayerB" muted playsinline class="background-video" :class="{ active: activePlayer === 'B' }" @ended="playNextVideo"></video>
    </div>

    <div class="text-section">
      <div class="text-content">
        <Transition name="slide-up" mode="out-in">
          <h1 :key="currentPhraseIndex" class="incentive-title">
            {{ incentivePhrases[currentPhraseIndex] }}
          </h1>
        </Transition>
        <p class="incentive-subtitle">
          Junte-se à nossa comunidade e dê vida às suas criações com realismo e agilidade.
        </p>
      </div>
    </div>

    <div class="form-section">
      <div class="auth-card">
        <div class="card-content">
          <div class="logo-container">
            <img src="https://fvtzdioouypsooogsoow.supabase.co/storage/v1/object/public/logo/logo%20teste.png" alt="Logo" class="logo" />
          </div>
          <h2 class="form-title">Bem-vindo de volta!</h2>
          <p class="form-subtitle">Faça login para continuar sua jornada.</p>

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
              <span class="btn-text">{{ isLoading ? 'Entrando...' : 'Entrar' }}</span>
            </button>
          </form>

          <p class="register-link">
            Não tem uma conta?
            <router-link to="/register">Cadastre-se</router-link>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Estilos base (wrapper, seções, etc.) */
.auth-wrapper {
  position: relative;
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  color: var(--c-white);
}

.video-container {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  z-index: 0;
}

.background-video {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: translate(-50%, -50%);
  filter: brightness(0.6);
  opacity: 0;
  transition: opacity 1s ease-in-out; /* Transição de crossfade */
}

.background-video.active {
  opacity: 1;
}

.text-section, .form-section {
  position: relative;
  z-index: 1;
  width: 50%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  box-sizing: border-box;
  padding: 4vw;
}

/* Layout do Login */
.login-layout .text-section {
  align-items: flex-start;
  text-align: left;
  background: linear-gradient(to right, rgba(0,0,0,0.5), transparent);
}
.login-layout .form-section {
  align-items: center;
  background: var(--form-bg-color-start);
  animation: color-shift 20s infinite alternate, slideInRight 0.8s 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
  box-shadow: -10px 0 30px rgba(0,0,0,0.25);
}

/* Conteúdo de Texto */
.text-content { max-width: 550px; }
.incentive-title {
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: var(--fw-bold);
  line-height: 1.2;
  margin-bottom: var(--spacing-4);
  text-shadow: 2px 2px 8px rgba(0,0,0,0.7);
}
.incentive-subtitle {
  font-size: clamp(1rem, 2vw, 1.25rem);
  line-height: 1.6;
  text-shadow: 1px 1px 4px rgba(0,0,0,0.7);
}

/* Formulário e Card */
.auth-card {
  width: 100%;
  max-width: 380px;
  background: transparent;
  padding: var(--spacing-4);
  box-shadow: none;
}
.card-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}
.logo-container {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--spacing-5);
}
.logo-container::before {
  content: '';
  position: absolute;
  width: 150px; /* Maior que a logo */
  height: 150px;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0) 70%);
  z-index: 0;
}
.logo {
  width: 100px;
  height: auto;
  position: relative;
  z-index: 1;
  filter: drop-shadow(0 4px 15px rgba(0, 0, 0, 0.5));
}
.form-title {
  font-size: 1.8rem;
  font-weight: var(--fw-bold);
  color: var(--c-text-primary);
}
.form-subtitle {
  margin-bottom: var(--spacing-5);
  color: var(--c-text-secondary);
}
.auth-form {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}
.input-group, .submit-btn, .register-link {
  color: var(--c-text-primary);
}
.input-group { position: relative; }
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
  top: 13px; left: 14px;
  color: var(--c-text-secondary);
  pointer-events: none;
  transition: all 0.2s ease;
  background-color: var(--c-white);
  padding: 0 4px;
}
.input-group input:focus + label, .input-group input:not(:placeholder-shown) + label {
  top: -8px; left: 10px;
  font-size: var(--fs-xs);
  color: var(--c-primary);
}
.error-message { color: #e53e3e; font-size: var(--fs-sm); margin-top: -8px; }
.submit-btn {
  padding: 14px;
  border-radius: var(--radius-md);
  background: var(--c-primary);
  color: var(--c-white);
  font-weight: var(--fw-semibold);
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
}
.submit-btn:hover:not(:disabled) {
  background: var(--c-primary-hover);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}
.register-link { margin-top: var(--spacing-5); font-size: var(--fs-sm); color: var(--c-text-secondary); }
.register-link a { color: var(--c-primary); font-weight: var(--fw-semibold); text-decoration: none; }
.register-link a:hover { text-decoration: underline; }

/* Animações */
.slide-up-enter-active, .slide-up-leave-active { transition: all 0.5s ease-out; }
.slide-up-enter-from { opacity: 0; transform: translateY(20px); }
.slide-up-leave-to { opacity: 0; transform: translateY(-20px); }

@keyframes slideInRight {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
@keyframes color-shift {
  0% { background-color: rgba(255, 255, 255, 0.9); }
  50% { background-color: rgba(245, 250, 255, 0.92); }
  100% { background-color: rgba(255, 255, 255, 0.9); }
}

@media (max-width: 800px) {
  .auth-wrapper { flex-direction: column; }
  .text-section, .form-section { width: 100%; }
  .login-layout .text-section { align-items: center; text-align: center; background: linear-gradient(to bottom, rgba(0,0,0,0.6), transparent); }
  .login-layout .form-section { box-shadow: 0 -10px 30px rgba(0,0,0,0.25); }
  .form-section { animation: slideInUp 0.8s 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) both !important; }
}

@keyframes slideInUp {
  from { transform: translateY(100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
</style>
