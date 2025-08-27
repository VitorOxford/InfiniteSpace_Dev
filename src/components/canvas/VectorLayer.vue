<script setup>
import { computed } from 'vue';
import { useCanvasStore } from '@/stores/canvasStore';

const props = defineProps({
  layer: {
    type: Object,
    required: true,
  },
});

const store = useCanvasStore();

const svgStyle = computed(() => {
  const { pan, zoom } = store.workspace;
  const { x, y, scale, rotation, metadata } = props.layer;

  // Centraliza o SVG na mesma posição da camada original
  const translateX = x * zoom + pan.x - (metadata.originalWidth * scale * zoom) / 2;
  const translateY = y * zoom + pan.y - (metadata.originalHeight * scale * zoom) / 2;

  return {
    position: 'absolute',
    top: `${translateY}px`,
    left: `${translateX}px`,
    width: `${metadata.originalWidth * scale * zoom}px`,
    height: `${metadata.originalHeight * scale * zoom}px`,
    transform: `rotate(${rotation}rad)`,
    pointerEvents: 'none', // O contêiner não deve capturar eventos
  };
});
</script>

<template>
  <div :style="svgStyle">
    <svg width="100%" height="100%" :viewBox="`0 0 ${layer.metadata.originalWidth} ${layer.metadata.originalHeight}`">
      <path
        :d="layer.pathData"
        fill="none"
        stroke="var(--c-primary)"
        stroke-width="2"
        vector-effect="non-scaling-stroke"
      />
    </svg>
  </div>
</template>

<style scoped>
/* Estilos para os pontos de manipulação podem ser adicionados aqui no futuro */
</style>
