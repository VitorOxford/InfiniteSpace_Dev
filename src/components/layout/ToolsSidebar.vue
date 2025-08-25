<script setup>
import { ref, watch, computed } from 'vue'
import { useCanvasStore } from '@/stores/canvasStore'

const props = defineProps({
  mode: {
    type: String,
    default: 'edit',
  },
})

const store = useCanvasStore()
const emit = defineEmits(['show-controls', 'show-upload-modal']) // <-- CORREÇÃO: Adicionado o novo emit
const toolsGridRef = ref(null)

const activeToolDrawer = ref(null)
const isDrawerPersistent = ref(false)

// ... (seu array 'editTools' e 'previewTools' permanecem os mesmos)
const editTools = [
  {
    id: 'move',
    name: 'Mover (V)',
    icon: 'M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20',
    requiresLayer: true,
  },
  { type: 'divider' },
  // MODIFICADO: Agrupado ferramentas de pintura
  {
    id: 'paint-group',
    name: 'Ferramentas de Pintura',
    icon: 'M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z',
    isGroup: true,
    children: [
       {
        id: 'brush',
        name: 'Pincel (B)',
        icon: 'M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z',
        requiresLayer: true,
      },
      {
        id: 'bucket',
        name: 'Lata de Tinta (G)',
        icon: 'm19 11-8-8-8.6 8.6a2 2 0 0 0 0 2.8l5.2 5.2c.8.8 2 .8 2.8 0L19 11Z M5 2l5 5 M22 9l-8.5 20.5 m-2.5-12 3-3',
        requiresLayer: true,
      },
      {
        id: 'eyedropper',
        name: 'Conta-gotas (I)',
        icon: 'm13 2-9 9 4 4 9-9-4-4Z M4 13l8 8',
        requiresLayer: true,
      }
    ],
  },
  {
    id: 'eraser',
    name: 'Borracha (E)',
    icon: 'M20 20H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2Z M10 12H4M10 16H4M14 12h6M14 16h6',
    requiresLayer: true,
  },
  {
    id: 'magic-wand',
    name: 'Varinha Mágica (W)',
    icon: 'M9.5 2.5l2 4 4 2-4 2-2 4-2-4-4-2 4-2 2-4zM2 13l2 4 4 2-4 2-2 4-2-4-4-2 4-2 2-4z',
    requiresLayer: true,
  },
  {
    id: 'lasso-group',
    name: 'Ferramentas de Laço',
    icon: 'M13.25 2.19a3.78 3.78 0 0 0-4.5 0l-6 4A3.78 3.78 0 0 0 1 9.47v5.06a3.78 3.78 0 0 0 1.75 3.28l6 4a3.78 3.78 0 0 0 4.5 0l6-4a3.78 3.78 0 0 0 1.75-3.28V9.47a3.78 3.78 0 0 0-1.75-3.28l-6-4Z',
    isGroup: true,
    children: [
      {
        id: 'rect-select',
        name: 'Laço Retangular (M)',
        icon: 'M3 3h18v18H3z',
        requiresLayer: false,
      },
      {
        id: 'lasso-select',
        name: 'Laço Poligonal (L)',
        icon: 'M13.25 2.19a3.78 3.78 0 0 0-4.5 0l-6 4A3.78 3.78 0 0 0 1 9.47v5.06a3.78 3.78 0 0 0 1.75 3.28l6 4a3.78 3.78 0 0 0 4.5 0l6-4a3.78 3.78 0 0 0 1.75-3.28V9.47a3.78 3.78 0 0 0-1.75-3.28l-6-4Z',
        requiresLayer: true,
      },
    ],
    variations: [
      { id: 'copy', name: 'Copiar Laço', action: () => store.duplicateSelection() },
      { id: 'cut', name: 'Excluir Laço', action: () => store.cutoutSelection() },
    ],
  },
  { type: 'divider' },
  {
    id: 'upload',
    name: 'Carregar Ficheiro',
    icon: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12',
    requiresLayer: false,
  },
]

