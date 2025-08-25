<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { hsvToHex } from '@/utils/color.js'

const emit = defineEmits(['update:color'])

const pickerRef = ref(null)
const hue = ref(0)
const saturation = ref(1)
const value = ref(1)
const isDraggingHue = ref(false)
const isDraggingSV = ref(false)

const hexColor = computed(() => hsvToHex(hue.value, saturation.value, value.value))

const svPanelStyle = computed(() => ({
  backgroundColor: `hsl(${hue.value * 360}, 100%, 50%)`,
}))

const svCursorStyle = computed(() => ({
  left: `${saturation.value * 100}%`,
  bottom: `${value.value * 100}%`,
  backgroundColor: hexColor.value,
}))

const hueCursorStyle = computed(() => ({
  top: `${(hue.value) * 100}%`,
}))

function handleMouseDownHue(e) {
  isDraggingHue.value = true
  updateHue(e)
}

function handleMouseDownSV(e) {
  isDraggingSV.value = true
  updateSV(e)
}

function handleMouseMove(e) {
  if (isDraggingHue.value) updateHue(e)
  if (isDraggingSV.value) updateSV(e)
}

function stopDragging() {
  isDraggingHue.value = false
  isDraggingSV.value = false
}

function updateHue(e) {
  const rect = e.currentTarget.getBoundingClientRect()
  const y = e.clientY - rect.top
  hue.value = Math.max(0, Math.min(1, y / rect.height))
  emitColor()
}

function updateSV(e) {
  const rect = e.currentTarget.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  saturation.value = Math.max(0, Math.min(1, x / rect.width))
  value.value = Math.max(0, Math.min(1, 1 - y / rect.height))
  emitColor()
}

function emitColor() {
  emit('update:color', {
    hex: hexColor.value,
    hsv: { h: hue.value, s: saturation.value, v: value.value },
  })
}

onMounted(() => {
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', stopDragging)
});

onUnmounted(() => {
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', stopDragging)
});
</script>

<template>
  <div class="color-picker" ref="pickerRef">
    <div class="sv-panel" :style="svPanelStyle" @mousedown.prevent="handleMouseDownSV">
      <div class="sv-cursor" :style="svCursorStyle"></div>
    </div>
    <div class="hue-slider" @mousedown.prevent="handleMouseDownHue">
      <div class="hue-cursor" :style="hueCursorStyle"></div>
    </div>
  </div>
</template>

<style scoped>
.color-picker {
  display: flex;
  gap: var(--spacing-3);
  height: 150px;
}
.sv-panel {
  flex-grow: 1;
  position: relative;
  background-image: linear-gradient(to top, #000, rgba(0, 0, 0, 0)),
                    linear-gradient(to right, #fff, rgba(255, 255, 255, 0));
  cursor: crosshair;
  border-radius: var(--radius-sm);
}
.sv-cursor {
  position: absolute;
  width: 12px;
  height: 12px;
  border: 2px solid white;
  border-radius: 50%;
  transform: translate(-50%, 50%);
  pointer-events: none;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.5);
}
.hue-slider {
  width: 20px;
  position: relative;
  background: linear-gradient(to bottom, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00);
  cursor: pointer;
  border-radius: var(--radius-sm);
}
.hue-cursor {
  position: absolute;
  left: 0;
  width: 100%;
  height: 4px;
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.5);
  transform: translateY(-50%);
  pointer-events: none;
}
</style>
