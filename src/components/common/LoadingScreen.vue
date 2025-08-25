<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'vue-router';

const authStore = useAuthStore();
const router = useRouter();

const progress = ref(0);
const message = ref('Iniciando conexão segura...');
const show = ref(false);
const showMessage = ref(true);

const messages = [
  'Autenticando credenciais...',
  'Carregando recursos essenciais...',
  'Otimizando workspace para sua experiência...',
  'Sincronizando dados em tempo real...',
  'Finalizando configurações de ambiente...',
  'Preparando ferramentas criativas...',
  'Aguarde um instante...',
];

let intervalId = null;
let messageTimeoutId = null;
let animationFrameId = null;

const progressBarStyle = computed(() => ({
  width: `${progress.value}%`,
}));

const startLoading = () => {
  show.value = true;
  progress.value = 0;
  message.value = 'Iniciando conexão segura...';
  let messageIndex = 0;

  intervalId = setInterval(() => {
    if (progress.value < 100) {
      progress.value += 1;
    } else {
      clearInterval(intervalId);
      showMessage.value = false;
      setTimeout(() => {
        message.value = 'Bem-vindo(a)!';
        showMessage.value = true;
        setTimeout(() => {
          router.push('/');
          setTimeout(() => {
            show.value = false;
            authStore.setAuthenticating(false);
          }, 500);
        }, 1000);
      }, 300);
    }
  }, 50);

  const changeMessage = () => {
    if (progress.value < 95) {
      showMessage.value = false; // Inicia a transição de saída
      setTimeout(() => {
        message.value = messages[messageIndex % messages.length];
        messageIndex++;
        showMessage.value = true; // Inicia a transição de entrada
        messageTimeoutId = setTimeout(changeMessage, 2000);
      }, 300); // Espera a animação de fade-out terminar
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

  let particles;
  const particleCount = 70;
  const connectionDistance = 120;

  function createParticles() {
    particles = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: Math.random() * 0.4 - 0.2,
        vy: Math.random() * 0.4 - 0.2,
        radius: Math.random() * 1.5 + 1,
      });
    }
  }

  function connectParticles() {
    for (let a = 0; a < particles.length; a++) {
      for (let b = a; b < particles.length; b++) {
        const dx = particles[a].x - particles[b].x;
        const dy = particles[a].y - particles[b].y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < connectionDistance) {
          ctx.strokeStyle = `rgba(0, 119, 204, ${1 - distance / connectionDistance})`;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(particles[a].x, particles[a].y);
          ctx.lineTo(particles[b].x, particles[b].y);
          ctx.stroke();
        }
      }
    }
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 119, 204, 0.8)';
      ctx.fill();
    });
    connectParticles();
    animationFrameId = requestAnimationFrame(animate);
  }

  createParticles();
  animate();

  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    createParticles();
  });
};


onMounted(() => {
  watch(() => authStore.isAuthenticating, (newValue) => {
    if (newValue) {
      startLoading();
      setTimeout(initParticles, 10);
    }
  }, { immediate: true });
});


onUnmounted(() => {
  clearInterval(intervalId);
  clearTimeout(messageTimeoutId);
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
});
</script>

<template>
  <transition name="loading-fade">
    <div v-if="show" class="loading-overlay">
      <canvas id="particle-canvas"></canvas>
      <div class="loading-content">
        <div class="logo-container">
          <img src="/logo.svg" alt="Logo" class="loading-logo" />
        </div>

        <transition name="message-fade" mode="out-in">
          <p :key="message" class="loading-message">{{ message }}</p>
        </transition>

        <div class="progress-bar-container">
          <div class="progress-bar" :style="progressBarStyle"></div>
        </div>
        <p class="loading-info">MockupCreator Pro • Carregando sistema</p>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: #0c0c0f; /* Um preto mais profundo */
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #e0e0e0;
}

.loading-fade-enter-active, .loading-fade-leave-active {
  transition: opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}
.loading-fade-enter-from, .loading-fade-leave-to {
  opacity: 0;
}

#particle-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0.6;
}

.loading-content {
  z-index: 2;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.logo-container {
  position: relative;
  margin-bottom: 40px;
}

.logo-container::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 100px;
  height: 100px;
  background: radial-gradient(circle, rgba(13, 153, 255, 0.3) 0%, rgba(13, 153, 255, 0) 60%);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  animation: glow-pulse 3s infinite ease-in-out;
}

@keyframes glow-pulse {
  0%, 100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0.7;
  }
  50% {
    transform: translate(-50%, -50%) scale(1.3);
    opacity: 1;
  }
}

.loading-logo {
  position: relative;
  width: 64px;
  height: 64px;
  filter: drop-shadow(0 0 15px rgba(13, 153, 255, 0.5));
}

.loading-message {
  font-size: 1.1rem;
  margin-bottom: 24px;
  min-height: 25px;
  font-weight: 400;
  color: #ccc;
  letter-spacing: 0.5px;
}

.message-fade-enter-active, .message-fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.message-fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
}
.message-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.progress-bar-container {
  position: relative;
  width: 320px;
  height: 4px;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: var(--c-primary);
  border-radius: 2px;
  transition: width 0.15s linear;
  box-shadow: 0 0 10px var(--c-primary), 0 0 20px var(--c-primary);
}

.progress-bar::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background: linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0) 100%);
  animation: shine 2s infinite linear;
  transform: translateX(-100%);
}

@keyframes shine {
  to {
    transform: translateX(100%);
  }
}

.loading-info {
  font-size: 0.8rem;
  color: #666;
  margin-top: 16px;
  letter-spacing: 1px;
  text-transform: uppercase;
}
</style>