const previewTools = computed(() => [
  {
    id: 'toggle-interactive',
    name: store.workspace.previewIsInteractive ? 'Bloquear Edição' : 'Editar Estampa',
    icon: store.workspace.previewIsInteractive
      ? 'M7 7H5a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-2M15 5l-2-2m0 0L8 8m5-5l5 5'
      : 'M17 3a2.85 2.85 0 114 4L7.5 20.5 2 22l1.5-5.5Z',
    requiresLayer: false,
  },
  { type: 'divider' },
  {
    id: 'zoom-preview',
    name: 'Zoom do Preview',
    icon: 'M15 4h5v5M9 20H4v-5M20 9l-7 7-7-7',
    requiresLayer: false,
    previewOnly: false,
  },
  { type: 'divider' },
  {
    id: 'move',
    name: 'Mover Estampa (V)',
    icon: 'M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20',
    requiresLayer: true,
    previewOnly: true,
  },
  {
    id: 'zoom',
    name: 'Zoom Estampa (Z)',
    icon: 'M11 8v6M8 11h6M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z',
    requiresLayer: true,
    previewOnly: true,
  },
  {
    id: 'rotate',
    name: 'Girar Estampa (R)',
    icon: 'M2.5 22v-6h6M21.5 2v6h-6M15.52 6.48a9 9 0 00-12.04 0M2.5 12.5a9 9 0 0019.04-2.5',
    requiresLayer: true,
    previewOnly: true,
  },
  {
    id: 'lasso-select',
    name: 'Laço (L)',
    icon: 'M13.25 2.19a3.78 3.78 0 0 0-4.5 0l-6 4A3.78 3.78 0 0 0 1 9.47v5.06a3.78 3.78 0 0 0 1.75 3.28l6 4a3.78 3.78 0 0 0 4.5 0l6-4a3.78 3.78 0 0 0 1.75-3.28V9.47a3.78 3.78 0 0 0-1.75-3.28l-6-4Z',
    requiresLayer: true,
    previewOnly: true,
  },
])

const tools = computed(() => {
  return props.mode === 'preview' ? previewTools.value : editTools
})


function handleToolClick(tool) {
  if (tool.isGroup) {
    if (activeToolDrawer.value === tool.id && isDrawerPersistent.value) {
      closeDrawer()
    } else {
      activeToolDrawer.value = tool.id
      isDrawerPersistent.value = true
    }
    return
  }

  if (tool.id === 'toggle-interactive') {
    store.togglePreviewInteractivity()
    if (!store.workspace.previewIsInteractive) {
      store.setActiveTool(null)
    } else {
      const patternLayer = store.layers.find((l) => l.type === 'pattern')
      if (patternLayer) {
        store.selectLayer(patternLayer.id)
        store.setActiveTool('move')
      }
    }
    return
  }

  if (tool.requiresLayer && !store.selectedLayer) {
    const targetLayer = store.layers.find((l) => l.type === 'pattern') || store.mockupLayer
    if (targetLayer) store.selectLayer(targetLayer.id)
    else return
  }

  // --- CORREÇÃO: Emite um evento em vez de controlar o modal diretamente ---
  if (tool.id === 'upload') {
    emit('show-upload-modal');
  } else {
    store.setActiveTool(tool.id)
  }

  if (activeToolDrawer.value) {
    isDrawerPersistent.value = true
  }
}

// ... (resto do seu script, como handleMouseEnter, handleMouseLeave, etc. permanecem os mesmos)
function handleMouseEnter(tool) {
  if (tool.isGroup && !isDrawerPersistent.value) {
    activeToolDrawer.value = tool.id
  }
}

function handleMouseLeave() {
  if (!isDrawerPersistent.value) {
    activeToolDrawer.value = null
  }
}

function handleVariationClick(variation) {
  if (!store.isSelectionActive) {
    alert('Primeiro, selecione uma área com uma ferramenta de laço.')
    return
  }
  variation.action()
  closeDrawer()
}

function closeDrawer() {
  activeToolDrawer.value = null
  isDrawerPersistent.value = false
}

defineExpose({ closeDrawer })

watch(
  () => store.activeTool,
  (activeToolId) => {
    const toolButton = toolsGridRef.value?.querySelector(`[data-tool-id="${activeToolId}"]`)
    if (toolButton && ['move', 'zoom', 'rotate', 'zoom-preview'].includes(activeToolId)) {
      const rect = toolButton.getBoundingClientRect()
      emit('show-controls', { top: rect.top, left: rect.right + 12, visible: true })
    } else {
      emit('show-controls', { visible: false })
    }
  },
)

function getActiveIconForGroup(group) {
  const activeChild = group.children.find((child) => store.activeTool === child.id)
  return activeChild ? activeChild.icon : group.icon
}
</script>

