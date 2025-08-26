<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()

const fullName = ref('')
const email = ref('')
const password = ref('')
const phone = ref('')
const isLoading = ref(false)
const errorMsg = ref('')
const successMsg = ref('')

// Lógica para transição de vídeo fluida
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
  "Liberte sua criatividade, sem limites!",
  "Transforme ideias em visuais incríveis.",
  "Sua arte, nossas ferramentas, infinitas possibilidades.",
  "Edite com precisão, crie com paixão.",
  "Comece a construir seu portfólio de designs únicos."
];
const currentPhraseIndex = ref(0);
let phraseInterval;

// Função para tocar o próximo vídeo com transição crossfade
const playNextVideo = () => {
  currentVideoIndex = (currentVideoIndex + 1) % videoSources.length;
  const nextPlayerEl = activePlayer.value === 'A' ? videoPlayerB.value : videoPlayerA.value;

  if (nextPlayerEl) {
    nextPlayerEl.src = videoSources[currentVideoIndex];
    nextPlayerEl.load();
    nextPlayerEl.play();

    // Alterna a classe 'active' para acionar o crossfade no CSS
    activePlayer.value = activePlayer.value === 'A' ? 'B' : 'A';
  }
};

onMounted(() => {
  // Inicia a animação das frases
  phraseInterval = setInterval(() => {
    currentPhraseIndex.value = (currentPhraseIndex.value + 1) % incentivePhrases.length;
  }, 5000); // Muda a cada 5 segundos

  // Configura os players de vídeo para a transição
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
  successMsg.value = ''

  try {
    await authStore.handleSignUp({
      full_name: fullName.value,
      email: email.value,
      password: password.value,
      phone: phone.value,
    })
    successMsg.value = 'Cadastro realizado! Verifique seu e-mail para confirmar a conta.'
    fullName.value = ''
    email.value = ''
    password.value = ''
    phone.value = ''
  } catch (error) {
    errorMsg.value = 'Este e-mail já está em uso. Tente fazer login.'
  } finally {
    isLoading.value = false
  }
}

function returnToLogin() {
  router.push('/auth')
}
</script>

<template>
  <div class="auth-wrapper register-layout">
    <div class="video-container">
      <video ref="videoPlayerA" muted playsinline class="background-video" :class="{ active: activePlayer === 'A' }" @ended="playNextVideo"></video>
      <video ref="videoPlayerB" muted playsinline class="background-video" :class="{ active: activePlayer === 'B' }" @ended="playNextVideo"></video>
    </div>

    <div class="form-section">
      <div class="auth-card">
        <div class="card-content">
          <div class="logo-container">
            <img src="https://fvtzdioouypsooogsoow.supabase.co/storage/v1/object/public/logo/logo%20teste.png" alt="Logo" class="logo" />
          </div>
          <h2 class="form-title">Crie sua conta</h2>
          <p class="form-subtitle">E comece a criar hoje mesmo.</p>

          <form @submit.prevent="handleSubmit" class="auth-form" novalidate>
            <div class="input-group">
              <input type="text" id="fullName" v-model="fullName" placeholder=" " required :disabled="isLoading" />
              <label for="fullName">Nome Completo</label>
            </div>
            <div class="input-group">
              <input type="email" id="email" v-model="email" placeholder=" " required :disabled="isLoading" />
              <label for="email">E-mail</label>
            </div>
            <div class="input-group">
              <input type="password" id="password" v-model="password" placeholder=" " required :disabled="isLoading" />
              <label for="password">Senha</label>
            </div>
             <div class="input-group">
              <input type="tel" id="phone" v-model="phone" placeholder=" " :disabled="isLoading" />
              <label for="phone">Telefone (Opcional)</label>
            </div>

            <p v-if="errorMsg" class="error-message">{{ errorMsg }}</p>
            <p v-if="successMsg" class="success-message">{{ successMsg }}</p>

            <button type="submit" class="submit-btn" :disabled="isLoading">
              <span class="btn-text">{{ isLoading ? 'Registrando...' : 'Criar Conta' }}</span>
            </button>
          </form>

          <p class="login-link">
            Já tem uma conta?
            <a href="#" @click.prevent="returnToLogin">Fazer login</a>
          </p>
        </div>
      </div>
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
  </div>
</template>

<style scoped>
:root {
  --form-bg-color-start: rgba(255, 255, 255, 0.9);
}

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
  transition: opacity 1s ease-in-out; /* AQUI A MÁGICA DO CROSSFADE */
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

/* Layout do Registro: Formulário à esquerda, Texto à direita */
.register-layout {
  flex-direction: row-reverse; /* Inverte a ordem visual, colocando o texto à direita */
}
.register-layout .text-section {
  align-items: flex-end;
  text-align: right;
  background: linear-gradient(to left, rgba(0,0,0,0.5), transparent);
}
.register-layout .form-section {
  align-items: center;
  background: var(--form-bg-color-start);
  /* ANIMAÇÃO CORRIGIDA AQUI */
  animation: color-shift 20s infinite alternate, slideInRight 0.8s 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
  box-shadow: 10px 0 30px rgba(0,0,0,0.25);
}
/* Invertendo a animação para o formulário de registro */
@keyframes slideInRight {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

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
  width: 150px;
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
.input-group, .submit-btn, .login-link {
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
.success-message { color: #2f855a; font-size: var(--fs-sm); margin-top: -8px; }
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
.login-link { margin-top: var(--spacing-5); font-size: var(--fs-sm); color: var(--c-text-secondary); }
.login-link a { color: var(--c-primary); font-weight: var(--fw-semibold); text-decoration: none; }
.login-link a:hover { text-decoration: underline; }

/* Animações */
.slide-up-enter-active, .slide-up-leave-active { transition: all 0.5s ease-out; }
.slide-up-enter-from { opacity: 0; transform: translateY(20px); }
.slide-up-leave-to { opacity: 0; transform: translateY(-20px); }

@keyframes color-shift {
  0% { background-color: rgba(255, 255, 255, 0.9); }
  50% { background-color: rgba(245, 250, 255, 0.92); }
  100% { background-color: rgba(255, 255, 255, 0.9); }
}

@media (max-width: 800px) {
  .auth-wrapper { flex-direction: column-reverse; }
  .text-section, .form-section { width: 100%; }
  .register-layout .text-section { align-items: center; text-align: center; background: linear-gradient(to top, rgba(0,0,0,0.6), transparent); }
  .register-layout .form-section { box-shadow: 0 10px 30px rgba(0,0,0,0.25); }
  .form-section { animation: slideInUp 0.8s 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) both !important; }
}
@keyframes slideInUp {
  from { transform: translateY(100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
</style>
