<script setup>
import { ref, watch, computed } from 'vue'
import { useCanvasStore } from '@/stores/canvasStore'
import BrushPreview from '@/components/common/BrushPreview.vue'
import ColorWheelPicker from '@/components/common/ColorWheelPicker.vue'

const props = defineProps({
  mode: {
    type: String,
    default: 'edit',
  },
})

const store = useCanvasStore()
const emit = defineEmits(['show-controls', 'show-upload-modal'])
const toolsGridRef = ref(null)

const activeToolDrawer = ref(null)
const isDrawerPersistent = ref(false)
const activePanel = ref(null)

// --- NOVOS PRESETS DE PINCEL ---
const brushPresets = ref([
  { name: 'Caneta', settings: { size: 5, hardness: 0.9, sensitivity: 0.8, taper: 80, type: 'basic' } },
  { name: 'Marcador', settings: { size: 25, hardness: 1.0, sensitivity: 0.1, taper: 10, type: 'basic' } },
  { name: 'Spray', settings: { size: 50, hardness: 0.2, sensitivity: 0.4, taper: 0, type: 'spray' } },
  { name: 'Pincel Caligráfico', settings: { size: 15, hardness: 1.0, sensitivity: 1.0, taper: 90, type: 'basic' } },
  { name: 'Pincel Chato', settings: { size: 40, hardness: 0.8, sensitivity: 0.2, taper: 5, type: 'basic' } },
  { name: 'Airbrush', settings: { size: 70, hardness: 0.1, sensitivity: 0.3, taper: 0, type: 'spray' } },
])

// --- PALETA DE CORES AGORA É REATIVA ---
const palette = ref([
  '#000000', '#ffffff', '#ff3b30', '#ff9500',
  '#ffcc00', '#34c759', '#00c7be', '#30b0c7',
  '#32ade6', '#007aff', '#5856d6', '#af52de'
])
const draggedColor = ref(null);

function applyBrushPreset(preset) {
  Object.keys(preset.settings).forEach(key => {
    store.setBrushOption(key, preset.settings[key]);
  });
  activePanel.value = null;
}

