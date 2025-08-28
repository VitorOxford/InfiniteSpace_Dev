<script setup>
import { computed } from 'vue';
import { useCanvasStore } from '@/stores/canvasStore';

const store = useCanvasStore();

const isVisible = computed(() => store.activeTool === 'direct-select' && store.editingVector.layerId);
const layer = computed(() => {
    if (!isVisible.value) return null;
    return store.layers.find(l => l.id === store.editingVector.layerId);
});

// Calcula a posição dos pontos na tela
const screenPoints = computed(() => {
    if (!isVisible.value || !layer.value) return [];

    const { pan, zoom } = store.workspace;
    const { x: layerX, y: layerY, scale, rotation, metadata } = layer.value;
    const { originalWidth, originalHeight } = metadata;

    const layerOriginX = layerX - (originalWidth / 2) * scale;
    const layerOriginY = layerY - (originalHeight / 2) * scale;

    return store.editingVector.points.map(p => {
        // As coordenadas dos pontos são relativas ao BBox da camada
        // Primeiro, aplicamos a escala e rotação da camada
        const localX = p.x * scale;
        const localY = p.y * scale;

        const cos = Math.cos(rotation);
        const sin = Math.sin(rotation);

        const rotatedX = localX * cos - localY * sin;
        const rotatedY = localX * sin + localY * cos;

        // Agora, convertemos para coordenadas do workspace (mundo)
        const worldX = layerOriginX + rotatedX;
        const worldY = layerOriginY + rotatedY;

        // Finalmente, para coordenadas da tela
        return {
            x: worldX * zoom + pan.x,
            y: worldY * zoom + pan.y,
        };
    });
});

function startDraggingPoint(index, event) {
    event.stopPropagation();
    event.preventDefault();
    store.editingVector.draggedPointIndex = index;
    // Adiciona os listeners no documento para capturar o movimento globalmente
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('touchmove', onDrag, { passive: false });
    document.addEventListener('mouseup', endDrag, { once: true });
    document.addEventListener('touchend', endDrag, { once: true });
}

function getEventCoords(e) {
    const touch = e.touches && e.touches.length > 0 ? e.touches[0] : null;
    return touch || e;
}

function onDrag(event) {
    if (store.editingVector.draggedPointIndex === null) return;

    const coords = getEventCoords(event);
    const canvas = document.getElementById('mainCanvas');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    const mouse = {
        x: coords.clientX - rect.left,
        y: coords.clientY - rect.top,
    };

    // Converte a posição do mouse na tela para as coordenadas locais da camada vetorial
    const { pan, zoom } = store.workspace;
    const { x: layerX, y: layerY, scale, rotation, metadata } = layer.value;

    const worldX = (mouse.x - pan.x) / zoom;
    const worldY = (mouse.y - pan.y) / zoom;

    const dx = worldX - layerX;
    const dy = worldY - layerY;

    const cos = Math.cos(-rotation);
    const sin = Math.sin(-rotation);

    const rotatedX = (dx * cos - dy * sin) / scale;
    const rotatedY = (dx * sin + dy * cos) / scale;

    const newLayerCoords = {
        x: rotatedX + metadata.originalWidth / 2,
        y: rotatedY + metadata.originalHeight / 2,
    };

    store.moveVectorPoint(newLayerCoords);
}

function endDrag() {
    store.editingVector.draggedPointIndex = null;
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('touchmove', onDrag);
}

</script>

<template>
  <div v-if="isVisible" class="vector-edit-handles-overlay">
    <div
      v-for="(point, index) in screenPoints"
      :key="index"
      class="anchor-point"
      :style="{ left: point.x + 'px', top: point.y + 'px' }"
      @mousedown.prevent.stop="startDraggingPoint(index, $event)"
      @touchstart.prevent.stop="startDraggingPoint(index, $event)"
    ></div>
  </div>
</template>

<style scoped>
.vector-edit-handles-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 150;
}
.anchor-point {
  position: absolute;
  width: 10px;
  height: 10px;
  background-color: white;
  border: 2px solid var(--c-primary);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  cursor: move;
  pointer-events: all;
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.2);
}
.anchor-point:hover {
  transform: translate(-50%, -50%) scale(1.2);
}
</style>
