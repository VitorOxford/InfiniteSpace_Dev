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
          }, 600); // espera o fade
        }, 1000);
      }, 300);
    }
  }, 50);

  const changeMessage = () => {
    if (progress.value < 95) {
      showMessage.value = false;
      setTimeout(() => {
        message.value = messages[messageIndex % messages.length];
        messageIndex++;
        showMessage.value = true;
        messageTimeoutId = setTimeout(changeMessage, 2000);
      }, 300);
    }
  };
  messageTimeoutId = setTimeout(changeMessage, 1800);
};

// HEX -> RGB
function hexToRgb(hex) {
  hex = hex.replace(/\s/g,'');
  if (!hex) return [255,255,255];
  let r=0,g=0,b=0;
  if(hex.length==4){
    r="0x"+hex[1]+hex[1]; g="0x"+hex[2]+hex[2]; b="0x"+hex[3]+hex[3];
  } else if(hex.length==7){
    r="0x"+hex[1]+hex[2]; g="0x"+hex[3]+hex[4]; b="0x"+hex[5]+hex[6];
  }
  return [+r,+g,+b];
}

// Paleta definida
const brandColors = [
  '#89def7','#e2f5cc','#fcf195','#ffd696','#67cf53','#3bb2ef','#4dc0ea','#8addf6'
].map(hex => hexToRgb(hex));

const initParticles = () => {
  const canvas = document.getElementById('particle-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  let time = 0;
  let particles = [];
  const particleCount = 80;
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
        colorIndex: Math.floor(Math.random() * brandColors.length)
      });
    }
  }

  function getCurrentColor(idx, alpha) {
    const c1 = brandColors[idx % brandColors.length];
    const c2 = brandColors[(idx+1) % brandColors.length];
    const mix = (Math.sin(time) + 1) / 2;
    const r = c1[0]*(1-mix)+c2[0]*mix;
    const g = c1[1]*(1-mix)+c2[1]*mix;
    const b = c1[2]*(1-mix)+c2[2]*mix;
    return `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${alpha})`;
  }

  function animate() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    time += 0.01;

    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x<0||p.x>canvas.width) p.vx*=-1;
      if (p.y<0||p.y>canvas.height) p.vy*=-1;

      ctx.beginPath();
      ctx.arc(p.x,p.y,p.radius,0,Math.PI*2);
      ctx.fillStyle = getCurrentColor(p.colorIndex,0.8);
      ctx.fill();
    });

    for(let a=0;a<particles.length;a++){
      for(let b=a;b<particles.length;b++){
        const dx = particles[a].x - particles[b].x;
        const dy = particles[a].y - particles[b].y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if(dist<connectionDistance){
          ctx.strokeStyle = getCurrentColor(particles[a].colorIndex,0.3);
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(particles[a].x,particles[a].y);
          ctx.lineTo(particles[b].x,particles[b].y);
          ctx.stroke();
        }
      }
    }

    animationFrameId = requestAnimationFrame(animate);
  }

  createParticles();
  animate();

  window.addEventListener('resize',()=>{
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    createParticles();
  });
};

onMounted(()=>{
  watch(()=>authStore.isAuthenticating,(newValue)=>{
    if(newValue){
      startLoading();
      setTimeout(initParticles,10);
    }
  },{immediate:true});
});

onUnmounted(()=>{
  clearInterval(intervalId);
  clearTimeout(messageTimeoutId);
  if(animationFrameId) cancelAnimationFrame(animationFrameId);
});
</script>

<template>
  <transition name="loading-fade">
    <div v-if="show" class="loading-overlay">
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
        <p class="loading-info">MockupCreator Pro • Carregando sistema</p>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.loading-overlay {
  position: fixed;
  top:0; left:0;
  width:100vw; height:100vh;
  z-index:9999;
  display:flex;
  align-items:center;
  justify-content:center;
  overflow:hidden;
  background: linear-gradient(135deg, #89def7, #e2f5cc, #fcf195, #ffd696, #67cf53, #3bb2ef, #4dc0ea, #8addf6);
  background-size: 1600% 1600%;
  animation: gradientShift 25s ease infinite;
  color: #fff;
  pointer-events: auto;
}

.loading-fade-leave-to {
  pointer-events: none;
}

@keyframes gradientShift {
  0%{background-position:0% 50%;}
  50%{background-position:100% 50%;}
  100%{background-position:0% 50%;}
}

.loading-fade-enter-active, .loading-fade-leave-active {
  transition: opacity 0.5s cubic-bezier(0.4,0,0.2,1);
}
.loading-fade-enter-from, .loading-fade-leave-to { opacity:0; }

#particle-canvas {
  position:absolute;
  top:0; left:0;
  width:100%; height:100%;
  opacity:0.4;
  pointer-events:none; /* não bloqueia clique */
}

.loading-content {
  z-index:2;
  text-align:center;
  display:flex;
  flex-direction:column;
  align-items:center;
  pointer-events:auto;
}

.logo-container {
  position:relative;
  margin-bottom:40px;
}

.logo-container::before {
  content:'';
  position:absolute;
  top:50%; left:50%;
  width:120px; height:120px;
  background: radial-gradient(circle, #fff 0%, transparent 60%);
  opacity:0.3;
  border-radius:50%;
  transform:translate(-50%,-50%);
  animation: glow-pulse 3s infinite ease-in-out;
  pointer-events:none;
}

@keyframes glow-pulse {
  0%,100%{transform:translate(-50%,-50%) scale(1); opacity:0.3;}
  50%{transform:translate(-50%,-50%) scale(1.3); opacity:0.5;}
}

.loading-logo {
  position:relative;
  width:64px; height:64px;
  filter: drop-shadow(0 0 15px #fff);
}

.loading-message {
  font-size:1.1rem;
  margin-bottom:24px;
  min-height:25px;
  font-weight:400;
  color:#fff;
  letter-spacing:0.5px;
}

.message-fade-enter-active, .message-fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.message-fade-enter-from { opacity:0; transform:translateY(10px);}
.message-fade-leave-to { opacity:0; transform:translateY(-10px);}

.progress-bar-container {
  position:relative;
  width:320px; height:4px;
  background-color: rgba(255,255,255,0.2);
  border-radius:2px;
  overflow:hidden;
}

.progress-bar {
  height:100%;
  background:#fff;
  border-radius:2px;
  transition:width 0.15s linear;
  box-shadow:0 0 10px #fff,0 0 20px #fff;
}

.progress-bar::after {
  content:'';
  position:absolute;
  top:0; right:0; bottom:0; left:0;
  background: linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0) 100%);
  animation: shine 2s infinite linear;
  transform:translateX(-100%);
}

@keyframes shine { to{transform:translateX(100%);} }

.loading-info {
  font-size:0.8rem;
  color:#eee;
  margin-top:16px;
  letter-spacing:1px;
  text-transform:uppercase;
}
</style>
