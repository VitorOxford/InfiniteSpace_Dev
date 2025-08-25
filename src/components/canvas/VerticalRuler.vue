<script setup>
import { ref, onMounted, watch } from 'vue'
import { useCanvasStore } from '@/stores/canvasStore'

const props = defineProps({ height: Number })
const store = useCanvasStore()
const rulerRef = ref(null)
let ctx = null

const renderRuler = () => {
  if (!ctx || !props.height) return
  const canvas = rulerRef.value
  const width = 30
  const { height } = props
  canvas.width = width
  canvas.height = height

  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--c-surface').trim()
  ctx.fillRect(0, 0, width, height)
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--c-border').trim()
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(width - 0.5, 0)
  ctx.lineTo(width - 0.5, height)
  ctx.stroke()

  ctx.save()
  ctx.font = '10px sans-serif'
  ctx.fillStyle = getComputedStyle(document.documentElement)
    .getPropertyValue('--c-text-secondary')
    .trim()

  const { zoom, pan } = store.workspace
  const { unit } = store.workspace.rulers
  const source = store.rulerSource

  const originY = pan.y + source.y * zoom

  let majorTickInterval, unitConverter, label, totalUnits
  const dpi = source.dpi

  if (unit === 'cm') {
    unitConverter = dpi / 2.54
    label = (val) => `${val}`
    majorTickInterval = zoom * unitConverter > 40 ? 1 : zoom * unitConverter > 20 ? 5 : 10
    totalUnits = source.height / unitConverter
  } else if (unit === 'in') {
    unitConverter = dpi
    label = (val) => `${val}`
    majorTickInterval = zoom * unitConverter > 50 ? 1 : zoom * unitConverter > 25 ? 2 : 5
    totalUnits = source.height / unitConverter
  } else {
    // 'px'
    unitConverter = 1
    label = (val) => `${val}`
    majorTickInterval = zoom > 0.5 ? 50 : zoom > 0.2 ? 100 : 500
    totalUnits = source.height
  }

  const tickSpacing = majorTickInterval * zoom * unitConverter
  if (tickSpacing <= 0) {
    ctx.restore()
    return
  }

  for (let i = 0; i * majorTickInterval <= totalUnits + majorTickInterval; i++) {
    const value = i * majorTickInterval
    const y = originY + value * unitConverter * zoom

    if (y < 0 || y > height) continue

    ctx.fillText(label(value), 5, y + 10)
    ctx.beginPath()
    ctx.moveTo(width, y)
    ctx.lineTo(width - 15, y)
    ctx.stroke()
  }

  ctx.restore()
}

onMounted(() => {
  ctx = rulerRef.value.getContext('2d')
  renderRuler()
})
watch(
  () => [store.workspace, props.height, store.rulerSource, store.selectedLayerId],
  renderRuler,
  { deep: true },
)
</script>

<template>
  <canvas ref="rulerRef"></canvas>
</template>