const editTools = [
  { id: 'move', name: 'Mover (V)', icon: 'M10 4H4v6M20 14h-6v6M14 10l7-7-7 7M4 20l7-7-7 7', requiresLayer: true, },
  { id: 'direct-select', name: 'Seleção Direta (A)', icon: 'M14.5 10.5 19 6l-3.5-3.5-8 8L3 15l4 4 7.5-7.5z', requiresLayer: true, },
  { id: 'zoom-workspace', name: 'Zoom do Workspace (Z)', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z', requiresLayer: false, },
  { type: 'divider' },
  { id: 'brush', name: 'Pincel (B)', icon: 'M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4z', requiresLayer: true, },
  { id: 'color', name: 'Cor', icon: 'M12 2.69l5.66 5.66a8 8 0 11-11.31 0z', isColorPicker: true, },
  // --- NOVAS FORMAS GEOMÉTRICAS ---
  {
    id: 'shapes-group',
    name: 'Formas',
    icon: 'M12 2.5l-7.5 7.5 7.5 7.5 7.5-7.5-7.5-7.5z',
    isGroup: true,
    children: [
      { id: 'shape-rectangle', name: 'Retângulo', icon: 'M3 3h18v18H3z' },
      { id: 'shape-circle', name: 'Círculo', icon: 'M12 2a10 10 0 100 20 10 10 0 000-20z' },
      { id: 'shape-rhombus', name: 'Losango', icon: 'M12 2.5l-7.5 7.5 7.5 7.5 7.5-7.5-7.5-7.5z' },
      { id: 'shape-star', name: 'Estrela', icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' },
    ]
  },
  { id: 'eraser', name: 'Borracha (E)', icon: 'M20 20H4a2 2 0 01-2-2V6a2 2 0 012-2h16a2 2 0 012 2v12a2 2 0 01-2 2zM18 12H6', requiresLayer: true, },
  { type: 'divider' },
  { id: 'magic-wand', name: 'Varinha Mágica (W)', icon: 'M9.5 2.5l2 4 4 2-4 2-2 4-2-4-4-2 4-2 2-4zM2 13l2 4 4 2-4 2-2 4-2-4-4-2 4-2 2-4z', requiresLayer: true, },
  {
    id: 'lasso-group',
    name: 'Ferramentas de Laço',
    icon: 'M3 8l6-5 6 5v8l-6 5-6-5z',
    isGroup: true,
    children: [
      { id: 'rect-select', name: 'Laço Retangular (M)', icon: 'M3 3h18v18H3z', requiresLayer: false },
      { id: 'lasso-select', name: 'Laço Poligonal (L)', icon: 'M3 8l6-5 6 5v8l-6 5-6-5z', requiresLayer: true },
    ],
  },
  { id: 'upload', name: 'Carregar Ficheiro', icon: 'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12', requiresLayer: false, },
]

const tools = computed(() => props.mode === 'preview' ? [] : editTools)

function togglePanel(panelName) {
  if (activePanel.value === panelName) {
    activePanel.value = null;
  } else {
    activePanel.value = panelName;
    if (panelName === 'brush') {
        store.setActiveTool('brush');
    }
  }
}

function handleToolClick(tool, event) {
  if (tool.id !== 'color') {
    activePanel.value = null;
  }

  if (tool.id === 'zoom-workspace') { togglePanel('zoom'); return; }
  if (tool.id === 'brush') { togglePanel('brush'); return; }
  if (tool.id === 'color') { togglePanel('color'); return; }

  if (tool.id.startsWith('shape-')) {
    const shapeType = tool.id.split('-')[1];
    store.setActiveShapeTool(shapeType);
    closeDrawer();
    return;
  }

  if (['bucket', 'eraser', 'magic-wand', 'move', 'direct-select'].includes(tool.id)) {
     if (tool.requiresLayer && !store.selectedLayer) {
        const targetLayer = store.layers.find((l) => l.type === 'pattern') || store.mockupLayer
        if (targetLayer) store.selectLayer(targetLayer.id)
        else return
    }
    store.setActiveTool(tool.id);
    return;
  }

  if (tool.isGroup) {
    const firstChild = tool.children?.[0];
    if (firstChild) {
      if (tool.children.some(c => c.id === store.activeTool)) {
         if (activeToolDrawer.value === tool.id) {
            closeDrawer();
         } else {
            activeToolDrawer.value = tool.id;
            isDrawerPersistent.value = true;
         }
      } else {
        if (tool.id !== 'shapes-group') {
            store.setActiveTool(firstChild.id);
        }
        activeToolDrawer.value = tool.id;
        isDrawerPersistent.value = true;
      }
    }
    return;
  }

  if (tool.id === 'upload') {
    emit('show-upload-modal');
  } else {
    store.setActiveTool(tool.id)
  }

  if (activeToolDrawer.value) {
    isDrawerPersistent.value = true
  }
}

function handleColorSelect(color) {
    store.setPrimaryColor(color);
}

function handleEyedropperClick() {
    store.setActiveTool('eyedropper');
    activePanel.value = null;
}

// --- LÓGICA DE ARRASTAR E SOLTAR COR ---
function handleDragStartColor(event) {
  draggedColor.value = store.primaryColor;
  event.dataTransfer.effectAllowed = 'copy';
  event.dataTransfer.setData('text/plain', store.primaryColor);
}

function handleDropOnPalette(event, index) {
  event.preventDefault();
  const color = event.dataTransfer.getData('text/plain');
  if (color && /^#[0-9a-f]{6}$/i.test(color)) {
    palette.value[index] = color;
  }
  draggedColor.value = null;
}

// --- Funções de mouse e fechar drawer (sem alterações) ---
function handleMouseEnter(tool) { if (tool.isGroup && !isDrawerPersistent.value) { activeToolDrawer.value = tool.id } }
function handleMouseLeave() { if (!isDrawerPersistent.value) { activeToolDrawer.value = null } }
function handleOptionClick(option) { option.action(); closeDrawer(); }
function closeDrawer(keepZoomSlider = false) { activeToolDrawer.value = null; isDrawerPersistent.value = false; }
defineExpose({ closeDrawer })

watch(() => store.activeTool, (activeToolId) => { if (activeToolId !== 'brush') { if (activePanel.value === 'brush') activePanel.value = null; } },)
function getActiveIconForGroup(group) { const activeChild = group.children?.find((child) => store.activeTool === child.id); return activeChild ? activeChild.icon : group.icon }
</script>

<template>
  <aside class="tools-sidebar" @mouseleave="handleMouseLeave">
    <div class="tools-grid" ref="toolsGridRef">
      <template v-for="(tool, index) in tools" :key="tool.id || `divider-${index}`">
        <div v-if="tool.type === 'divider'" class="tool-divider"></div>
        <div v-else class="tool-wrapper" @mouseenter="handleMouseEnter(tool)">
          <button
            class="tool-button"
            :class="{ active: store.activeTool === tool.id || (tool.isGroup && tool.children && tool.children.some((c) => c.id === store.activeTool)) || (tool.id === 'shapes-group' && store.activeTool === 'shape-draw') || (activePanel === 'brush' && tool.id === 'brush') || (activePanel === 'color' && tool.id === 'color') }"
            :style="tool.isColorPicker ? { color: store.primaryColor } : {}"
            @click="handleToolClick(tool, $event)"
            :data-tooltip="tool.name"
            :data-tool-id="tool.id"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" :fill="tool.isColorPicker ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path :d="tool.isGroup ? getActiveIconForGroup(tool) : tool.icon"></path>
            </svg>
          </button>

          <transition name="panel-fade">
            <div v-if="tool.id === 'color' && activePanel === 'color'" class="tool-panel color-panel">
              <div class="color-picker-wrapper">
                <div class="color-selection-header">
                  <div
                    class="color-swatch"
                    :style="{ backgroundColor: store.primaryColor }"
                    draggable="true"
                    @dragstart="handleDragStartColor"
                  ></div>
                  <div class="color-info">
                    <h5 class="section-title">Cor</h5>
                    <span>{{ store.primaryColor }}</span>
                  </div>
                  <button class="icon-button" @click="handleEyedropperClick()" :class="{ active: store.activeTool === 'eyedropper' }" title="Conta-gotas (I)">
                    <svg viewBox="0 0 24 24"><path d="m13 2-9 9 4 4 9-9-4-4Z" /><path d="m4 13 8 8" /></svg>
                  </button>
                </div>
                <ColorWheelPicker @color-selected="handleColorSelect" />
              </div>
              <div class="palette-wrapper">
                 <h5 class="section-title">Paleta</h5>
                <div class="palette-grid">
                  <div
                    v-for="(color, index) in palette"
                    :key="`${color}-${index}`"
                    class="palette-swatch"
                    :style="{ backgroundColor: color }"
                    @click="handleColorSelect(color)"
                    @dragover.prevent
                    @drop="handleDropOnPalette($event, index)"
                  ></div>
                </div>
              </div>
            </div>
          </transition>

          <transition name="panel-fade">
            <div v-if="tool.id === 'brush' && activePanel === 'brush'" class="tool-panel brush-panel">
              <div class="panel-section sliders-section">
                <h5 class="section-title">Opções do Pincel</h5>
                <div class="control-group">
                  <label>Tamanho: {{ store.brush.size.toFixed(0) }} px</label>
                  <input type="range" min="1" max="500" v-model.number="store.brush.size" class="slider"/>
                </div>
                <div class="control-group">
                  <label>Opacidade: {{ (store.brush.opacity * 100).toFixed(0) }}%</label>
                  <input type="range" min="0" max="1" step="0.01" v-model.number="store.brush.opacity" class="slider"/>
                </div>
                <div class="control-group">
                  <label>Afilamento: {{ (store.brush.taper).toFixed(0) }}%</label>
                  <input type="range" min="0" max="95" step="1" v-model.number="store.brush.taper" class="slider"/>
                </div>
              </div>
              <div class="panel-section presets-section">
                <div class="divider"></div>
                <h5 class="section-title">Pré-definições</h5>
                <div class="preset-list">
                  <div v-for="p in brushPresets" :key="p.name" @click="applyBrushPreset(p)" :title="p.name" class="preset-item">
                    <BrushPreview
                        :size="p.settings.size"
                        :hardness="p.settings.hardness"
                        :sensitivity="p.settings.sensitivity"
                        :taper="p.settings.taper"
                     />
                    <span class="preset-name">{{ p.name }}</span>
                  </div>
                </div>
              </div>
            </div>
          </transition>

          <div v-if="tool.isGroup && activeToolDrawer === tool.id" class="tool-drawer">
            <template v-if="tool.id === 'shapes-group'">
                <button v-for="child in tool.children" :key="child.id" class="drawer-item" :class="{ active: store.workspace.shapeDrawing.type === child.id.split('-')[1] && store.activeTool === 'shape-draw' }" @click="handleToolClick(child, $event)">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path :d="child.icon"></path></svg>
                    <span>{{ child.name }}</span>
                </button>
            </template>
            <template v-else-if="tool.id === 'lasso-group'">
                <button v-for="child in tool.children" :key="child.id" class="drawer-item" :class="{ active: store.activeTool === child.id }" @click="handleToolClick(child, $event)">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path :d="child.icon"></path></svg>
                    <span>{{ child.name }}</span>
                </button>
            </template>
          </div>
          <div v-if="tool.id === 'zoom-workspace' && activePanel === 'zoom'" class="tool-drawer zoom-slider-panel">
              <div class="zoom-slider-container">
                  <input type="range" min="10" max="1000" v-model="workspaceZoomLevel" class="zoom-slider" />
                  <span>{{ workspaceZoomLevel.toFixed(0) }}%</span>
              </div>
          </div>
        </div>
      </template>
    </div>
    </aside>
</template>

<style scoped>
/* Estilos gerais da barra e botões (mantidos) */
.tools-sidebar { position: fixed; bottom: var(--spacing-4); left: 50%; transform: translateX(-50%); background-color: var(--c-surface); border: 1px solid var(--c-border); border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); padding: var(--spacing-2); display: flex; align-items: center; z-index: 210; }
.tools-grid { display: flex; align-items: center; gap: var(--spacing-1); }
.tool-wrapper { position: relative; }
.tool-divider { width: 1px; height: 24px; background-color: var(--c-border); margin: 0 var(--spacing-2); }
.tool-button { position: relative; width: 44px; height: 44px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; color: var(--c-text-secondary); transition: var(--transition-fast); background: none; border: none; cursor: pointer; }
.tool-button:hover:not(.disabled) { background-color: var(--c-surface-dark); color: var(--c-text-primary); }
.tool-button.active { background-color: var(--c-primary); color: var(--c-white); }

/* Painéis flutuantes */
.tool-panel { position: absolute; bottom: calc(100% + 12px); left: 50%; transform: translateX(-50%); background-color: var(--c-surface); border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); border: 1px solid var(--c-border); z-index: 200; }
.panel-fade-enter-active, .panel-fade-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.panel-fade-enter-from, .panel-fade-leave-to { opacity: 0; transform: translate(-50%, 10px); }

