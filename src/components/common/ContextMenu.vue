<script setup>
import { computed, ref } from 'vue'
import { useCanvasStore } from '@/stores/canvasStore'
import { useImageAdjustmentsStore } from '@/stores/imageAdjustmentsStore'
import { useLayerHistoryStore } from '@/stores/layerHistoryStore'

const store = useCanvasStore()
const adjustmentsStore = useImageAdjustmentsStore()
const layerHistoryStore = useLayerHistoryStore()

const showZoomSlider = ref(false)

const targetId = computed(() => store.workspace.contextMenuTargetId);
const isFolderTarget = computed(() => store.workspace.contextMenuIsFolder);

const targetLayer = computed(() => {
    if (isFolderTarget.value) return null;
    return store.layers.find(l => l.id === targetId.value)
});
const targetFolder = computed(() => {
    if (!isFolderTarget.value) return null;
    return store.folders.find(f => f.id === targetId.value)
});


const canMergeDown = computed(() => {
    if (!targetLayer.value) return false;
    const index = store.layers.findIndex(l => l.id === targetId.value);
    // Não pode mesclar se for a primeira camada, ou se a camada abaixo estiver numa pasta diferente
    const layerBelow = store.layers[index - 1];
    return index > 0 && layerBelow && layerBelow.folderId === targetLayer.value.folderId;
});

const canUndo = computed(() => {
  if (!targetLayer.value) return false
  return layerHistoryStore.canUndo(targetId.value)
})

const canRedo = computed(() => {
  if (!targetLayer.value) return false
  return layerHistoryStore.canRedo(targetId.value)
})

const zoomLevel = computed({
  get: () => store.workspace.zoom * 100,
  set: (val) => {
    const canvasEl = document.getElementById('mainCanvas')
    if (!canvasEl) return
    const center = { x: canvasEl.clientWidth / 2, y: canvasEl.clientHeight / 2 }
    const newZoom = val / 100
    const { pan, zoom } = store.workspace
    const worldX = (center.x - pan.x) / zoom
    const worldY = (center.y - pan.y) / zoom
    const newPanX = center.x - worldX * newZoom
    const newPanY = center.y - worldY * newZoom
    store.updateWorkspace({ zoom: newZoom, pan: { x: newPanX, y: newPanY } })
  },
})

function onClick(action) {
  if(action) action();
  if (!showZoomSlider.value) {
    store.showContextMenu(false);
  }
}
</script>

