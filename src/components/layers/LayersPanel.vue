<script setup>
import { computed, ref, nextTick } from 'vue'
import { useCanvasStore } from '@/stores/canvasStore'
import AssetsSidebar from '@/components/layout/AssetsSidebar.vue'

const props = defineProps({
  isVisible: Boolean
})

const store = useCanvasStore()
const isAssetsPanelVisible = ref(false)
const draggedItem = ref(null)
const editingFolderId = ref(null);
const inputRef = ref(null);

const unfiledLayers = computed(() => {
  return [...store.layers.filter(l => !l.folderId)].reverse();
});

const folders = computed(() => {
  return [...store.folders].reverse();
});

function getLayersForFolder(folderId) {
    const folderLayers = store.layers.filter(l => l.folderId === folderId);
    return [...folderLayers].reverse();
}

function toggleVisibility(layer) {
  if (layer.folderId) {
      const folder = store.folders.find(f => f.id === layer.folderId);
      if (folder?.isLocked) return;
  }
  store.updateLayerProperties(layer.id, { visible: !layer.visible }, 'Visibilidade')
}

const selectedLayerOpacity = computed({
  get() {
    if (!store.selectedLayer) return 100;
    const folder = store.folders.find(f => f.id === store.selectedLayer.folderId);
    if (folder?.isLocked) return store.selectedLayer.opacity * 100;
    return store.selectedLayer.opacity * 100;
  },
  set(value) {
    if (store.selectedLayer) {
       const folder = store.folders.find(f => f.id === store.selectedLayer.folderId);
       if (folder?.isLocked) return;
      store.updateLayerProperties(store.selectedLayer.id, { opacity: value / 100 }, 'Opacidade')
    }
  },
})

