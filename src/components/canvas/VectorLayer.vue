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

const containerStyle = computed(() => {
  const { pan, zoom } = store.workspace;
  const { x, y, scale, rotation, metadata } = props.layer;

  const width = (metadata.originalWidth || 0) * scale * zoom;
  const height = (metadata.originalHeight || 0) * scale * zoom;

  const translateX = x * zoom + pan.x - width / 2;
  const translateY = y * zoom + pan.y - height / 2;

  return {
    position: 'absolute',
    top: `${translateY}px`,
    left: `${translateX}px`,
    width: `${width}px`,
    height: `${height}px`,
    transform: `rotate(${rotation}rad)`,
    pointerEvents: 'none',
    opacity: props.layer.opacity,
  };
});
</script>

<template>
  <div :style="containerStyle" class="vector-layer-container">
    <svg
      width="100%"
      height="100%"
      :viewBox="`0 0 ${layer.metadata.originalWidth || 0} ${layer.metadata.originalHeight || 0}`"
      preserveAspectRatio="xMidYMid meet"
    >
      <path
        :d="layer.pathData"
        class="vector-path"
      />
    </svg>
  </div>
</template>

<style scoped>
.vector-layer-container {
  /* Estilos para o container, se necessário */
}

.vector-path {
  /* --- A MÁGICA ACONTECE AQUI --- */

  /* 1. Removemos o preenchimento. O vetor não será mais um borrão sólido. */
  fill: none;

  /* 2. Definimos a cor do contorno para ser a cor primária selecionada. */
  stroke: v-bind('store.primaryColor');

  /* 3. Definimos uma espessura para o contorno ser visível. */
  stroke-width: 2;

  /* 4. Isso garante que a espessura do contorno não aumente com o zoom. */
  vector-effect: non-scaling-stroke;
}
</style>
