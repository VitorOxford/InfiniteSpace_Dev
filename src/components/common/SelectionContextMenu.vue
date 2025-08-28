<script setup>
import { useCanvasStore } from '@/stores/canvasStore'

const store = useCanvasStore()

function onClick(action) {
  action()
  store.showSelectionContextMenu(false)
}
</script>

<template>
  <div
    class="context-menu"
    :style="{
      top: `${store.workspace.selectionContextMenuPosition.y}px`,
      left: `${store.workspace.selectionContextMenuPosition.x}px`,
    }"
  >
    <ul>
      <li @click="onClick(() => store.copySelectionToClipboard())">Copiar</li>
      <li
        :class="{ disabled: !store.copiedSelection }"
        @click="onClick(() => store.pasteSelection())"
      >
        Colar
      </li>
      <li @click="onClick(() => store.duplicateSelection())">Duplicar</li>
      <li class="divider"></li>
      <li @click="onClick(() => store.cutoutSelection())" class="danger">Excluir</li>
    </ul>
  </div>
</template>

<style scoped>
.context-menu {
  position: fixed; /* Usa fixed para se posicionar em relação à janela */
  background-color: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  z-index: 1000;
  padding: var(--spacing-2) 0;
}
ul {
  list-style: none;
  margin: 0;
  padding: 0;
}
li {
  padding: var(--spacing-2) var(--spacing-4);
  cursor: pointer;
  font-size: var(--fs-sm);
  white-space: nowrap;
}
li:hover {
  background-color: var(--c-surface-dark);
  color: var(--c-primary);
}
li.disabled {
  color: var(--c-text-tertiary);
  cursor: not-allowed;
  background-color: transparent !important;
}
li.divider {
  height: 1px;
  background: var(--c-border);
  padding: 0;
  margin: var(--spacing-2) 0;
}
li.danger {
  color: #ff3333;
}
li.danger:hover {
  background-color: #ffdddd;
}
</style>
