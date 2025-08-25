<script setup>
import { ref, onMounted, watch } from 'vue'
import { useCanvasStore } from '@/stores/canvasStore'

const props = defineProps({ width: Number })
const store = useCanvasStore()
const rulerRef = ref(null)
let ctx = null

const renderRuler = () => {
  if (!ctx || !props.width) return
  const canvas = rulerRef.value
  const { width } = props
  const height = 30
  canvas.width = width
  canvas.height = height

  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--c-surface').trim()
  ctx.fillRect(0, 0, width, height)
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--c-border').trim()
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, height - 0.5)
  ctx.lineTo(width, height - 0.5)
  ctx.stroke()

  ctx.save()
  ctx.font = '10px sans-serif'
  ctx.fillStyle = getComputedStyle(document.documentElement)
    .getPropertyValue('--c-text-secondary')
    .trim()

  const { zoom, pan } = store.workspace
  const { unit } = store.workspace.rulers
  const source = store.rulerSource

  // O ponto 0 da régua agora é o canto da camada de referência, transladado pelo pan
  const originX = pan.x + source.x * zoom

  let majorTickInterval, unitConverter, label, totalUnits
  const dpi = source.dpi

  if (unit === 'cm') {
    unitConverter = dpi / 2.54 // pixels por cm
    label = (val) => `${val}`
    majorTickInterval = zoom * unitConverter > 40 ? 1 : zoom * unitConverter > 20 ? 5 : 10
    totalUnits = source.width / unitConverter
  } else if (unit === 'in') {
    unitConverter = dpi // pixels por polegada
    label = (val) => `${val}`
    majorTickInterval = zoom * unitConverter > 50 ? 1 : zoom * unitConverter > 25 ? 2 : 5
    totalUnits = source.width / unitConverter
  } else {
    // 'px'
    unitConverter = 1
    label = (val) => `${val}`
    majorTickInterval = zoom > 0.5 ? 50 : zoom > 0.2 ? 100 : 500
    totalUnits = source.width
  }

  const tickSpacing = majorTickInterval * zoom * unitConverter
  if (tickSpacing <= 0) {
    ctx.restore()
    return
  }

  // Encontra o primeiro valor a ser desenhado que está visível
  const firstVisibleValue = -Math.floor(originX / tickSpacing) * majorTickInterval

  for (let i = 0; i * majorTickInterval <= totalUnits + majorTickInterval; i++) {
    const value = i * majorTickInterval
    const x = originX + value * unitConverter * zoom

    if (x < 0 || x > width) continue // Não desenha fora da área visível da régua

    ctx.fillText(label(value), x + 3, 12)
    ctx.beginPath()
    ctx.moveTo(x, height)
    ctx.lineTo(x, height - 15)
    ctx.stroke()
  }

  ctx.restore()
}

onMounted(() => {
  ctx = rulerRef.value.getContext('2d')
  renderRuler()
})

// Observa tudo que pode afetar a régua
watch(() => [store.workspace, props.width, store.rulerSource, store.selectedLayerId], renderRuler, {
  deep: true,
})
</script>

<template>
  <canvas ref="rulerRef"></canvas>
</template>
