<script setup>
import AppHeader from '@/components/layout/AppHeader.vue'
import TopMenuBar from '@/components/layout/TopMenuBar.vue'
import ToolsSidebar from '@/components/layout/ToolsSidebar.vue'
import CanvasArea from '@/components/canvas/CanvasArea.vue'
import LayersPanel from '@/components/layers/LayersPanel.vue'
import DimensionLines from '@/components/canvas/DimensionLines.vue'
import LassoOverlay from '@/components/canvas/LassoOverlay.vue'
import { useCanvasStore } from '@/stores/canvasStore'
import { ref, computed, onMounted, onUnmounted } from 'vue'

import ContextMenu from '@/components/common/ContextMenu.vue'
import SelectionContextMenu from '@/components/common/SelectionContextMenu.vue'
import ResizeModal from '@/components/modals/ResizeModal.vue'
import PreviewSidebar from '@/components/preview/PreviewSidebar.vue'
import SignatureModal from '@/components/modals/SignatureModal.vue'
import UploadModal from '@/components/modals/UploadModal.vue'
import NewProjectModal from '@/components/modals/NewProjectModal.vue'

// -- OS PAINÉIS SÃO FLUTUANTES E REUTILIZÁVEIS --
import ToolOptionsPanel from '@/components/layout/BrushSidebar.vue'
import GlobalHistoryModal from '@/components/modals/GlobalHistoryModal.vue'
import LayerHistoryModal from '@/components/modals/LayerHistoryModal.vue'

const store = useCanvasStore()
const toolsSidebarRef = ref(null)

const isUploadModalVisible = ref(false)
const isNewProjectModalVisible = ref(false)
const isLayersPanelVisible = ref(true);


const artboardStyle = computed(() => ({
  transform: `scale(${store.workspace.previewZoom})`,
  transformOrigin: 'center center',
}))

function handleWrapperClick() {
  if (store.workspace.isContextMenuVisible) {
    store.showContextMenu(false)
  }
  if (toolsSidebarRef.value) {
    toolsSidebarRef.value.closeDrawer()
  }
}

function showUploadModal() {
  isUploadModalVisible.value = true;
}

// --- CORREÇÃO APLICADA ---
// A função openNewProjectModal foi simplificada, pois não precisa mais fechar o modal de upload
function openNewProjectModal() {
  isNewProjectModalVisible.value = true;
}

function handleKeyDown(e) {
  if (e.ctrlKey && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    store.undoLastAction();
  }
   if (e.ctrlKey && (e.key === '+' || e.key === '=')) {
    e.preventDefault();
    store.zoomIn();
  }
  if (e.ctrlKey && e.key === '-') {
    e.preventDefault();
    store.zoomOut();
  }
   if (e.ctrlKey && e.key === '0') {
    e.preventDefault();
    store.zoomToFit();
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
});
</script>

<template>
  <div
    class="workspace-layout"
    :class="{
        'preview-mode': store.workspace.viewMode === 'preview',
        'layers-panel-hidden': !isLayersPanelVisible
    }"
    @click="handleWrapperClick"
  >
    <AppHeader />
    <TopMenuBar @open-new-project-modal="isNewProjectModalVisible = true" />

    <ToolsSidebar
      ref="toolsSidebarRef"
      :mode="store.workspace.viewMode"
      @show-upload-modal="showUploadModal"
    />

    <main class="canvas-container">
      <div v-if="store.layers.length === 0" class="empty-workspace-placeholder">
        <div class="placeholder-content">
          <img src="/logo.svg" alt="Logo" />
          <h2>Bem-vindo ao MockupCreator Pro</h2>
          <p>Comece um novo projeto a partir do menu "Ficheiro > Novo Projeto..." ou carregue um ficheiro.</p>
        </div>
      </div>

      <template v-else>
        <div v-if="store.workspace.viewMode === 'edit'" class="edit-mode-wrapper">
          <CanvasArea>
            <LassoOverlay />
          </CanvasArea>
        </div>

        <div v-else class="preview-mode-wrapper">
          <div class="artboard-viewport">
            <div class="artboard" :style="artboardStyle">
              <CanvasArea>
                <LassoOverlay />
              </CanvasArea>
              <DimensionLines />
            </div>
          </div>
          <button class="open-preview-sidebar-btn" @click="store.showPreviewSidebar(true)">
            &#9664; Detalhes e Aprovação
          </button>
        </div>
      </template>

      <ToolOptionsPanel />
      <GlobalHistoryModal />
      <LayerHistoryModal />

      <ContextMenu v-if="store.workspace.isContextMenuVisible" />
      <SelectionContextMenu v-if="store.workspace.isSelectionContextMenuVisible" />
      <ResizeModal v-if="store.workspace.isResizeModalVisible" />
      <PreviewSidebar />
      <SignatureModal />

      <UploadModal
        :is-visible="isUploadModalVisible"
        @close="isUploadModalVisible = false"
      />
      <NewProjectModal
        :is-visible="isNewProjectModalVisible"
        @close="isNewProjectModalVisible = false"
      />

    </main>
    <button v-if="store.workspace.viewMode === 'edit' && !isLayersPanelVisible" class="show-layers-btn" @click="isLayersPanelVisible = true">
         <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M15 3v18"/></svg>
    </button>
    <LayersPanel v-if="store.workspace.viewMode === 'edit'" @toggle-panel="isLayersPanelVisible = false" />
  </div>
