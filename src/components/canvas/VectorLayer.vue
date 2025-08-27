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
  // ... (código do containerStyle permanece o mesmo)
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
        :style="{ strokeWidth: layer.strokeWidth || 2 }"
      />
    </svg>
  </div>
</template>

<style scoped>
.vector-path {
  fill: none;
  stroke: v-bind('store.primaryColor');
  /* stroke-width é agora um estilo inline, mas mantemos um fallback */
  stroke-width: 2;
  vector-effect: non-scaling-stroke;
}
</style>