<template>
  <div
    class="context-menu-overlay"
    @click.self="onClick()"
    @contextmenu.prevent.self="onClick()"
  >
    <div
        class="context-menu"
        :style="{
        top: `${store.workspace.contextMenuPosition.y}px`,
        left: `${store.workspace.contextMenuPosition.x}px`,
        }"
    >
        <div v-if="showZoomSlider" class="menu-section">
            <div class="zoom-slider-container">
                <span class="icon"><svg viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m-3-3h6"/></svg></span>
                <input type="range" min="10" max="1000" v-model="zoomLevel" class="zoom-slider" />
                <span>{{ zoomLevel.toFixed(0) }}%</span>
                <button @click="showZoomSlider = false" class="close-zoom-btn">OK</button>
            </div>
        </div>
        <template v-else>
            <template v-if="isFolderTarget && targetFolder">
                 <div class="menu-section">
                    <div class="menu-item" @click="onClick(() => store.renameFolder(targetId, prompt('Novo nome:', targetFolder.name) || targetFolder.name))">
                        <span class="icon"><svg viewBox="0 0 24 24"><path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg></span>
                        <span class="text">Renomear</span>
                    </div>
                </div>
                <div class="menu-divider"></div>
                <div class="menu-section">
                     <div class="menu-item" @click="onClick(() => store.toggleFolderLock(targetId))">
                        <span class="icon">
                            <svg v-if="targetFolder.isLocked" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 019.9-1"/></svg>
                            <svg v-else viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                        </span>
                        <span class="text">{{ targetFolder.isLocked ? 'Desbloquear' : 'Bloquear' }}</span>
                    </div>
                    <div class="menu-item" @click="onClick(() => store.toggleFolderVisibility(targetId))">
                        <span class="icon"><svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></span>
                        <span class="text">Ocultar/Mostrar</span>
                    </div>
                </div>
                 <div class="menu-divider"></div>
                <div class="menu-section">
                    <div class="menu-item" @click="onClick(() => store.duplicateFolder(targetId))">
                        <span class="icon"><svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg></span>
                        <span class="text">Duplicar Pasta</span>
                    </div>
                    </div>
                 <div class="menu-divider"></div>
                <div class="menu-section">
                    <div class="menu-item danger" @click="onClick(() => store.deleteFolder(targetId))">
                        <span class="icon"><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path></svg></span>
                        <span class="text">Apagar Pasta</span>
                    </div>
                </div>
            </template>
            <template v-if="!isFolderTarget && targetLayer">
                <div class="menu-section">
                    <div class="menu-item" @click="showZoomSlider = true">
                        <span class="icon"><svg viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m-3-3h6"/></svg></span>
                        <span class="text">Aproximar/Afastar</span>
                        <span class="shortcut">Ctrl +/-</span>
                    </div>
                    <div class="menu-item" @click="onClick(() => store.zoomToFit())">
                        <span class="icon"><svg viewBox="0 0 24 24"><path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/></svg></span>
                        <span class="text">Ajustar à Tela</span>
                        <span class="shortcut">Ctrl 0</span>
                    </div>
                </div>
                <div class="menu-divider"></div>
                <div class="menu-section">
                     <div class="menu-item history-controls">
                        <button :disabled="!canUndo" @click="onClick(() => layerHistoryStore.undo(targetId))" title="Desfazer">
                            <svg width="20" height="20" viewBox="0 0 24 24"><path d="M21 7v6h-6" /><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" /></svg>
                        </button>
                         <span class="text">Histórico</span>
                        <button :disabled="!canRedo" @click="onClick(() => layerHistoryStore.redo(targetId))" title="Refazer">
                            <svg width="20" height="20" viewBox="0 0 24 24"><path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" /></svg>
                        </button>
                    </div>
                    <div class="menu-item" @click="onClick(() => store.togglePanel('layerHistory', true, targetId))">
                        <span class="icon"><svg viewBox="0 0 24 24"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg></span>
                        <span class="text">Ver Histórico Detalhado</span>
                    </div>
                </div>
                <div class="menu-divider"></div>
                <div class="menu-section">
                    <div class="menu-item" @click="onClick(() => store.duplicateLayer(targetId))">
                        <span class="icon"><svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg></span>
                        <span class="text">Duplicar Camada</span>
                    </div>
                    <div class="menu-item" :class="{ disabled: !canMergeDown }" @click="canMergeDown && onClick(() => store.mergeDown(targetId))">
                        <span class="icon"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12l7 7 7-7"/></svg></span>
                        <span class="text">Mesclar para Baixo</span>
                    </div>
                </div>
                <div class="menu-divider"></div>
                <div class="menu-section">
                    <div class="menu-item" @click="onClick(() => adjustmentsStore.openModal())">
                        <span class="icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 18a6 6 0 000-12v12z"/></svg></span>
                        <span class="text">Ajustes de Imagem</span>
                    </div>
                    <div class="menu-item" @click="onClick(() => store.showResizeModal(true))">
                        <span class="icon"><svg viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg></span>
                        <span class="text">Redimensionar</span>
                    </div>
                </div>
                <div class="menu-divider"></div>
                <div class="menu-section">
                    <div class="menu-item" @click="onClick(() => store.flipLayer('horizontal'))">
                        <span class="icon"><svg viewBox="0 0 24 24"><path d="M3 12h18M11 3l-4 4 4 4M21 17l-4 4 4 4"/></svg></span>
                        <span class="text">Inverter Horizontal</span>
                    </div>
                    <div class="menu-item" @click="onClick(() => store.flipLayer('vertical'))">
                        <span class="icon"><svg viewBox="0 0 24 24"><path d="M12 3v18M3 13l4-4 4 4M17 3l4 4-4 4"/></svg></span>
                        <span class="text">Inverter Vertical</span>
                    </div>
                </div>
                <div class="menu-divider"></div>
                <div class="menu-section">
                    <div class="menu-item" @click="onClick(() => store.exportLayer(targetId, 'png'))">
                        <span class="icon"><svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg></span>
                        <span class="text">Exportar como PNG</span>
                    </div>
                </div>
                <div class="menu-divider"></div>
                <div class="menu-section">
                    <div class="menu-item danger" @click="onClick(() => store.deleteLayer(targetId))">
                        <span class="icon"><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path></svg></span>
                        <span class="text">Apagar Camada</span>
                    </div>
                </div>
            </template>
        </template>
    </div>
  </div>