</template>

<style scoped>
.workspace-layout {
  display: grid;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  grid-template-columns: var(--sidebar-width) 1fr var(--assets-width);
  grid-template-rows: var(--header-height) 40px 1fr;
  grid-template-areas:
    'header header header'
    'top-menu top-menu top-menu'
    'tools  canvas layers';
  position: relative;
  transition: grid-template-columns 0.3s ease-in-out;
}

.workspace-layout.layers-panel-hidden {
    grid-template-columns: var(--sidebar-width) 1fr 0;
}
.workspace-layout.layers-panel-hidden .layers-panel {
    transform: translateX(100%);
}


.workspace-layout.preview-mode {
  grid-template-columns: var(--sidebar-width) 1fr;
  grid-template-rows: var(--header-height) 40px 1fr;
  grid-template-areas:
    'header header'
    'top-menu top-menu'
    'tools  canvas';
}

.app-header { grid-area: header; }
.top-menu-bar { grid-area: top-menu; }
.tools-sidebar { grid-area: tools; }
.canvas-container { grid-area: canvas; }
.layers-panel { grid-area: layers; }

.tools-sidebar,
.canvas-container,
.layers-panel {
  height: calc(100vh - var(--header-height) - 40px);
}

.canvas-container {
  overflow: hidden;
  background-color: var(--c-background);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}
.empty-workspace-placeholder {
  color: var(--c-text-tertiary);
  text-align: center;
}
.placeholder-content img {
  width: 64px;
  height: 64px;
  opacity: 0.5;
  margin-bottom: var(--spacing-4);
}
.placeholder-content h2 {
  font-size: 1.5rem;
  font-weight: var(--fw-semibold);
  color: var(--c-text-secondary);
}
.edit-mode-wrapper,
.preview-mode-wrapper {
  width: 100%;
  height: 100%;
}
.preview-mode-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--c-surface-dark);
}
.artboard-viewport {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
}
.artboard {
  position: relative;
  width: 100%;
  height: 100%;
  max-width: 90vh;
  max-height: calc(100vh - var(--header-height) - 128px);
  box-shadow: var(--shadow-lg);
  background-color: var(--c-background);
  transition: transform 0.2s ease-out;
}
.open-preview-sidebar-btn {
  position: absolute;
  top: 50%;
  right: 0;
  transform: translateY(-50%) rotate(-90deg);
  transform-origin: bottom right;
  background-color: var(--c-primary);
  color: var(--c-white);
  border: none;
  padding: var(--spacing-2) var(--spacing-4);
  font-weight: var(--fw-semibold);
  cursor: pointer;
  border-top-left-radius: var(--radius-md);
  border-top-right-radius: var(--radius-md);
  z-index: 250;
}

.show-layers-btn {
    position: absolute;
    top: calc(var(--header-height) + 40px + var(--spacing-4));
    right: 0;
    transform: translateX(calc(100% - 8px));
    background-color: var(--c-surface);
    border: 1px solid var(--c-border);
    border-right: none;
    padding: var(--spacing-3) var(--spacing-2);
    border-top-left-radius: var(--radius-md);
    border-bottom-left-radius: var(--radius-md);
    box-shadow: var(--shadow-md);
    z-index: 201;
}
</style>
