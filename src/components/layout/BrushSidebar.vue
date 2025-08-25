<script setup>
import { computed, ref } from 'vue'
import { useCanvasStore } from '@/stores/canvasStore'
import BrushPreview from '@/components/common/BrushPreview.vue'
import ColorWheelPicker from '@/components/common/ColorWheelPicker.vue'
import FloatingPanel from '@/components/common/FloatingPanel.vue'

const store = useCanvasStore()
const showColorPicker = ref(false)
const activeOptionsTab = ref('brush') // Controla a aba de opções visível

const presets = [
  { name: 'Pincel Duro', settings: { size: 5, hardness: 0.95 } },
  { name: 'Pincel Suave', settings: { size: 40, hardness: 0.2 } },
  { name: 'Aerógrafo', settings: { size: 80, hardness: 0.1 } },
  { name: 'Marcador', settings: { size: 15, hardness: 1.0 } },
]

const palette = [
  '#000000', '#4c4c4c', '#999999', '#ffffff',
  '#990000', '#ff0000', '#ff9900', '#ffff00',
  '#009900', '#00ff00', '#00ffff', '#0000ff',
  '#9900ff', '#ff00ff', '#ffccff', '#cc66ff'
]

function applyPreset(preset) {
  store.setBrushOption('size', preset.settings.size)
  store.setBrushOption('hardness', preset.settings.hardness)
}

function selectToolAndTab(tool, tab) {
    store.setActiveTool(tool);
    activeOptionsTab.value = tab;
}
</script>

<template>
  <div>
    <FloatingPanel panel-id="toolOptions" title="Opções da Ferramenta">
        <div class="panel-content">
            <div class="tool-tabs">
                <button :class="{active: activeOptionsTab === 'brush'}" @click="selectToolAndTab('brush', 'brush')" title="Pincel (B)">
                     <svg viewBox="0 0 24 24"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>
                </button>
                <button :class="{active: activeOptionsTab === 'eraser'}" @click="selectToolAndTab('eraser', 'eraser')" title="Borracha (E)">
                    <svg viewBox="0 0 24 24"><path d="M20 20H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2Z M10 12H4M10 16H4M14 12h6M14 16h6"></path></svg>
                </button>
                 <button :class="{active: activeOptionsTab === 'bucket'}" @click="selectToolAndTab('bucket', 'bucket')" title="Lata de Tinta (G)">
                    <svg viewBox="0 0 24 24"><path d="m19 11-8-8-8.6 8.6a2 2 0 0 0 0 2.8l5.2 5.2c.8.8 2 .8 2.8 0L19 11Z M5 2l5 5 M22 9l-8.5 20.5 m-2.5-12 3-3"></path></svg>
                </button>
                 <button :class="{active: activeOptionsTab === 'magic-wand'}" @click="selectToolAndTab('magic-wand', 'magic-wand')" title="Varinha Mágica (W)">
                   <svg viewBox="0 0 24 24"><path d="M9.5 2.5l2 4 4 2-4 2-2 4-2-4-4-2 4-2 2-4zM2 13l2 4 4 2-4 2-2 4-2-4-4-2 4-2 2-4z"></path></svg>
                </button>
            </div>

            <div v-if="activeOptionsTab === 'brush' || activeOptionsTab === 'bucket'" class="panel-section">
                <div class="color-selection-header">
                <div
                    class="color-swatch"
                    :style="{ backgroundColor: store.primaryColor }"
                    @click="showColorPicker = !showColorPicker"
                ></div>
                <div class="color-info">
                    <h5 class="section-title">Cor</h5>
                    <span>{{ store.primaryColor }}</span>
                </div>
                <button class="icon-button" @click="store.setActiveTool('eyedropper')" title="Conta-gotas (I)">
                    <svg viewBox="0 0 24 24"><path d="m13 2-9 9 4 4 9-9-4-4Z" /><path d="m4 13 8 8" /></svg>
                </button>
                </div>
                <div class="palette-grid">
                <div
                    v-for="color in palette"
                    :key="color"
                    class="palette-swatch"
                    :style="{ backgroundColor: color }"
                    @click="store.setPrimaryColor(color)"
                ></div>
                </div>
            </div>

            <div class="divider" v-if="activeOptionsTab === 'brush' || activeOptionsTab === 'bucket'"></div>

            <div class="panel-section">
                <div v-if="activeOptionsTab === 'magic-wand'">
                  <h5 class="section-title">Opções da Varinha Mágica</h5>
                  <div class="control-group">
                      <label>Tolerância: {{ store.workspace.magicWand.tolerance }}</label>
                      <input type="range" min="0" max="255" v-model.number="store.workspace.magicWand.tolerance" class="slider" />
                  </div>
                  <div class="control-group checkbox-group">
                      <input type="checkbox" id="contiguous-check" v-model="store.workspace.magicWand.contiguous" />
                      <label for="contiguous-check">Contíguo</label>
                  </div>
                </div>

                <div v-else-if="activeOptionsTab === 'eraser'">
                  <h5 class="section-title">Opções da Borracha</h5>
                  <div class="control-group">
                      <label>Tamanho: {{ store.eraser.size.toFixed(0) }} px</label>
                      <input type="range" min="1" max="500" v-model.number="store.eraser.size" @input="store.setEraserOption('size', parseFloat($event.target.value))" class="slider"/>
                  </div>
                  <div class="control-group">
                      <label>Intensidade: {{ (store.eraser.opacity * 100).toFixed(0) }}%</label>
                      <input type="range" min="0" max="1" step="0.01" v-model.number="store.eraser.opacity" @input="store.setEraserOption('opacity', parseFloat($event.target.value))" class="slider"/>
                  </div>
                </div>

                <div v-else-if="activeOptionsTab === 'brush' || activeOptionsTab === 'bucket'">
                  <h5 class="section-title">Opções do Pincel</h5>
                  <div class="control-group">
                      <label>Tamanho: {{ store.brush.size.toFixed(0) }} px</label>
                      <input type="range" min="1" max="500" v-model.number="store.brush.size" @input="store.setBrushOption('size', parseFloat($event.target.value))" class="slider"/>
                  </div>
                   <div class="control-group">
                      <label>Opacidade: {{ (store.brush.opacity * 100).toFixed(0) }}%</label>
                      <input type="range" min="0" max="1" step="0.01" v-model.number="store.brush.opacity" @input="store.setBrushOption('opacity', parseFloat($event.target.value))" class="slider"/>
                  </div>
                  <div class="control-group">
                      <label>Dureza: {{ (store.brush.hardness * 100).toFixed(0) }}%</label>
                      <input type="range" min="0" max="1" step="0.01" v-model.number="store.brush.hardness" @input="store.setBrushOption('hardness', parseFloat($event.target.value))" class="slider"/>
                  </div>
                </div>
            </div>

            <div v-if="activeOptionsTab === 'brush'" class="panel-section presets">
                <div class="divider"></div>
                <h5 class="section-title">Pré-definições de Pincel</h5>
                <div class="preset-list">
                    <div v-for="p in presets" :key="p.name" @click="applyPreset(p)" :title="p.name" class="preset-item">
                        <BrushPreview :size="p.settings.size" :hardness="p.settings.hardness" />
                        <span class="preset-name">{{ p.name }}</span>
                    </div>
                </div>
            </div>
        </div>
    </FloatingPanel>
    <ColorWheelPicker v-if="showColorPicker" @close="showColorPicker = false" />
  </div>
