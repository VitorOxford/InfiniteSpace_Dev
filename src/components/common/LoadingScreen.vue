<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'vue-router';

const authStore = useAuthStore();
const router = useRouter();

const progress = ref(0);
const message = ref('Iniciando conexão segura...');
const show = ref(false);

const messages = [
  'Autenticando credenciais...',
  'Carregando recursos essenciais...',
  'Otimizando workspace para sua experiência...',
  'Sincronizando dados em tempo real...',
  'Finalizando configurações de ambiente...',
  'Preparando ferramentas criativas...',
  'Aguarde um instante...',
];

const videoSources = [
  "https://fvtzdioouypsooogsoow.supabase.co/storage/v1/object/public/logo/vid1.mp4",
  "https://fvtzdioouypsooogsoow.supabase.co/storage/v1/object/public/logo/vid2.mp4",
  "https://fvtzdioouypsooogsoow.supabase.co/storage/v1/object/public/logo/vid3.mp4"
];
const videoPlayerA = ref(null);
const videoPlayerB = ref(null);
const activePlayer = ref('A');
let currentVideoIndex = 0;
let intervalId = null;
let messageTimeoutId = null;
let animationFrameId = null;
let resizeHandler = null; // Variável para guardar a referência da função de resize

const playNextVideo = () => {
  currentVideoIndex = (currentVideoIndex + 1) % videoSources.length;
  const nextPlayer = activePlayer.value === 'A' ? videoPlayerB.value : videoPlayerA.value;
  if (nextPlayer) {
    nextPlayer.src = videoSources[currentVideoIndex];
    nextPlayer.load();
    nextPlayer.play();
    activePlayer.value = activePlayer.value === 'A' ? 'B' : 'A';
  }
};

const progressBarStyle = computed(() => ({
  width: `${progress.value}%`,
}));

const startLoadingAnimation = () => {
  show.value = true;
  progress.value = 0;
  message.value = 'Iniciando conexão segura...';
  let messageIndex = 0;

  intervalId = setInterval(() => {
    if (progress.value < 100) {
      progress.value += 1;
    } else {
      clearInterval(intervalId);
      message.value = 'Bem-vindo(a)!';
      setTimeout(() => {
        router.push('/');
        setTimeout(() => {
          show.value = false;
          authStore.setAuthenticating(false);
        }, 600);
      }, 1000);
    }
  }, 50);

  const changeMessage = () => {
    if (progress.value < 95) {
      setTimeout(() => {
        message.value = messages[messageIndex % messages.length];
        messageIndex++;
        messageTimeoutId = setTimeout(changeMessage, 2000);
      }, 300);
    }
  };
  messageTimeoutId = setTimeout(changeMessage, 1800);
};

const initParticles = () => {
  const canvas = document.getElementById('particle-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  let particles = [];
  const particleCount = 80;
  const connectionDistance = 120;
  const brandColors = [
    [137, 222, 247], [226, 245, 204], [252, 241, 149],
    [255, 214, 150], [103, 207, 83], [59, 178, 239]
  ];

  function createParticles() { /* ... implementação idêntica à anterior ... */ }
  function animate() { /* ... implementação idêntica à anterior ... */ }

  createParticles();
  animate();

  // CORREÇÃO: Guardamos a função de resize para poder removê-la depois
  resizeHandler = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    createParticles();
  };
  window.addEventListener('resize', resizeHandler);
};


onMounted(() => {
  watch(() => authStore.isAuthenticating, (newValue) => {
    if (newValue) {
      startLoadingAnimation();
      setTimeout(() => {
        if (videoPlayerA.value) {
          videoPlayerA.value.src = videoSources[0];
          videoPlayerA.value.play();
        }
        initParticles();
      }, 10);
    }
  }, { immediate: true });
});

onUnmounted(() => {
  clearInterval(intervalId);
  clearTimeout(messageTimeoutId);
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  // CORREÇÃO: Remove o "ouvinte" de resize para evitar o vazamento de memória
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler);
  }
});
</script>