/* --- NOVO LAYOUT DO PAINEL DE CORES --- */
.color-panel {
    display: flex;
    gap: var(--spacing-4);
    width: 420px;
    padding: var(--spacing-3);
}
.color-picker-wrapper {
    flex: 1;
    display: flex;
    flex-direction: column;
}
.palette-wrapper {
    flex-basis: 140px;
    border-left: 1px solid var(--c-border);
    padding-left: var(--spacing-4);
}
.color-selection-header { display: flex; align-items: center; gap: var(--spacing-3); margin-bottom: var(--spacing-3); }
.color-swatch { width: 40px; height: 40px; border-radius: 50%; border: 3px solid var(--c-white); box-shadow: var(--shadow-sm); cursor: grab; flex-shrink: 0; }
.color-info { display: flex; flex-direction: column; gap: 2px; flex-grow: 1;}
.color-info .section-title { margin-bottom: 0; }
.color-info span { font-size: var(--fs-sm); font-family: monospace;}
.icon-button { background: none; border: none; cursor: pointer; color: var(--c-text-secondary); padding: var(--spacing-1); border-radius: var(--radius-sm); }
.icon-button:hover, .icon-button.active { background-color: var(--c-surface-dark); color: var(--c-text-primary); }
.icon-button svg { width: 20px; height: 20px; stroke: currentColor; fill: none; stroke-width: 2; }

