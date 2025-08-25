<script setup>
import { computed } from 'vue'
import { useCanvasStore } from '@/stores/canvasStore'

const store = useCanvasStore()

const isVisible = computed(() => {
  return (store.workspace.selection.active || store.workspace.lasso.active)
})

const selectionStyle = computed(() => {
  const sel = store.workspace.selection
  const { pan, zoom } = store.workspace

  const x = Math.min(sel.startX, sel.endX) * zoom + pan.x
  const y = Math.min(sel.startY, sel.endY) * zoom + pan.y
  const width = sel.width * zoom
  const height = sel.height * zoom

  return {
    transform: `translate(${x}px, ${y}px)`,
    width: `${width}px`,
    height: `${height}px`,
  }
})

// CORREÇÃO: Lógica para exibir o tooltip
const isTooltipVisible = computed(() => {
    return store.workspace.lasso.active || store.workspace.selection.active;
});

const tooltipStyle = computed(() => {
  const { pan, zoom } = store.workspace

  if (store.activeTool === 'rect-select' && store.workspace.selection.active) {
    const sel = store.workspace.selection
    const y = Math.max(sel.startY, sel.endY) * zoom + pan.y + 8
    const x = Math.min(sel.startX, sel.endX) * zoom + pan.x
    return { top: `${y}px`, left: `${x}px` }
  }

  if (store.activeTool === 'lasso-select' && store.workspace.lasso.active) {
    const bbox = store.workspace.lasso.boundingBox
    if (!bbox) return { display: 'none' }
    const y = (bbox.y + bbox.height) * zoom + pan.y + 8
    const x = bbox.x * zoom + pan.x
    return { top: `${y}px`, left: `${x}px` }
  }

  return { display: 'none' }
})
</script>

<template>
  <div v-if="isVisible" class="selection-overlay">
    <div
      v-if="store.activeTool === 'rect-select'"
      class="selection-rect"
      :style="selectionStyle"
    ></div>

    <div v-if="isTooltipVisible" class="dimensions-tooltip" :style="tooltipStyle">
      <div class="dim-row">
        <span>W:</span>
        <span>{{ store.workspace.selection.dimPxW.toFixed(0) }} px</span>
        <span class="dim-cm">{{ store.workspace.selection.dimCmW.toFixed(2) }} cm</span>
      </div>
      <div class="dim-row">
        <span>H:</span>
        <span>{{ store.workspace.selection.dimPxH.toFixed(0) }} px</span>
        <span class="dim-cm">{{ store.workspace.selection.dimCmH.toFixed(2) }} cm</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.selection-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 50;
}

.selection-rect {
  position: absolute;
  top: 0;
  left: 0;
  border: 1px solid var(--c-primary);
  background-color: rgba(13, 153, 255, 0.1);
}

.dimensions-tooltip {
  position: absolute;
  background-color: var(--c-text-primary);
  color: var(--c-white);
  padding: var(--spacing-2);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  font-size: var(--fs-xs);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
  font-family: monospace;
  white-space: nowrap;
}
.dim-row {
  display: grid;
  grid-template-columns: 20px 70px 1fr;
  gap: var(--spacing-2);
  align-items: center;
}
.dim-row span:first-child {
  font-weight: var(--fw-bold);
  color: var(--c-primary);
}
.dim-row span:nth-child(2) {
  text-align: right;
  color: var(--c-text-secondary);
}
.dim-cm {
  font-weight: var(--fw-semibold);
}
</style>