function handleDragStart(event, item, isFolder = false) {
  const folder = item.folderId ? store.folders.find(f => f.id === item.folderId) : null;
  if (folder?.isLocked || (isFolder && item.isLocked)) {
      event.preventDefault();
      return;
  }
  draggedItem.value = { item, isFolder };
  event.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(event) {
  event.preventDefault()
}

function handleDropOnLayer(event, targetLayer) {
    event.preventDefault();
    event.stopPropagation();
    if (!draggedItem.value || draggedItem.value.isFolder || draggedItem.value.item.id === targetLayer.id) {
        draggedItem.value = null;
        return;
    }
    const fromLayer = draggedItem.value.item;
    const fromIndex = store.layers.findIndex(l => l.id === fromLayer.id);
    const toIndex = store.layers.findIndex(l => l.id === targetLayer.id);

    if (fromIndex !== -1 && toIndex !== -1) {
        if (fromLayer.folderId !== targetLayer.folderId) {
            draggedItem.value = null;
            return;
        }
        store.moveLayer(fromIndex, toIndex);
    }
    draggedItem.value = null;
}

function handleDropOnFolder(event, folder) {
  event.preventDefault();
  event.stopPropagation();
  if (draggedItem.value && !draggedItem.value.isFolder) {
    if (!folder.isLocked) {
      store.moveLayerToFolder(draggedItem.value.item.id, folder.id);
    }
  }
  draggedItem.value = null;
}

function handleDropOnRoot(event) {
    event.preventDefault();
    if (draggedItem.value && !draggedItem.value.isFolder && draggedItem.value.item.folderId) {
        store.moveLayerToFolder(draggedItem.value.item.id, null);
    }
    draggedItem.value = null;
}

function handleContextMenu(event, item) {
  event.preventDefault();
  const isFolder = item.type === 'folder';
  store.showContextMenu(true, { x: event.clientX, y: event.clientY }, item.id, isFolder);
}

async function startEditing(folder) {
  if (folder.isLocked) return;
  editingFolderId.value = folder.id;
  await nextTick();
  if (inputRef.value) {
    inputRef.value.focus();
    inputRef.value.select();
  }
}

function finishEditing(folder, event) {
  if (editingFolderId.value === folder.id) {
    store.renameFolder(folder.id, event.target.value);
    editingFolderId.value = null;
  }
}

function createNewFolder() {
  const newFolder = store.createFolder();
  startEditing(newFolder);
}

function isLayerDraggable(layer) {
    const folder = layer.folderId ? store.folders.find(f => f.id === layer.folderId) : null;
    return !folder || !folder.isLocked;
}

</script>

<template>
  <div>
    <transition name="fade">
      <aside v-if="isVisible" class="layers-panel-dropdown">
        <div class="panel-header-actions">
          <button @click="createNewFolder" title="Criar Nova Pasta">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"></path><line x1="12" x2="12" y1="10" y2="16"></line><line x1="9" x2="15" y1="13" y2="13"></line></svg>
          </button>
          <button
              @click="isAssetsPanelVisible = !isAssetsPanelVisible"
              class="btn btn-primary add-layer-btn"
          >
              + Adicionar Ativo
          </button>
        </div>
        <div class="layers-list" @dragover.prevent @drop="handleDropOnRoot">
          <div v-if="store.layers.length === 0 && store.folders.length === 0" class="empty-state">
            <p>Sem camadas.</p>
            <span>Adicione um ativo para começar.</span>
          </div>

          <div v-for="(layer) in unfiledLayers" :key="`layer-${layer.id}`" class="layer-item-wrapper" :draggable="isLayerDraggable(layer)" @dragstart="handleDragStart($event, layer)" @dragover.prevent @drop.stop="handleDropOnLayer($event, layer)">
            <div class="layer-item" :class="{ active: store.selectedLayerId === layer.id }" @click="store.selectLayer(layer.id)" @contextmenu="handleContextMenu($event, layer)">
              <div class="layer-thumbnail">
                <img v-if="layer.imageUrl" :src="layer.imageUrl" :alt="layer.name" />
              </div>
              <span class="layer-name">{{ layer.name }}</span>
              <div class="layer-actions">
                <button @click.stop="toggleVisibility(layer)" title="Mostrar/Ocultar Camada">
                  <svg v-if="layer.visible" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                  <svg v-else viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07l-2.22-2.22"/><line x1="1" y1="1" x2="23" y2="23" /></svg>
                </button>
                <button @click.stop="handleContextMenu($event, layer)" title="Mais Opções">
                    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>
                </button>
              </div>
            </div>
            <div v-if="store.selectedLayerId === layer.id" class="opacity-panel">
              <label>Opacidade</label>
              <input type="range" min="0" max="100" step="1" v-model="selectedLayerOpacity" class="opacity-slider" />
              <span>{{ Math.round(selectedLayerOpacity) }}%</span>
            </div>
          </div>

          <div class="folder-section">
            <div v-for="folder in folders" :key="`folder-${folder.id}`" class="folder-item-wrapper" @dragover.prevent @drop.stop="handleDropOnFolder($event, folder)">
                <div class="folder-header" :class="{ 'is-locked': folder.isLocked }" @contextmenu="handleContextMenu($event, folder)" @click="folder.isOpen = !folder.isOpen">
                    <button class="folder-toggle-btn"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="chevron" :class="{'is-open': folder.isOpen}"><polyline points="6 9 12 15 18 9"></polyline></svg></button>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"></path></svg>
                    <input v-if="editingFolderId === folder.id" type="text" :value="folder.name" @blur="finishEditing(folder, $event)" @keydown.enter.prevent="finishEditing(folder, $event)" @keydown.esc="editingFolderId = null" @click.stop class="folder-name-input" ref="inputRef" />
                    <span v-else class="folder-name" @dblclick.stop="!folder.isLocked && startEditing(folder)">{{ folder.name }}</span>
                    <div class="folder-actions">
                        <button v-if="folder.isLocked" class="lock-icon" @click.stop="store.toggleFolderLock(folder.id)"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg></button>
                        <button class="more-options-btn" @click.stop="handleContextMenu($event, folder)" title="Mais Opções"><svg viewBox="0 0 24 24" width="16" height="16"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg></button>
                    </div>
                </div>
                <transition name="slide-fade">
                     <div v-if="folder.isOpen" class="folder-content">
                        <div v-for="layer in getLayersForFolder(folder.id)" :key="`layer-${layer.id}`" class="layer-item-wrapper" :draggable="isLayerDraggable(layer)" @dragstart="handleDragStart($event, layer)" @dragover.prevent @drop.stop="handleDropOnLayer($event, layer)">
                            <div class="layer-item" :class="{ active: store.selectedLayerId === layer.id }" @click.stop="!folder.isLocked && store.selectLayer(layer.id)" @contextmenu="handleContextMenu($event, layer)">
                                <div class="layer-thumbnail"><img v-if="layer.imageUrl" :src="layer.imageUrl" :alt="layer.name" /></div>
                                <span class="layer-name">{{ layer.name }}</span>
                                <div class="layer-actions">
                                    <button @click.stop="toggleVisibility(layer)" :disabled="folder.isLocked" title="Mostrar/Ocultar Camada"><svg v-if="layer.visible" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg><svg v-else viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07l-2.22-2.22"/><line x1="1" y1="1" x2="23" y2="23" /></svg></button>
                                    <button @click.stop="handleContextMenu($event, layer)" title="Mais Opções"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg></button>
                                </div>
                            </div>
                            <div v-if="store.selectedLayerId === layer.id" class="opacity-panel">
                                <label>Opacidade</label>
                                <input type="range" min="0" max="100" step="1" :value="selectedLayerOpacity" @input="selectedLayerOpacity = $event.target.value" :disabled="folder.isLocked" class="opacity-slider" />
                                <span>{{ Math.round(selectedLayerOpacity) }}%</span>
                            </div>
                        </div>
                        <div v-if="getLayersForFolder(folder.id).length === 0" class="empty-folder-text">Esta pasta está vazia.</div>
                    </div>
                </transition>
            </div>
          </div>

        </div>
      </aside>
    </transition>
    <AssetsSidebar :is-visible="isAssetsPanelVisible" @close="isAssetsPanelVisible = false" />
  </div>
</template>

<style scoped>
.layers-panel-dropdown {
  position: absolute;
  top: calc(var(--top-menu-bar-height) + var(--spacing-2));
  right: var(--spacing-4);
  width: 300px;
  max-height: calc(100vh - var(--top-menu-bar-height) - 80px);
  background-color: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  z-index: 900;
  display: flex;
  flex-direction: column;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.panel-header-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-2) var(--spacing-3);
  border-bottom: 1px solid var(--c-border);
  flex-shrink: 0;
}