.palette-wrapper .section-title { margin-bottom: var(--spacing-3); }
.palette-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--spacing-2); }
.palette-swatch { width: 100%; aspect-ratio: 1/1; border-radius: var(--radius-sm); cursor: pointer; border: 1px solid var(--c-border); transition: transform 0.1s ease; }
.palette-swatch:hover { transform: scale(1.1); }

/* Estilos do painel de pincel (brush-panel) */
.brush-panel { width: 320px; max-height: 400px; overflow-y: auto; }
.brush-panel .panel-section { padding: var(--spacing-3); display: flex; flex-direction: column; gap: var(--spacing-3); }
.section-title { font-size: var(--fs-xs); font-weight: var(--fw-bold); color: var(--c-text-secondary); text-transform: uppercase; margin: 0; }
.control-group { display: flex; flex-direction: column; gap: var(--spacing-2); }
.control-group label { font-size: var(--fs-sm); color: var(--c-text-primary); font-weight: var(--fw-medium); }
.slider { width: 100%; accent-color: var(--c-primary); }
.presets-section .divider { height: 1px; background-color: var(--c-border); margin: var(--spacing-2) 0; }
.preset-list { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--spacing-2); }
.preset-item { display: flex; align-items: center; gap: var(--spacing-2); padding: var(--spacing-2); border-radius: var(--radius-md); cursor: pointer; text-align: left; transition: background-color 0.1s ease; }
.preset-item:hover { background-color: var(--c-surface-dark); }
.preset-name { font-size: var(--fs-xs); white-space: nowrap; }

