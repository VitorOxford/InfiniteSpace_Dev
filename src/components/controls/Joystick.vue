<script setup>
import { ref } from 'vue'

const emit = defineEmits(['move'])

const joystick = ref(null)
const handle = ref(null)
const isDragging = ref(false)

const startDrag = (e) => {
  e.preventDefault();
  isDragging.value = true
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('touchmove', onDrag, { passive: false })

  document.addEventListener('mouseup', endDrag)
  document.addEventListener('touchend', endDrag)
  document.addEventListener('mouseleave', endDrag)
}

const onDrag = (e) => {
  if (!isDragging.value) return
  e.preventDefault();

  const event = e.touches ? e.touches[0] : e;
  const baseRect = joystick.value.getBoundingClientRect()
  const maxDist = baseRect.width / 2

  let dx = event.clientX - (baseRect.left + maxDist)
  let dy = event.clientY - (baseRect.top + maxDist)

  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist > maxDist) {
    dx = (dx / dist) * maxDist
    dy = (dy / dist) * maxDist
  }

  handle.value.style.transform = `translate(${dx}px, ${dy}px)`

  emit('move', { dx: dx / maxDist, dy: dy / maxDist })
}

const endDrag = (e) => {
  if (!isDragging.value) return
  isDragging.value = false
  handle.value.style.transform = `translate(0, 0)`
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('touchmove', onDrag)
  document.removeEventListener('mouseup', endDrag)
  document.removeEventListener('touchend', endDrag)
  document.removeEventListener('mouseleave', endDrag)
}
</script>

<template>
  <div class="joystick-base" ref="joystick">
    <div class="joystick-handle" ref="handle" @mousedown.prevent="startDrag" @touchstart.prevent="startDrag"></div>
  </div>
</template>

<style scoped>
.joystick-base {
  width: 80px;
  height: 80px;
  background-color: var(--c-surface-dark);
  border-radius: var(--radius-full);
  border: 1px solid var(--c-border);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}
.joystick-handle {
  width: 40px;
  height: 40px;
  background-color: var(--c-primary);
  border-radius: var(--radius-full);
  box-shadow: var(--shadow-md);
  cursor: grab;
  transition: transform 0.1s ease-out;
}
.joystick-handle:active {
  cursor: grabbing;
}
</style>
