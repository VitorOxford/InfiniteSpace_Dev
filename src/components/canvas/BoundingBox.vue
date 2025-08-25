<script setup>
import { computed } from 'vue'
import { useCanvasStore } from '@/stores/canvasStore'

const store = useCanvasStore()
const emit = defineEmits(['handleMouseDown'])

const isVisible = computed(() => store.selectedLayer && store.workspace.viewMode === 'edit')

const boxStyle = computed(() => {
  const layer = store.selectedLayer
  if (!isVisible.value || !layer) {
    return { display: 'none' }
  }

  const { workspace } = store
  const { zoom, pan } = workspace

  const displayWidth = layer.metadata.originalWidth * layer.scale * zoom
  const displayHeight = layer.metadata.originalHeight * layer.scale * zoom

  const screenCenterX = layer.x * zoom + pan.x
  const screenCenterY = layer.y * zoom + pan.y

  // CORREÇÃO: Adiciona escala para o flip
  const scaleX = layer.adjustments.flipH ? -1 : 1
  const scaleY = layer.adjustments.flipV ? -1 : 1

  return {
    transform: `
      translate(${screenCenterX}px, ${screenCenterY}px)
      translate(-50%, -50%)
      rotate(${layer.rotation}rad)
      scale(${scaleX}, ${scaleY})
    `,
    width: `${displayWidth}px`,
    height: `${displayHeight}px`,
  }
})

function handleMouseDown(e, handleType, cursor) {
  // Parar a propagação é crucial para não iniciar o pan do canvas ao mesmo tempo
  e.stopPropagation()
  emit('handleMouseDown', { event: e, type: handleType, cursor: cursor })
}
</script>

<template>
  <div v-if="isVisible" class="bounding-box-container">
    <div class="bounding-box" :style="boxStyle">
      <div
        class="handle resize-handle top-left"
        @mousedown="handleMouseDown($event, 'resize-tl', 'nwse-resize')"
        @touchstart.prevent="handleMouseDown($event, 'resize-tl', 'nwse-resize')"
      ></div>
      <div
        class="handle resize-handle top-right"
        @mousedown="handleMouseDown($event, 'resize-tr', 'nesw-resize')"
        @touchstart.prevent="handleMouseDown($event, 'resize-tr', 'nesw-resize')"
      ></div>
      <div
        class="handle resize-handle bottom-left"
        @mousedown="handleMouseDown($event, 'resize-bl', 'nesw-resize')"
        @touchstart.prevent="handleMouseDown($event, 'resize-bl', 'nesw-resize')"
      ></div>
      <div
        class="handle resize-handle bottom-right"
        @mousedown="handleMouseDown($event, 'resize-br', 'nwse-resize')"
        @touchstart.prevent="handleMouseDown($event, 'resize-br', 'nwse-resize')"
      ></div>

      <div
        class="handle rotate-handle top-left"
        @mousedown="handleMouseDown($event, 'rotate', 'grabbing')"
        @touchstart.prevent="handleMouseDown($event, 'rotate', 'grabbing')"
      >
        <svg width="14" height="14" viewBox="0 0 24 24"><path d="M21.5 2v6h-6m-13 14v-6h6"/></svg>
      </div>
      <div
        class="handle rotate-handle top-right"
        @mousedown="handleMouseDown($event, 'rotate', 'grabbing')"
        @touchstart.prevent="handleMouseDown($event, 'rotate', 'grabbing')"
      >
       <svg width="14" height="14" viewBox="0 0 24 24"><path d="M2.5 22v-6h6m13-14v6h-6"/></svg>
      </div>
      <div
        class="handle rotate-handle bottom-left"
        @mousedown="handleMouseDown($event, 'rotate', 'grabbing')"
        @touchstart.prevent="handleMouseDown($event, 'rotate', 'grabbing')"
      >
        <svg width="14" height="14" viewBox="0 0 24 24"><path d="M21.5 22v-6h-6m-13-14v6h6"/></svg>
      </div>
      <div
        class="handle rotate-handle bottom-right"
        @mousedown="handleMouseDown($event, 'rotate', 'grabbing')"
        @touchstart.prevent="handleMouseDown($event, 'rotate', 'grabbing')"
      >
        <svg width="14" height="14" viewBox="0 0 24 24"><path d="M2.5 2v6h6m13 14v-6h-6"/></svg>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bounding-box-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none; /* O container não captura eventos */
  z-index: 100;
}

.bounding-box {
  position: absolute;
  top: 0;
  left: 0;
  box-sizing: border-box;
  border: 1.5px solid var(--c-primary);
  transform-origin: center center;
  /* A caixa em si não captura eventos, apenas seus filhos (handles) */
  pointer-events: none;
}

.bounding-box:hover .rotate-handle {
  opacity: 1;
}

.handle {
  position: absolute;
  /* Os handles SÃO os pontos de interação */
  pointer-events: all;
  z-index: 101;
  /* Cria uma área de toque invisível maior que o elemento visual */
  padding: 10px;
  /* Centraliza o conteúdo visual dentro da área de toque */
  display: flex;
  align-items: center;
  justify-content: center;
}

.resize-handle {
  width: 12px;
  height: 12px;
  background-color: var(--c-white);
  border: 1.5px solid var(--c-primary);
  border-radius: var(--radius-full);
  /* A área de toque é o `handle`, este é apenas o visual */
  box-sizing: content-box;
}

.resize-handle.top-left { top: 0; left: 0; transform: translate(-50%, -50%); cursor: nwse-resize; }
.resize-handle.top-right { top: 0; left: 100%; transform: translate(-50%, -50%); cursor: nesw-resize; }
.resize-handle.bottom-left { top: 100%; left: 0; transform: translate(-50%, -50%); cursor: nesw-resize; }
.resize-handle.bottom-right { top: 100%; left: 100%; transform: translate(-50%, -50%); cursor: nwse-resize; }

.rotate-handle {
  width: 24px;
  height: 24px;
  color: var(--c-primary);
  cursor: grabbing;
  opacity: 0;
  transition: opacity 0.2s ease;
  box-sizing: content-box;
}
.rotate-handle svg {
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
}

.rotate-handle.top-left { top: -28px; left: -28px; transform: translate(-50%, -50%); }
.rotate-handle.top-right { top: -28px; left: 100%; transform: translate(-50%, -50%); }
.rotate-handle.bottom-left { top: 100%; left: -28px; transform: translate(-50%, -50%); }
.rotate-handle.bottom-right { top: 100%; left: 100%; transform: translate(-50%, -50%); }
</style>