<template>
  <transition name="loading-fade">
    <div v-if="show" class="loading-overlay">

<div class="video-container">
        <video ref="videoPlayerA" muted playsinline class="background-video" :class="{ active: activePlayer === 'A' }" @ended="playNextVideo"></video>
        <video ref="videoPlayerB" muted playsinline class="background-video" :class="{ active: activePlayer === 'B' }" @ended="playNextVideo"></video>
        <div class="video-filter"></div>
      </div>


<canvas id="particle-canvas"></canvas>


<div class="loading-content">
        <div class="logo-container">
          <img src="https://fvtzdioouypsooogsoow.supabase.co/storage/v1/object/public/logo/logo%20teste.png"
            alt="Logo" class="loading-logo" />
        </div>
        <transition name="message-fade" mode="out-in">
          <p :key="message" class="loading-message">{{ message }}</p>
        </transition>
        <div class="progress-bar-container">
          <div class="progress-bar" :style="progressBarStyle"></div>
        </div>
        <p class="loading-info">INspace Studio • Carregando sistema</p>
      </div>
    </div>
  </transition>
</template>

<style scoped>
/* Estilos permanecem os mesmos */
.loading-overlay {
  position: fixed;
  top: 0; left: 0;
  width: 100vw; height: 100vh;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  color: #fff;
  background-color: #000;
}

.loading-fade-enter-active, .loading-fade-leave-active {
  transition: opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}
.loading-fade-enter-from, .loading-fade-leave-to { opacity: 0; }

.video-container {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  z-index: 1;
}

.background-video {
  position: absolute;
  top: 50%; left: 50%;
  width: 100%; height: 100%;
  object-fit: cover;
  transform: translate(-50%, -50%);
  opacity: 0;
  transition: opacity 1s ease-in-out;
}

.background-video.active {
  opacity: 1;
}

.video-filter {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  background-color: rgba(10, 10, 20, 0.6);
  backdrop-filter: blur(2px);
  z-index: 2;
}

#particle-canvas {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  z-index: 3;
  opacity: 0.5;
}

.loading-content {
  position: relative;
  z-index: 4;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
}

.logo-container {
  position: relative;
  margin-bottom: 40px;
}

.logo-container::before {
  content: '';
  position: absolute;
  top: 50%; left: 50%;
  width: 140px; height: 140px;
  background: radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  animation: glow-pulse 3s infinite ease-in-out;
}

@keyframes glow-pulse {
  0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.7; }
  50% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
}

.loading-logo {
  position: relative;
  width: 80px; height: 80px;
  filter: drop-shadow(0 0 20px rgba(255,255,255,0.4));
}

.loading-message {
  font-size: 1.1rem;
  margin-bottom: 24px;
  min-height: 25px;
  font-weight: 500;
  letter-spacing: 0.5px;
}

.message-fade-enter-active, .message-fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.message-fade-enter-from { opacity: 0; transform: translateY(10px); }
.message-fade-leave-to { opacity: 0; transform: translateY(-10px); }

.progress-bar-container {
  position: relative;
  width: 320px; height: 4px;
  background-color: rgba(255,255,255,0.2);
  border-radius: 2px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: #fff;
  border-radius: 2px;
  transition: width 0.15s linear;
  box-shadow: 0 0 10px #fff, 0 0 20px #fff;
}

.progress-bar::after {
  content: '';
  position: absolute;
  top: 0; right: 0; bottom: 0; left: 0;
  background: linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0) 100%);
  animation: shine 2s infinite linear;
  transform: translateX(-100%);
}

@keyframes shine { to { transform: translateX(100%); } }

.loading-info {
  font-size: 0.8rem;
  color: rgba(255,255,255,0.7);
  margin-top: 16px;
  letter-spacing: 1px;
  text-transform: uppercase;
}
</style>
