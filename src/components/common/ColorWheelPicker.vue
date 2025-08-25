<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue';
import { useCanvasStore } from '@/stores/canvasStore';

const store = useCanvasStore();
const emit = defineEmits(['close']);

// HSL é mais intuitivo para este tipo de picker
const color = reactive({ h: 0, s: 100, l: 50 });

const wheelRef = ref(null);
const squareRef = ref(null);
const isDraggingHue = ref(false);
const isDraggingSL = ref(false);

// Converte HSL para o formato de cor do CSS
const hueColor = computed(() => `hsl(${color.h}, 100%, 50%)`);
const finalColorHex = computed(() => {
  const { h, s, l } = color;
  const sNorm = s / 100;
  const lNorm = l / 100;
  let c = (1 - Math.abs(2 * lNorm - 1)) * sNorm,
      x = c * (1 - Math.abs(((h / 60) % 2) - 1)),
      m = lNorm - c / 2,
      r = 0, g = 0, b = 0;
  if (0 <= h && h < 60) { [r, g, b] = [c, x, 0]; }
  else if (60 <= h && h < 120) { [r, g, b] = [x, c, 0]; }
  else if (120 <= h && h < 180) { [r, g, b] = [0, c, x]; }
  else if (180 <= h && h < 240) { [r, g, b] = [0, x, c]; }
  else if (240 <= h && h < 300) { [r, g, b] = [x, 0, c]; }
  else if (300 <= h && h < 360) { [r, g, b] = [c, 0, x]; }
  r = Math.round((r + m) * 255).toString(16).padStart(2, '0');
  g = Math.round((g + m) * 255).toString(16).padStart(2, '0');
  b = Math.round((b + m) * 255).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
});


// Estilos para os cursores
const hueCursorStyle = computed(() => ({ transform: `rotate(${color.h}deg) translate(88px)` }));
const slCursorStyle = computed(() => ({
  left: `${color.s}%`,
  bottom: `${color.l}%`,
  backgroundColor: `hsl(${color.h}, ${color.s}%, ${color.l}%)`
}));

// Funções de manipulação do mouse
function handleMouseDownHue(e) { isDraggingHue.value = true; updateHue(e); }
function handleMouseDownSL(e) { isDraggingSL.value = true; updateSL(e); }

function handleMouseMove(e) {
  if (isDraggingHue.value) updateHue(e);
  if (isDraggingSL.value) updateSL(e);
}
function stopDragging() {
  isDraggingHue.value = false;
  isDraggingSL.value = false;
}

function updateHue(e) {
  const rect = wheelRef.value.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
  color.h = (angle + 360) % 360;
}

function updateSL(e) {
  const rect = squareRef.value.getBoundingClientRect();
  const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
  const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
  color.s = (x / rect.width) * 100;
  color.l = 100 - (y / rect.height) * 100;
}

// Atualiza a cor na store sempre que ela mudar
watch(finalColorHex, (newHex) => {
  store.setPrimaryColor(newHex);
});

onMounted(() => {
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', stopDragging);
});
onUnmounted(() => {
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('mouseup', stopDragging);
});
</script>

<template>
  <div class="color-picker-overlay" @click.self="emit('close')">
    <div class="color-picker-modal">
      <div class="picker-main">
        <div class="color-wheel" ref="wheelRef" @mousedown.prevent="handleMouseDownHue">
          <div class="hue-cursor" :style="hueCursorStyle"></div>
          <div class="sl-square" ref="squareRef" :style="{ backgroundColor: hueColor }" @mousedown.prevent="handleMouseDownSL">
            <div class="sl-cursor" :style="slCursorStyle"></div>
          </div>
        </div>
      </div>
      <div class="picker-controls">
        <div class="control-group">
          <label>H</label>
          <input type="range" min="0" max="360" v-model.number="color.h" class="slider" />
          <span>{{ color.h.toFixed(0) }}°</span>
        </div>
        <div class="control-group">
          <label>S</label>
          <input type="range" min="0" max="100" v-model.number="color.s" class="slider" />
          <span>{{ color.s.toFixed(0) }}%</span>
        </div>
        <div class="control-group">
          <label>L</label>
          <input type="range" min="0" max="100" v-model.number="color.l" class="slider" />
          <span>{{ color.l.toFixed(0) }}%</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.color-picker-overlay {
  position: fixed;
  top: 0; left: 0;
  width: 100vw; height: 100vh;
  z-index: 1000;
}
.color-picker-modal {
  position: absolute;
  top: 620px;
  left: calc(var(--sidebar-width) + 12px + 35px + 12px);
  width: 250px;
  background-color: #3a3a3a;
  color: #fff;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  padding: var(--spacing-4);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}
.picker-main {
  display: flex;
  justify-content: center;
  align-items: center;
}
.color-wheel {
  width: 200px;
  height: 200px;
  border-radius: 50%;
  position: relative;
  background: conic-gradient(from 90deg, hsl(0, 100%, 50%), hsl(60, 100%, 50%), hsl(120, 100%, 50%), hsl(180, 100%, 50%), hsl(240, 100%, 50%), hsl(300, 100%, 50%), hsl(0, 100%, 50%));
  cursor: crosshair;
}
.hue-cursor {
  position: absolute;
  top: 50%; left: 50%;
  width: 16px; height: 16px;
  border: 2px solid white;
  border-radius: 50%;
  transform-origin: -88px 0;
  pointer-events: none;
  box-shadow: 0 0 2px rgba(0,0,0,0.5);
}
.sl-square {
  position: absolute;
  top: 50%; left: 50%;
  width: 140px; height: 140px;
  transform: translate(-50%, -50%) rotate(-45deg);
  background-image:
    linear-gradient(to top, hsla(0, 0%, 0%, 1), transparent),
    linear-gradient(to right, hsla(0, 0%, 100%, 1), transparent);
  cursor: crosshair;
}
.sl-cursor {
  position: absolute;
  width: 12px; height: 12px;
  border: 2px solid white;
  border-radius: 50%;
  transform: translate(-50%, 50%);
  pointer-events: none;
  box-shadow: 0 0 2px rgba(0,0,0,0.5);
}
.picker-controls {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}
.control-group {
  display: grid;
  grid-template-columns: 20px 1fr 40px;
  align-items: center;
  gap: var(--spacing-2);
  font-size: var(--fs-sm);
}
.slider {
  width: 100%;
}
</style>
