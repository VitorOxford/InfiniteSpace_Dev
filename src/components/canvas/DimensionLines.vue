<script setup>
import { computed } from 'vue'
import { useCanvasStore } from '@/stores/canvasStore'

const store = useCanvasStore()

// A fonte da verdade para as dimensões é a camada de mockup
const mockupLayer = computed(() => store.mockupLayer)

// CORREÇÃO: Calcula as dimensões finais em cm, considerando a escala
const finalDimensionsCm = computed(() => {
  if (!mockupLayer.value) return { width: 0, height: 0 }

  const { metadata, scale } = mockupLayer.value
  if (!metadata.dpi) return { width: 0, height: 0 }

  const finalWidthPx = metadata.originalWidth * scale
  const finalHeightPx = metadata.originalHeight * scale
  const pxToCm = 2.54 / metadata.dpi

  return {
    width: (finalWidthPx * pxToCm).toFixed(1),
    height: (finalHeightPx * pxToCm).toFixed(1),
  }
})
</script>

<template>
  <div class="dimension-lines-container" v-if="mockupLayer">
    <div class="dim-line vertical">
      <div class="line"></div>
      <div class="text">{{ finalDimensionsCm.height }} cm</div>
      <div class="line"></div>
    </div>
    <div class="dim-line horizontal">
      <div class="line"></div>
      <div class="text">{{ finalDimensionsCm.width }} cm</div>
      <div class="line"></div>
    </div>
  </div>
</template>

<style scoped>
.dimension-lines-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 150;
}

.dim-line {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--c-text-secondary);
  font-family: monospace;
  font-size: 12px;
}

/* Estilo para a linha vertical (altura) */
.vertical {
  flex-direction: column;
  height: 100%;
  width: 40px;
  left: -50px; /* Posiciona à esquerda do artboard */
  top: 0;
}

/* Estilo para a linha horizontal (largura) */
.horizontal {
  flex-direction: row;
  width: 100%;
  height: 40px;
  bottom: -50px; /* Posiciona abaixo do artboard */
  left: 0;
}

.dim-line .line {
  background-color: var(--c-border);
}

.vertical .line {
  width: 10px;
  flex-grow: 1;
}
.vertical .line:first-child {
  border-top-left-radius: 2px;
  border-top-right-radius: 2px;
  border-top: 1px solid var(--c-border);
}
.vertical .line:last-child {
  border-bottom-left-radius: 2px;
  border-bottom-right-radius: 2px;
  border-bottom: 1px solid var(--c-border);
}

.horizontal .line {
  height: 10px;
  flex-grow: 1;
}
.horizontal .line:first-child {
  border-top-left-radius: 2px;
  border-bottom-left-radius: 2px;
  border-left: 1px solid var(--c-border);
}
.horizontal .line:last-child {
  border-top-right-radius: 2px;
  border-bottom-right-radius: 2px;
  border-right: 1px solid var(--c-border);
}

.dim-line .text {
  background-color: var(--c-surface);
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid var(--c-border);
  flex-shrink: 0;
  margin: 8px 0;
}

.horizontal .text {
  margin: 0 8px;
}
</style>
