<script setup>
import { ref, watch, computed } from 'vue'
import { useCanvasStore } from '@/stores/canvasStore'

const store = useCanvasStore()

const layer = computed(() => store.selectedLayer)

const currentUnit = ref('cm')
const inputWidth = ref(0)
const inputHeight = ref(0)
const keepAspectRatio = ref(true)

const units = {
  px: 1,
  cm: 2.54,
  in: 1,
}

function convertToPx(value, unit) {
  const dpi = layer.value?.metadata?.dpi || 96
  if (unit === 'cm') return (value / units.cm) * dpi
  if (unit === 'in') return value * dpi
  return value // px
}

function convertFromPx(value, unit) {
  const dpi = layer.value?.metadata?.dpi || 96
  if (unit === 'cm') return (value / dpi) * units.cm
  if (unit === 'in') return value / dpi
  return value // px
}

watch(
  () => store.selectedLayer,
  (newLayer) => {
    if (newLayer) {
      updateInputs()
    }
  },
  { immediate: true },
)

watch(currentUnit, () => {
  updateInputs()
})

function updateInputs() {
  if (!layer.value) return
  const widthPx = layer.value.metadata.originalWidth * layer.value.scale
  const heightPx = layer.value.metadata.originalHeight * layer.value.scale
  inputWidth.value = convertFromPx(widthPx, currentUnit.value).toFixed(2)
  inputHeight.value = convertFromPx(heightPx, currentUnit.value).toFixed(2)
}

function handleWidthInput() {
  if (!keepAspectRatio.value || !layer.value) return
  const aspectRatio = layer.value.metadata.originalHeight / layer.value.metadata.originalWidth
  inputHeight.value = (inputWidth.value * aspectRatio).toFixed(2)
}

function handleHeightInput() {
  if (!keepAspectRatio.value || !layer.value) return
  const aspectRatio = layer.value.metadata.originalWidth / layer.value.metadata.originalHeight
  inputWidth.value = (inputHeight.value * aspectRatio).toFixed(2)
}

// --- LÓGICA DE APLICAÇÃO ATUALIZADA ---
function applyResize() {
  if (!layer.value) return

  const newWidthPx = convertToPx(parseFloat(inputWidth.value), currentUnit.value)
  const newHeightPx = convertToPx(parseFloat(inputHeight.value), currentUnit.value)

  // Verifica se a camada atual é o mockup principal
  if (layer.value.id === store.mockupLayer?.id) {
    store.resizeMockup(newWidthPx, newHeightPx)
  } else {
    // Para outras camadas (patterns, etc.), apenas atualiza a escala
    const newScale = newWidthPx / layer.value.metadata.originalWidth
    store.updateLayerProperties(layer.value.id, { scale: newScale })
  }

  store.showResizeModal(false)
}
</script>

<template>
  <div v-if="store.selectedLayer" class="resize-modal">
    <h4>Redimensionar Camada</h4>
    <div class="input-grid">
      <div class="input-group">
        <label>Largura</label>
        <input type="number" v-model="inputWidth" @input="handleWidthInput" />
      </div>
      <div class="input-group">
        <label>Altura</label>
        <input type="number" v-model="inputHeight" @input="handleHeightInput" />
      </div>
      <div class="unit-selector">
        <select v-model="currentUnit">
          <option value="cm">cm</option>
          <option value="px">px</option>
          <option value="in">in</option>
        </select>
      </div>
    </div>
    <div class="aspect-ratio">
      <input type="checkbox" v-model="keepAspectRatio" id="aspect-ratio-check" />
      <label for="aspect-ratio-check">Manter proporções</label>
    </div>
    <button @click="applyResize" class="btn-apply">Aplicar</button>
  </div>
</template>

<style scoped>
.resize-modal {
  position: absolute;
  bottom: 20px;
  right: 20px;
  background-color: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-4);
  box-shadow: var(--shadow-lg);
  z-index: 300;
  width: 280px;
}
h4 {
  margin-top: 0;
  margin-bottom: var(--spacing-4);
  font-weight: var(--fw-semibold);
}
.input-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 60px;
  gap: var(--spacing-3);
  align-items: flex-end;
}
.input-group label {
  font-size: var(--fs-xs);
  font-weight: var(--fw-medium);
  color: var(--c-text-secondary);
  display: block;
  margin-bottom: var(--spacing-1);
}
input[type='number'],
select {
  width: 100%;
  padding: var(--spacing-2);
  border-radius: var(--radius-md);
  border: 1px solid var(--c-border);
  background-color: var(--c-surface-dark);
  font-family: inherit;
}
.aspect-ratio {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  margin-top: var(--spacing-3);
  font-size: var(--fs-sm);
}
.btn-apply {
  width: 100%;
  padding: var(--spacing-2);
  margin-top: var(--spacing-4);
  background-color: var(--c-primary);
  color: var(--c-white);
  border: none;
  border-radius: var(--radius-md);
  font-weight: var(--fw-semibold);
  cursor: pointer;
}
.btn-apply:hover {
  background-color: var(--c-primary-hover);
}
</style>
