<script setup>
import TopMenuBar from '@/components/layout/TopMenuBar.vue'
import ToolsSidebar from '@/components/layout/ToolsSidebar.vue'
import CanvasArea from '@/components/canvas/CanvasArea.vue'
import LayersPanel from '@/components/layers/LayersPanel.vue'
import DimensionLines from '@/components/canvas/DimensionLines.vue'
import LassoOverlay from '@/components/canvas/LassoOverlay.vue'
import HorizontalRuler from '@/components/canvas/HorizontalRuler.vue'
import VerticalRuler from '@/components/canvas/VerticalRuler.vue'
import { useCanvasStore } from '@/stores/canvasStore'
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

import ContextMenu from '@/components/common/ContextMenu.vue'
import SelectionContextMenu from '@/components/common/SelectionContextMenu.vue'
import ResizeModal from '@/components/modals/ResizeModal.vue'
import PreviewSidebar from '@/components/preview/PreviewSidebar.vue'
import SignatureModal from '@/components/modals/SignatureModal.vue'
import UploadModal from '@/components/modals/UploadModal.vue'
import NewProjectModal from '@/components/modals/NewProjectModal.vue'
import LoadingIndicator from '@/components/common/LoadingIndicator.vue' // --- ADICIONADO ---

import GlobalHistoryModal from '@/components/modals/GlobalHistoryModal.vue'
import LayerHistoryModal from '@/components/modals/LayerHistoryModal.vue'

const store = useCanvasStore()
const toolsSidebarRef = ref(null)
const canvasWrapperRef = ref(null)
const wrapperDimensions = ref({ width: 0, height: 0 })
let resizeObserver = null;

const isUploadModalVisible = ref(false)
const isNewProjectModalVisible = ref(false)
const isLayersPanelDropdownVisible = ref(true)

const showRulers = computed(() => store.workspace.viewMode === 'edit' && store.workspace.rulers.visible);

function updateWrapperDimensions() {
    if (canvasWrapperRef.value) {
        const rect = canvasWrapperRef.value.getBoundingClientRect();
        wrapperDimensions.value = { width: rect.width, height: rect.height };
    }
}

watch(canvasWrapperRef, (newEl) => {
    if (newEl) {
        if (resizeObserver) {
            resizeObserver.disconnect();
        }
        resizeObserver = new ResizeObserver(updateWrapperDimensions);
        resizeObserver.observe(newEl);
        updateWrapperDimensions();
    } else {
        if (resizeObserver) {
            resizeObserver.disconnect();
        }
    }
});

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
  updateWrapperDimensions();
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
});


const artboardStyle = computed(() => ({
  transform: `scale(${store.workspace.previewZoom})`,
  transformOrigin: 'center center',
}))

function handleWrapperClick(event) {
  const toolsSidebar = event.target.closest('.tools-sidebar');
  if (toolsSidebar) {
    return;
  }

  const layersPanel = event.target.closest('.layers-panel-dropdown');
  const layersButton = event.target.closest('.layers-toggle-button');
  if (!layersPanel && !layersButton) {
      isLayersPanelDropdownVisible.value = false;
  }

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
</script>

<template>
  <div class="workspace-layout" @click="handleWrapperClick">
    <TopMenuBar
      @open-new-project-modal="isNewProjectModalVisible = true"
      @toggle-layers-panel="isLayersPanelDropdownVisible = !isLayersPanelDropdownVisible"
    />

    <main class="canvas-container">
       <div v-if="store.workspace.viewMode === 'edit'" class="edit-mode-wrapper">
          <div class="canvas-layout" :class="{ 'rulers-visible': showRulers }">
              <div v-if="showRulers" class="ruler-corner"></div>
              <HorizontalRuler v-if="showRulers" :width="wrapperDimensions.width" class="ruler-h" />
              <VerticalRuler v-if="showRulers" :height="wrapperDimensions.height" class="ruler-v" />
              <div class="canvas-area-wrapper" ref="canvasWrapperRef">
                <CanvasArea>
                    <LassoOverlay />
                </CanvasArea>
              </div>
          </div>
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

      <LoadingIndicator v-if="store.workspace.isVectorizing" message="Vetorizando objeto..." />

      <ToolsSidebar
        ref="toolsSidebarRef"
        :mode="store.workspace.viewMode"
        @show-upload-modal="showUploadModal"
      />
      <LayersPanel :is-visible="isLayersPanelDropdownVisible" />
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
  </div>
</template>

<style scoped>
.canvas-container {
  overflow: hidden;
  background-color: var(--c-background);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;
}

.edit-mode-wrapper {
  width: 100%;
  height: 100%;
}

.canvas-layout {
  display: grid;
  width: 100%;
  height: 100%;
  grid-template-areas: "canvas";
  grid-template-columns: 1fr;
  grid-template-rows: 1fr;
}

.canvas-layout.rulers-visible {
  grid-template-areas:
    "corner ruler-h"
    "ruler-v canvas";
  grid-template-columns: 30px 1fr;
  grid-template-rows: 30px 1fr;
}

.ruler-corner {
  grid-area: corner;
  background-color: var(--c-surface);
  border-bottom: 1px solid var(--c-border);
  border-right: 1px solid var(--c-border);
}

.ruler-h {
  grid-area: ruler-h;
}

.ruler-v {
  grid-area: ruler-v;
}

.canvas-area-wrapper {
  grid-area: canvas;
  overflow: hidden;
  position: relative;
  background-color: var(--c-background);
}

.preview-mode-wrapper {
  width: 100%;
  height: 100%;
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
  max-height: calc(100vh - var(--top-menu-bar-height) - 128px);
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
</style>