<template>
  <aside class="tools-sidebar" @mouseleave="handleMouseLeave">
    <div class="tools-grid" ref="toolsGridRef">
      <template v-for="(tool, index) in tools" :key="tool.id || `divider-${index}`">
        <div v-if="tool.type === 'divider'" class="tool-divider"></div>

        <div v-else class="tool-wrapper" @mouseenter="handleMouseEnter(tool)">
          <button
            class="tool-button"
            :class="{
              active:
                store.activeTool === tool.id ||
                (tool.isGroup && tool.children.some((c) => c.id === store.activeTool)),
              disabled:
                (tool.requiresLayer && store.layers.length === 0) ||
                (tool.previewOnly && !store.workspace.previewIsInteractive),
            }"
            @click="handleToolClick(tool)"
            :data-tooltip="tool.name"
            :data-tool-id="tool.id"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path :d="tool.isGroup ? getActiveIconForGroup(tool) : tool.icon"></path>
            </svg>
          </button>

          <div v-if="tool.isGroup && activeToolDrawer === tool.id" class="tool-drawer">
            <div class="drawer-section">
              <button
                v-for="child in tool.children"
                :key="child.id"
                class="tool-button"
                :class="{
                  active: store.activeTool === child.id,
                  disabled: child.requiresLayer && !store.selectedLayer,
                }"
                @click="handleToolClick(child)"
                :data-tooltip="child.name"
                :data-tool-id="child.id"
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path :d="child.icon"></path>
                </svg>
              </button>
            </div>
            <div v-if="tool.variations" class="tool-divider"></div>
            <div v-if="tool.variations" class="drawer-section variations">
              <button
                v-for="variation in tool.variations"
                :key="variation.id"
                class="variation-button"
                :data-tooltip="variation.name"
                @click="handleVariationClick(variation)"
                :disabled="!store.isSelectionActive"
              >
                {{ variation.name }}
              </button>
            </div>
          </div>
        </div>
      </template>
    </div>
    </aside>
</template>

<style scoped>
/* Seus estilos existentes ... */
.tools-sidebar {
  width: var(--sidebar-width);
  background-color: var(--c-surface);
  border-right: 1px solid var(--c-border);
  padding: var(--spacing-2) 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 210;
}
.tools-grid {
  display: grid;
  gap: var(--spacing-1);
}
.tool-wrapper {
  position: relative;
}
.tool-divider {
  height: 1px;
  background-color: var(--c-border);
  margin: var(--spacing-2) var(--spacing-3);
}
.tool-button {
  position: relative;
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--c-text-secondary);
  transition: var(--transition-fast);
  background: none;
  border: none;
  cursor: pointer;
}
.tool-button:hover:not(.disabled) {
  background-color: var(--c-surface-dark);
  color: var(--c-text-primary);
}
.tool-button.active {
  background-color: var(--c-primary);
  color: var(--c-white);
}

.tool-button.disabled {
  opacity: 0.4;
  cursor: not-allowed;
  pointer-events: none;
}

.tool-button:hover::after,
.variation-button:hover::after {
  content: attr(data-tooltip);
  position: absolute;
  left: calc(100% + 10px);
  top: 50%;
  transform: translateY(-50%);
  background-color: var(--c-text-primary);
  color: var(--c-white);
  padding: var(--spacing-1) var(--spacing-3);
  border-radius: var(--radius-sm);
  font-size: var(--fs-sm);
  font-weight: var(--fw-medium);
  white-space: nowrap;
  box-shadow: var(--shadow-md);
  z-index: 110;
  pointer-events: none;
}

.tool-drawer {
  position: absolute;
  left: 100%;
  top: 0;
  background-color: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  padding: var(--spacing-1);
  display: flex;
  flex-direction: column;
  z-index: 211;
}
.drawer-section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
}
.drawer-section.variations {
  padding-top: var(--spacing-1);
}

.variation-button {
  background: none;
  border: none;
  padding: var(--spacing-2) var(--spacing-3);
  font-size: var(--fs-sm);
  text-align: left;
  border-radius: var(--radius-sm);
  cursor: pointer;
  white-space: nowrap;
  position: relative;
  color: var(--c-text-primary);
}
.variation-button:hover {
  background-color: var(--c-surface-dark);
}
.variation-button:disabled {
  color: var(--c-text-tertiary);
  cursor: not-allowed;
  background-color: transparent;
}
</style>
