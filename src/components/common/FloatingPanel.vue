<script setup>
import { computed } from 'vue';
import { useCanvasStore } from '@/stores/canvasStore';
// As diretivas são registradas globalmente em main.js, não precisam de importação aqui
// import { draggable } from '@/directives/draggable.js';
// import { resizable } from '@/directives/resizable.js';

const props = defineProps({
  panelId: { type: String, required: true },
  title: { type: String, default: 'Painel' },
});

const store = useCanvasStore();

const panelState = computed(() => store.getPanelState(props.panelId));

function closePanel() {
  store.togglePanel(props.panelId, false);
}

function togglePin() {
  store.updatePanelState(props.panelId, { isPinned: !panelState.value.isPinned });
}
</script>

<template>
  <div
    v-if="panelState && panelState.isVisible"
    class="floating-panel"
    v-draggable="{ panelId: props.panelId }"
    v-resizable="{ panelId: props.panelId }"
    :style="{
      top: `${panelState.position.top}px`,
      left: `${panelState.position.left}px`,
      width: `${panelState.size.width}px`,
      height: panelState.size.height === 'auto' ? 'auto' : `${panelState.size.height}px`
    }"
  >
    <header class="panel-header draggable-handle">
      <h5 class="panel-title">{{ title }}</h5>
      <div class="panel-actions">
        <button
          class="pin-btn"
          :class="{ 'is-pinned': panelState.isPinned }"
          @click="togglePin"
          title="Fixar painel"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17v5M10 17h4M16 4.5l-4-4-4 4M16 4.5V12a4 4 0 0 1-4 4h0a4 4 0 0 1-4-4V4.5"/></svg>
        </button>
        <button class="close-btn" @click="closePanel">&times;</button>
      </div>
    </header>

    <div class="panel-content-wrapper">
      <slot></slot>
    </div>

    <div class="resize-handle top-left" data-handle="top-left"></div>
    <div class="resize-handle top-right" data-handle="top-right"></div>
    <div class="resize-handle bottom-left" data-handle="bottom-left"></div>
    <div class="resize-handle bottom-right" data-handle="bottom-right"></div>
    <div class="resize-handle top" data-handle="top"></div>
    <div class="resize-handle bottom" data-handle="bottom"></div>
    <div class="resize-handle left" data-handle="left"></div>
    <div class="resize-handle right" data-handle="right"></div>
  </div>
</template>

<style scoped>
.floating-panel {
  position: absolute;
  background-color: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  z-index: 205;
  display: flex;
  flex-direction: column;
  min-width: 250px;
  min-height: 150px; /* Altura mínima */
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-2) var(--spacing-3);
  border-bottom: 1px solid var(--c-border);
  background-color: var(--c-surface-dark);
  flex-shrink: 0;
  border-top-left-radius: var(--radius-lg);
  border-top-right-radius: var(--radius-lg);
  cursor: move;
}

.panel-content-wrapper {
  flex-grow: 1;
  overflow: auto; /* Adiciona barra de rolagem quando necessário */
  position: relative;
}

.panel-title {
  font-weight: var(--fw-semibold);
  color: var(--c-text-primary);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.panel-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
}

.pin-btn, .close-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--c-text-secondary);
  border-radius: var(--radius-sm);
}

.pin-btn:hover, .close-btn:hover {
  background-color: var(--c-border);
}

.pin-btn.is-pinned {
  color: var(--c-white);
  background-color: var(--c-primary);
}

.close-btn {
  font-size: 1.5rem;
  line-height: 1;
}

/* Estilos para as alças de redimensionamento */
.resize-handle {
    position: absolute;
    background: transparent;
    z-index: 10;
}
.resize-handle.top-left { top: -5px; left: -5px; width: 10px; height: 10px; cursor: nwse-resize; }
.resize-handle.top-right { top: -5px; right: -5px; width: 10px; height: 10px; cursor: nesw-resize; }
.resize-handle.bottom-left { bottom: -5px; left: -5px; width: 10px; height: 10px; cursor: nesw-resize; }
.resize-handle.bottom-right { bottom: -5px; right: -5px; width: 10px; height: 10px; cursor: nwse-resize; }
.resize-handle.top { top: -5px; left: 5px; right: 5px; height: 10px; cursor: ns-resize; }
.resize-handle.bottom { bottom: -5px; left: 5px; right: 5px; height: 10px; cursor: ns-resize; }
.resize-handle.left { top: 5px; bottom: 5px; left: -5px; width: 10px; cursor: ew-resize; }
.resize-handle.right { top: 5px; bottom: 5px; right: -5px; width: 10px; cursor: ew-resize; }
</style>