</template>

<style scoped>
/* A maior parte dos estilos é herdada do FloatingPanel, aqui estilizamos o conteúdo específico */
.panel-content {
    padding: 0;
    display: flex;
    flex-direction: column;
}
.tool-tabs {
    display: flex;
    background-color: var(--c-surface-dark);
    padding: var(--spacing-2);
    gap: var(--spacing-2);
    flex-shrink: 0;
}
.tool-tabs button {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-2);
    border-radius: var(--radius-md);
    color: var(--c-text-secondary);
}
.tool-tabs button:hover {
    background-color: var(--c-border);
}
.tool-tabs button.active {
    background-color: var(--c-primary);
    color: var(--c-white);
}
.tool-tabs button svg {
    width: 20px;
    height: 20px;
    stroke-width: 2;
    fill: none;
    stroke: currentColor;
}
.panel-section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
  padding: var(--spacing-4);
}
.divider {
  height: 1px;
  background-color: var(--c-border);
  margin: 0;
}
.section-title {
  font-size: var(--fs-xs);
  font-weight: var(--fw-bold);
  color: var(--c-text-secondary);
  text-transform: uppercase;
  margin: 0;
}
.control-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}
.control-group label {
  font-size: var(--fs-sm);
  color: var(--c-text-primary);
  font-weight: var(--fw-medium);
}
.checkbox-group {
    flex-direction: row;
    align-items: center;
    gap: var(--spacing-2);
}
.checkbox-group label {
    margin-bottom: 0;
    cursor: pointer;
}
.slider {
  width: 100%;
  accent-color: var(--c-primary);
}
.color-selection-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
}
.color-swatch {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 4px solid var(--c-white);
  box-shadow: var(--shadow-md);
  cursor: pointer;
  flex-shrink: 0;
}
.color-info {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
  flex-grow: 1;
}
.color-info span {
  font-family: monospace;
  font-weight: var(--fw-semibold);
}
.icon-button {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--c-text-secondary);
  border-radius: var(--radius-md);
  border: 1px solid var(--c-border);
  background-color: var(--c-white);
  flex-shrink: 0;
}
.icon-button:hover {
  background-color: var(--c-surface-dark);
  color: var(--c-primary);
}
.icon-button svg {
  width: 18px;
  height: 18px;
  stroke-width: 2;
  fill: none;
  stroke: currentColor;
}
.palette-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(24px, 1fr));
  gap: var(--spacing-2);
}
.palette-swatch {
  width: 100%;
  aspect-ratio: 1/1;
  border-radius: var(--radius-sm);
  cursor: pointer;
  border: 1px solid var(--c-border);
}
.palette-swatch:hover {
  transform: scale(1.1);
  box-shadow: 0 0 0 2px var(--c-primary);
}
.preset-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
  max-height: 180px;
  overflow-y: auto;
  padding-right: var(--spacing-2);
}
.preset-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-2);
  border-radius: var(--radius-md);
  cursor: pointer;
}
.preset-item:hover {
  background-color: var(--c-surface-dark);
}
.preset-item > div:first-child {
  flex-basis: 60px;
  flex-shrink: 0;
}
.preset-name {
  font-size: var(--fs-sm);
  font-weight: var(--fw-medium);
}
</style>