.panel-header-actions button {
    background: none;
    border: 1px solid transparent;
    border-radius: var(--radius-md);
    padding: var(--spacing-1);
    font-size: 1.2rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
}
.panel-header-actions button:hover {
    background-color: var(--c-surface-dark);
    border-color: var(--c-border);
}
.add-layer-btn {
  padding: var(--spacing-1) var(--spacing-3);
  font-size: var(--fs-sm);
  border: none !important;
  margin-left: auto;
}
.layers-list {
  flex-grow: 1;
  overflow-y: auto;
  padding: var(--spacing-2);
}
.layer-item-wrapper {
  margin-bottom: var(--spacing-1);
}
.layer-item-wrapper[draggable='true'] {
  cursor: grab;
}
.layer-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-2);
  border-radius: var(--radius-md);
  transition: background-color 0.15s ease-in-out;
  position: relative;
}

.layer-thumbnail {
  width: 40px;
  height: 40px;
  background-color: var(--c-background);
  border-radius: var(--radius-sm);
  flex-shrink: 0;
  overflow: hidden;
}
.layer-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.layer-name {
  flex-grow: 1;
  font-weight: var(--fw-medium);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: var(--transition-fast);
}
.layer-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
  background-color: var(--c-surface-dark);
  border-radius: var(--radius-md);
  padding: 2px;
  position: absolute;
  right: var(--spacing-2);
  top: 50%;
  transform: translateY(-50%);
  opacity: 0;
  pointer-events: none;
  transition: var(--transition-fast);
}
.layer-item:hover .layer-actions,
.layer-item.active .layer-actions {
  opacity: 1;
  pointer-events: auto;
}
.layer-item:hover .layer-name,
.layer-item.active .layer-name {
  max-width: 120px;
}
.layer-actions button {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--c-text-secondary);
  border-radius: var(--radius-sm);
}
.layer-actions button:hover:not(:disabled) {
  background-color: var(--c-border);
  color: var(--c-text-primary);
}
.layer-actions button:disabled {
  opacity: 0.2;
  cursor: not-allowed;
}
.layer-actions button svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.layer-item.active {
  background-color: var(--c-primary);
  color: var(--c-white);
}
.layer-item.active .layer-actions {
  background-color: rgba(255, 255, 255, 0.2);
}
.layer-item.active .layer-actions button {
  color: var(--c-white);
}
.layer-item.active .layer-actions button:hover:not(:disabled) {
  background-color: rgba(255, 255, 255, 0.3);
}
.opacity-panel {
  background-color: var(--c-surface-dark);
  padding: var(--spacing-2) var(--spacing-3);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  margin-top: -4px;
}
.opacity-panel label {
  font-size: var(--fs-sm);
  font-weight: var(--fw-medium);
  color: var(--c-text-secondary);
}
.opacity-slider {
  flex-grow: 1;
  accent-color: var(--c-primary);
}
.opacity-panel span {
  font-size: var(--fs-sm);
  font-family: monospace;
  color: var(--c-text-primary);
  width: 40px;
  text-align: right;
}
.empty-state {
  text-align: center;
  padding: var(--spacing-6);
  color: var(--c-text-secondary);
}
.empty-state span {
  font-size: var(--fs-xs);
}
.btn {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-2) var(--spacing-4);
  border-radius: var(--radius-md);
  font-weight: var(--fw-semibold);
  transition: var(--transition-fast);
  border: none;
  cursor: pointer;
}
.btn-primary {
  background-color: var(--c-primary);
  color: var(--c-white);
}
.btn-primary:hover {
  background-color: var(--c-primary-hover);
}
.folder-section {
  margin-top: var(--spacing-2);
  border-top: 1px solid var(--c-border);
  padding-top: var(--spacing-2);
}
.folder-item-wrapper {
  margin-bottom: var(--spacing-1);
}
.folder-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-2) var(--spacing-3);
  background-color: var(--c-background);
  border-radius: var(--radius-md);
  cursor: pointer;
  border: 1px solid transparent;
}
.folder-header:hover .folder-actions {
    opacity: 1;
}
.folder-header.is-locked {
  color: var(--c-text-tertiary);
}
.folder-name-input {
  flex-grow: 1;
  border: 1px solid var(--c-primary);
  border-radius: var(--radius-sm);
  padding: 2px 4px;
  font-weight: var(--fw-semibold);
  background-color: var(--c-white);
  color: var(--c-text-primary);
}

