<template>
  <div class="brush-preview-container">
    <canvas ref="canvasRef" width="80" height="40"></canvas>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';

const props = defineProps({
  size: { type: Number, default: 20 },
  hardness: { type: Number, default: 0.9 },
  sensitivity: { type: Number, default: 0.5 },
  taper: { type: Number, default: 80 },
});

const canvasRef = ref(null);

const drawPreview = () => {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;

  ctx.clearRect(0, 0, width, height);

  // Simula um traço com alguns pontos
  const points = [];
  for (let i = 10; i < width - 10; i += 2) {
    const y = height / 2 + Math.sin((i / width) * Math.PI * 2) * 2;
    points.push({ x: i, y });
  }

  if (points.length === 0) return;

  ctx.strokeStyle = 'black';
  ctx.fillStyle = 'black';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const baseSize = Math.min(props.size, height * 0.8);
  const totalStrokeLength = width - 20;

  for (let i = 1; i < points.length; i++) {
    const lastPoint = points[i-1];
    const currentPoint = points[i];
    const distanceTraveled = currentPoint.x - 10;

    // Lógica de afilamento (taper)
    const taperStartFraction = props.taper / 100;
    const taperEndFraction = 1.0 - taperStartFraction;
    let taper = 1.0;
    if (totalStrokeLength > 0) {
        const progress = distanceTraveled / totalStrokeLength;
        if (progress < taperStartFraction) {
            taper = progress / taperStartFraction;
        } else if (progress > taperEndFraction) {
            taper = (1.0 - progress) / taperStartFraction;
        }
    }
    taper = Math.pow(taper, 0.5); // Suaviza a curva do taper

    const lineWidth = Math.max(1.0, baseSize * taper);
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(lastPoint.x, lastPoint.y);
    ctx.lineTo(currentPoint.x, currentPoint.y);
    ctx.stroke();
  }
};

onMounted(drawPreview);
watch(props, drawPreview, { deep: true });
</script>

<style scoped>
.brush-preview-container {
  width: 80px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  background-color: var(--c-background);
}
canvas {
  max-width: 100%;
  max-height: 100%;
}
</style>
