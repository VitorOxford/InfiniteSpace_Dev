<script setup>
import { computed } from 'vue'
import { useCanvasStore } from '@/stores/canvasStore'
import Joystick from './Joystick.vue'

const props = defineProps({
  position: Object,
})

const store = useCanvasStore()

const rotationInDegrees = computed({
  get: () => (store.selectedLayer ? (store.selectedLayer.rotation * 180) / Math.PI : 0),
  set: (val) => {
    if (store.selectedLayer) {
      store.updateLayerProperties(store.selectedLayer.id, { rotation: (val * Math.PI) / 180 })
    }
  },
})

const scaleInPercent = computed({
  get: () => (store.selectedLayer ? store.selectedLayer.scale * 100 : 100),
  set: (val) => {
    if (store.selectedLayer) {
      store.updateLayerProperties(store.selectedLayer.id, { scale: val / 100 })
    }
  },
})

const previewZoomLevel = computed({
  get: () => store.workspace.previewZoom * 100,
  set: (val) => {
    store.setPreviewZoom(val / 100)
  },
})

function handleJoystickMove(event) {
  if (!store.selectedLayer) return
  store.updateLayerProperties(store.selectedLayer.id, {
    x: store.selectedLayer.x + event.dx * 5,
    y: store.selectedLayer.y + event.dy * 5,
  })
}

const panelStyle = computed(() => ({
  top: `${props.position.top}px`,
  left: `${props.position.left}px`,
}))

const isPreviewMode = computed(() => store.workspace.viewMode === 'preview');
</script>

<template>
  <div class="tool-controls-panel" v-if="props.position.visible" :style="panelStyle">
    <div v-if="store.activeTool === 'move' && store.selectedLayer && isPreviewMode" class="control-group">
      <label>Mover Estampa</label>
      <Joystick @move="handleJoystickMove" />
    </div>

    <div v-if="store.activeTool === 'zoom' && store.selectedLayer && isPreviewMode" class="control-group">
      <label>Zoom Estampa ({{ scaleInPercent.toFixed(0) }}%)</label>
      <input type="range" min="1" max="800" step="1" v-model="scaleInPercent" class="slider" />
    </div>

    <div v-if="store.activeTool === 'rotate' && store.selectedLayer && isPreviewMode" class="control-group">
      <label>Girar ({{ rotationInDegrees.toFixed(0) }}°)</label>
      <input type="range" min="0" max="360" step="1" v-model="rotationInDegrees" class="slider" />
    </div>

    <div v-if="store.activeTool === 'zoom-preview'" class="control-group">
      <label>Zoom do Preview ({{ previewZoomLevel.toFixed(0) }}%)</label>
      <input type="range" min="20" max="500" step="1" v-model="previewZoomLevel" class="slider" />
    </div>
  </div>
</template>

<style scoped>
.tool-controls-panel {
  position: absolute;
  background-color: rgba(255, 255, 255, 0.8);
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  padding: var(--spacing-4);
  display: flex;
  gap: var(--spacing-5);
  z-index: 200;
  transition: opacity 0.15s ease-in-out;
}
.control-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-3);
}
.control-group label {
  font-weight: var(--fw-semibold);
  font-size: var(--fs-sm);
  color: var(--c-text-primary);
}
.slider {
  width: 150px;
  accent-color: var(--c-primary);
}
</style>
