<script setup>
import { computed } from 'vue';
import { useCanvasStore } from '@/stores/canvasStore';

const store = useCanvasStore();

const isVisible = computed(() => store.activeTool === 'direct-select' && store.editingVector.layerId);
const layer = computed(() => {
    if (!isVisible.value) return null;
    return store.layers.find(l => l.id === store.editingVector.layerId);
});

// Calcula a posição dos pontos de ancoragem e de controlo na tela
const renderedElements = computed(() => {
    if (!isVisible.value || !layer.value) return [];

    const { pan, zoom } = store.workspace;
    const { x: layerX, y: layerY, scale, rotation, metadata } = layer.value;

    const elements = [];
    let lastAnchorPoint = null;

    store.editingVector.points.forEach((p, index) => {
        if (p.command.toUpperCase() === 'Z') return;

        const pointCoords = layerToScreenCoords(p, layer.value);
        elements.push({ type: 'anchor', x: pointCoords.x, y: pointCoords.y, index });

        if (p.command.toUpperCase() === 'Q') {
            const controlPoint = { command: 'C', x: p.cp1x, y: p.cp1y };
            const controlCoords = layerToScreenCoords(controlPoint, layer.value);
            elements.push({ type: 'control', x: controlCoords.x, y: controlCoords.y, index });

            // Linhas de ajuda
            if (lastAnchorPoint) {
                elements.push({ type: 'handle-line', x1: lastAnchorPoint.x, y1: lastAnchorPoint.y, x2: controlCoords.x, y2: controlCoords.y });
            }
            elements.push({ type: 'handle-line', x1: controlCoords.x, y1: controlCoords.y, x2: pointCoords.x, y2: pointCoords.y });
        }

        lastAnchorPoint = pointCoords;
    });

    return elements;
});

function layerToScreenCoords(point, layer) {
    const { pan, zoom } = store.workspace;
    const { x: layerX, y: layerY, scale, rotation, metadata } = layer;

    const localX = (point.x - metadata.originalWidth / 2) * scale;
    const localY = (point.y - metadata.originalHeight / 2) * scale;

    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    const rotatedX = localX * cos - localY * sin;
    const rotatedY = localX * sin + localY * cos;

    return {
        x: (layerX + rotatedX) * zoom + pan.x,
        y: (layerY + rotatedY) * zoom + pan.y,
    };
}


function startDraggingPoint(index, type, event) {
    event.stopPropagation();
    event.preventDefault();
    store.editingVector.draggedPointIndex = index;
    store.editingVector.draggedPointType = type; // 'anchor' ou 'control'

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

    // Modifica a função chamada na store para manipular pontos de controlo também
    if (store.editingVector.draggedPointType === 'control') {
        store.moveVectorControlPoint(newLayerCoords);
    } else {
        store.moveVectorPoint(newLayerCoords);
    }
}

function endDrag() {
    // Adiciona ao histórico no final do arrasto
    const layerId = store.editingVector.layerId;
    if (layerId) {
        const initialState = { ...store.editingVector.originalStateBeforeDrag };
        store.commitLayerStateToHistory(layerId, initialState, 'Editar Vetor');
    }

    store.editingVector.draggedPointIndex = null;
    store.editingVector.draggedPointType = null;
    store.editingVector.originalStateBeforeDrag = null;
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('touchmove', onDrag);
}
</script>

<template>
  <div v-if="isVisible" class="vector-edit-handles-overlay">
    <svg width="100%" height="100%" class="handle-lines-svg">
      <template v-for="(el, index) in renderedElements" :key="`line-${index}`">
        <line
          v-if="el.type === 'handle-line'"
          :x1="el.x1" :y1="el.y1"
          :x2="el.x2" :y2="el.y2"
          class="handle-line"
        />
      </template>
    </svg>

    <template v-for="(el, index) in renderedElements" :key="`point-${index}`">
      <div
        v-if="el.type === 'anchor'"
        class="anchor-point"
        :style="{ left: el.x + 'px', top: el.y + 'px' }"
        @mousedown.prevent.stop="startDraggingPoint(el.index, 'anchor', $event)"
        @touchstart.prevent.stop="startDraggingPoint(el.index, 'anchor', $event)"
      ></div>
      <div
        v-if="el.type === 'control'"
        class="control-point"
        :style="{ left: el.x + 'px', top: el.y + 'px' }"
        @mousedown.prevent.stop="startDraggingPoint(el.index, 'control', $event)"
        @touchstart.prevent.stop="startDraggingPoint(el.index, 'control', $event)"
      ></div>
    </template>
  </div>
</template>

<style scoped>
.vector-edit-handles-overlay {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  pointer-events: none;
  z-index: 150;
}
.handle-lines-svg {
    position: absolute;
    top: 0; left: 0;
    overflow: visible;
}
.handle-line {
    stroke: var(--c-primary);
    stroke-width: 1;
    stroke-dasharray: 2 2;
}
.anchor-point, .control-point {
  position: absolute;
  transform: translate(-50%, -50%);
  pointer-events: all;
}
.anchor-point {
  width: 10px; height: 10px;
  background-color: white;
  border: 2px solid var(--c-primary);
  border-radius: 2px;
  cursor: move;
}
.control-point {
  width: 8px; height: 8px;
  background-color: var(--c-primary);
  border: 1px solid white;
  border-radius: 50%;
  cursor: pointer;
}
</style>
