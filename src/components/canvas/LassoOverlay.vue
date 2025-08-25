<script setup>
import { computed } from 'vue'
import { useCanvasStore } from '@/stores/canvasStore'

const store = useCanvasStore()

const isVisible = computed(() => {
  return store.workspace.lasso.points.length > 0 && store.workspace.viewMode === 'edit'
})

// MODIFICADO: Converte os pontos do "mundo" para a tela antes de renderizar
const pointsString = computed(() => {
  if (!store.workspace.lasso.points.length) return ''

  const { pan, zoom } = store.workspace

  return store.workspace.lasso.points
    .map((p) => `${p.x * zoom + pan.x},${p.y * zoom + pan.y}`)
    .join(' ')
})
</script>

<template>
  <div v-if="isVisible" class="lasso-overlay-container">
    <svg width="100%" height="100%">
      <polygon :points="pointsString" class="lasso-path" />
      <polygon :points="pointsString" class="lasso-path marching-ants" />
    </svg>
  </div>
</template>

<style scoped>
.lasso-overlay-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 200;
}
.lasso-path {
  fill: rgba(13, 153, 255, 0.2);
  stroke-width: 1.5;
  stroke-linejoin: round;
  stroke-linecap: round;
}

/* MODIFICADO: Estilos para o contorno animado */
.lasso-path {
    stroke: var(--c-primary);
    stroke-dasharray: 4 4;
}

.lasso-path.marching-ants {
    stroke: white;
    animation: march 0.5s linear infinite;
}

@keyframes march {
  to {
    stroke-dashoffset: -8;
  }
}
</style>