.folder-name {
  flex-grow: 1;
  font-weight: var(--fw-semibold);
}
.folder-toggle-btn {
    padding: 0;
}
.chevron {
    transition: transform 0.2s ease-in-out;
}
.chevron.is-open {
    transform: rotate(90deg);
}
.folder-actions {
    margin-left: auto;
    display: flex;
    align-items: center;
    opacity: 0;
    transition: opacity 0.2s ease;
}
.lock-icon, .more-options-btn {
    color: var(--c-text-secondary);
}
.folder-content {
    padding-left: var(--spacing-5);
    margin-top: var(--spacing-1);
    overflow: hidden;
}
.empty-folder-text {
    font-size: var(--fs-xs);
    color: var(--c-text-tertiary);
    text-align: center;
    padding: var(--spacing-3);
}

.slide-fade-enter-active, .slide-fade-leave-active {
  transition: grid-template-rows 0.3s ease-in-out;
  display: grid;
}
.slide-fade-enter-from, .slide-fade-leave-to {
  grid-template-rows: 0fr;
}
.slide-fade-enter-to, .slide-fade-leave-from {
  grid-template-rows: 1fr;
}
.slide-fade-enter-active .folder-content-inner,
.slide-fade-leave-active .folder-content-inner {
    overflow: hidden;
}
</style>