</template>

<style scoped>
.context-menu-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 999;
}
.context-menu {
  position: fixed;
  background-color: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  z-index: 1000;
  padding: var(--spacing-2);
  width: 260px;
  backdrop-filter: blur(10px);
  background-color: rgba(255, 255, 255, 0.85);
  /* --- CORREÇÃO APLICADA AQUI --- */
  max-height: calc(100vh - 20px); /* Garante que o menu não exceda a altura da tela */
  overflow-y: auto; /* Adiciona scroll se o conteúdo for maior que a altura máxima */
}
.menu-section {
    display: flex;
    flex-direction: column;
}
.menu-item {
    display: grid;
    grid-template-columns: 24px 1fr auto;
    align-items: center;
    gap: var(--spacing-3);
    padding: var(--spacing-2) var(--spacing-3);
    cursor: pointer;
    font-size: var(--fs-sm);
    white-space: nowrap;
    border-radius: var(--radius-md);
    transition: background-color 0.1s ease-in-out;
}
.menu-item:hover {
  background-color: var(--c-primary);
  color: var(--c-white);
}
.menu-item:hover .shortcut {
    color: rgba(255, 255, 255, 0.7);
}
.menu-item .icon {
    font-size: 16px;
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
}
.icon svg {
    width: 18px;
    height: 18px;
    stroke: currentColor;
    fill: none;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
}
.menu-item .text {
    font-weight: var(--fw-medium);
}
.menu-item .shortcut {
    font-size: var(--fs-xs);
    color: var(--c-text-tertiary);
    justify-self: end;
}
.menu-item.disabled {
  color: var(--c-text-tertiary);
  cursor: not-allowed;
  background-color: transparent !important;
}
.menu-divider {
  height: 1px;
  background: var(--c-border);
  margin: var(--spacing-2);
}
.menu-item.danger {
  color: #ff3333;
}
.menu-item.danger:hover {
  background-color: #ff3333;
  color: white;
}
.zoom-slider-container {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    padding: var(--spacing-2) var(--spacing-3);
}
.zoom-slider {
    flex-grow: 1;
    accent-color: var(--c-primary);
}
.zoom-slider-container span {
    font-size: var(--fs-xs);
    font-family: monospace;
    width: 40px;
    text-align: right;
}
.close-zoom-btn {
    font-size: var(--fs-xs);
    padding: 2px 8px;
    border-radius: var(--radius-sm);
    background-color: var(--c-surface-dark);
}
.history-controls {
    grid-template-columns: auto 1fr auto;
    padding: 4px;
}
.history-controls .text {
    text-align: center;
}
.history-controls button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: var(--radius-sm);
}
.history-controls button:hover:not(:disabled) {
    background-color: rgba(0,0,0,0.1);
}
.history-controls button:disabled {
    opacity: 0.3;
    cursor: not-allowed;
}
.history-controls button svg {
    stroke: currentColor;
    fill: none;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
}
</style>