/* Estilos dos drawers (sem alterações) */
.tool-drawer { position: absolute; bottom: calc(100% + 12px); left: 50%; transform: translateX(-50%); background-color: var(--c-surface); border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); border: 1px solid var(--c-border); padding: var(--spacing-2); min-width: 180px; z-index: 200; display: flex; flex-direction: column; }
.drawer-item { display: flex; align-items: center; gap: var(--spacing-3); padding: var(--spacing-2) var(--spacing-3); cursor: pointer; font-size: var(--fs-sm); white-space: nowrap; border-radius: var(--radius-md); transition: background-color 0.1s ease-in-out; background: none; border: none; color: var(--c-text-primary); text-align: left; }
.drawer-item:hover { background-color: var(--c-primary); color: var(--c-white); }
.drawer-item.active { background-color: var(--c-primary-soft); color: var(--c-primary); }
.drawer-item svg { width: 18px; height: 18px; stroke: currentColor; fill: none; stroke-width: 2; }
.zoom-slider-panel { position: absolute; bottom: calc(100% + 12px); left: 50%; transform: translateX(-50%); background-color: var(--c-surface); border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); border: 1px solid var(--c-border); width: 280px; padding: var(--spacing-3); z-index: 200; display: flex; align-items: center; gap: var(--spacing-2); }
</style>
