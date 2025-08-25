<template>
  <canvas ref="canvasRef" class="brush-preview"></canvas>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';

const props = defineProps({
  size: { type: Number, required: true },
  hardness: { type: Number, required: true },
});

const canvasRef = ref(null);

const drawPreview = () => {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const width = canvas.width = 150;
  const height = canvas.height = 32;

  ctx.clearRect(0, 0, width, height);

  // Simula um traço de pincel
  const startX = 20;
  const endX = width - 20;
  const y = height / 2;

  // O tamanho no preview é logarítmico para melhor visualização
  const displaySize = Math.max(2, Math.log(props.size + 1) * 4);
  const blur = (1 - props.hardness) * (displaySize * 0.4);

  ctx.beginPath();
  ctx.moveTo(startX, y);
  ctx.lineTo(endX, y);

  ctx.lineWidth = displaySize;
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'black';

  if (blur > 0) {
    ctx.shadowColor = 'black';
    ctx.shadowBlur = blur;
  }

  ctx.stroke();
};

onMounted(drawPreview);
watch(props, drawPreview);
</script>

<style scoped>
.brush-preview {
  width: 100%;
  height: 32px;
  background-color: var(--c-surface-dark);
  border-radius: var(--radius-sm);
  cursor: pointer;
  border: 1px solid var(--c-border);
  transition: all 0.2s ease;
}
.brush-preview:hover {
  border-color: var(--c-primary);
  background-color: var(--c-white);
}
</style>
