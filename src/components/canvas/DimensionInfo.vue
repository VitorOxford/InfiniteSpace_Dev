<script setup>
import { computed, ref, watch, onMounted } from 'vue'
import { useCanvasStore } from '@/stores/canvasStore'

const store = useCanvasStore()
const rulerCanvasRef = ref(null)

const mockupLayer = computed(() => {
  return store.layers.find((l) => l.type === 'mockup' && l.visible && l.image)
})

// --- CORREÇÃO ---
// A altura real agora considera a escala aplicada no editor.
const realHeightCm = computed(() => {
  if (!mockupLayer.value?.metadata?.dpi || !mockupLayer.value?.metadata?.originalHeight) {
    return 0
  }
  const layer = mockupLayer.value
  // Multiplica a altura original pela escala para obter o tamanho final
  const finalHeightPx = layer.metadata.originalHeight * layer.scale
  const heightInInches = finalHeightPx / layer.metadata.dpi
  return heightInInches * 2.54
})

const renderRuler = () => {
  const canvas = rulerCanvasRef.value
  if (!canvas || !mockupLayer.value) return

  const ctx = canvas.getContext('2d')
  const height = canvas.height
  const width = canvas.width

  ctx.clearRect(0, 0, width, height)

  ctx.save()
  ctx.font = '10px sans-serif'
  ctx.fillStyle = getComputedStyle(document.documentElement)
    .getPropertyValue('--c-text-secondary')
    .trim()
  ctx.strokeStyle = getComputedStyle(document.documentElement)
    .getPropertyValue('--c-text-tertiary')
    .trim()

  const totalCm = realHeightCm.value
  if (totalCm === 0) return

  // Desenha a linha principal
  ctx.beginPath()
  ctx.moveTo(width - 15, 0)
  ctx.lineTo(width - 15, height)
  ctx.stroke()

  // Desenha os ticks e números
  const numTicks = 10
  const cmInterval = totalCm / numTicks

  for (let i = 0; i <= numTicks; i++) {
    const cm = i * cmInterval
    const y = (cm / totalCm) * (height - 20) + 10 // Adiciona um padding

    ctx.beginPath()
    ctx.moveTo(width - 15, y)
    ctx.lineTo(width - 5, y)
    ctx.stroke()

    ctx.fillText(Math.round(cm), 5, y + 4)
  }

  // Desenha o valor total no fundo
  ctx.fillText(`${totalCm.toFixed(1)} cm`, 5, height - 5)
  ctx.restore()
}

onMounted(renderRuler)
// Observa a escala da camada de mockup também
watch([mockupLayer, realHeightCm, () => mockupLayer.value?.scale], renderRuler, { deep: true })
</script>

<template>
  <div v-if="mockupLayer" class="dimension-info-wrapper">
    <canvas ref="rulerCanvasRef" :width="40" :height="500"></canvas>
  </div>
</template>

<style scoped>
.dimension-info-wrapper {
  position: absolute;
  left: -55px;
  top: 50%;
  height: 90%;
  transform: translateY(-50%);
  width: 40px;
}
canvas {
  width: 100%;
  height: 100%;
}
</style>
