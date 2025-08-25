<script setup>
import { computed, ref, watch } from 'vue'
import { useImageAdjustmentsStore } from '@/stores/imageAdjustmentsStore'
import { useCanvasStore } from '@/stores/canvasStore'

const adjustmentsStore = useImageAdjustmentsStore()
const canvasStore = useCanvasStore()

const localAdjustments = ref({})

const targetLayer = computed(() => {
  return canvasStore.layers.find((l) => l.id === adjustmentsStore.targetLayerId)
})

const previewStyle = computed(() => {
  if (!localAdjustments.value) return {}
  const adj = localAdjustments.value
  const filters = [
    `grayscale(${adj.grayscale || 0}%)`,
    `sepia(${adj.sepia || 0}%)`,
    `saturate(${adj.saturate || 100}%)`,
    `contrast(${adj.contrast || 100}%)`,
    `brightness(${adj.brightness || 100}%)`,
    `invert(${adj.invert || 0}%)`,
  ].join(' ')
  return { filter: filters }
})

// Sincroniza os ajustes locais com a store quando o modal abre
watch(
  () => adjustmentsStore.isModalVisible,
  (isVisible) => {
    if (isVisible) {
      localAdjustments.value = { ...adjustmentsStore.tempAdjustments }
    }
  },
  { immediate: true },
)

// Envia as atualizações para a store para o preview em tempo real no canvas principal
watch(
  localAdjustments,
  (newVal) => {
    adjustmentsStore.updatePreview(newVal)
  },
  { deep: true },
)

function resetAdjustments() {
  localAdjustments.value = {
    grayscale: 0,
    sepia: 0,
    saturate: 100,
    contrast: 100,
    brightness: 100,
    invert: 0,
  }
}
</script>

<template>
  <div
    v-if="adjustmentsStore.isModalVisible && targetLayer"
    class="modal-overlay"
    @mousedown.self="adjustmentsStore.closeModal()"
  >
    <div class="modal-content">
      <header class="modal-header">
        <h3>Ajustes de Imagem</h3>
        <button class="close-btn" @click="adjustmentsStore.closeModal()">&times;</button>
      </header>
      <div class="main-layout">
        <div class="controls-panel">
          <div class="control-group">
            <label>Brilho: {{ localAdjustments.brightness }}%</label>
            <input type="range" min="0" max="200" v-model.number="localAdjustments.brightness" />
          </div>
          <div class="control-group">
            <label>Contraste: {{ localAdjustments.contrast }}%</label>
            <input type="range" min="0" max="200" v-model.number="localAdjustments.contrast" />
          </div>
          <div class="control-group">
            <label>Saturação: {{ localAdjustments.saturate }}%</label>
            <input type="range" min="0" max="200" v-model.number="localAdjustments.saturate" />
          </div>
          <div class="control-group">
            <label>Preto e Branco: {{ localAdjustments.grayscale }}%</label>
            <input type="range" min="0" max="100" v-model.number="localAdjustments.grayscale" />
          </div>
          <div class="control-group">
            <label>Sépia: {{ localAdjustments.sepia }}%</label>
            <input type="range" min="0" max="100" v-model.number="localAdjustments.sepia" />
          </div>
          <div class="control-group">
            <label>Inverter: {{ localAdjustments.invert }}%</label>
            <input type="range" min="0" max="100" v-model.number="localAdjustments.invert" />
          </div>
          <button @click="resetAdjustments" class="btn-reset">Redefinir Ajustes</button>
        </div>
        <div class="preview-panel">
          <div class="image-container">
            <img :src="targetLayer.imageUrl.split('?')[0]" :style="previewStyle" alt="Preview" />
          </div>
        </div>
      </div>
      <footer class="modal-footer">
        <button @click="adjustmentsStore.closeModal()" class="btn btn-secondary">Cancelar</button>
        <button @click="adjustmentsStore.applyAdjustments()" class="btn btn-primary">
          Aplicar
        </button>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(23, 26, 31, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}
.modal-content {
  background-color: var(--c-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  width: 90%;
  max-width: 1000px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-4);
  border-bottom: 1px solid var(--c-border);
  flex-shrink: 0;
}
.modal-header h3 {
  font-size: 1.25rem;
  font-weight: var(--fw-semibold);
  margin: 0;
}
.close-btn {
  font-size: 1.5rem;
  font-weight: 300;
  line-height: 1;
  color: var(--c-text-secondary);
}
.main-layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: var(--spacing-5);
  padding: var(--spacing-5);
  overflow-y: auto;
}
.controls-panel {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
  border-right: 1px solid var(--c-border);
  padding-right: var(--spacing-5);
}
.control-group {
  display: flex;
  flex-direction: column;
}
.control-group label {
  font-size: var(--fs-sm);
  color: var(--c-text-secondary);
  margin-bottom: var(--spacing-2);
}
input[type='range'] {
  width: 100%;
  accent-color: var(--c-primary);
}
.preview-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--c-background);
  border-radius: var(--radius-md);
  min-height: 300px;
  overflow: hidden;
}
.image-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-4);
  max-height: 55vh;
}
.image-container img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  transition: filter 0.1s ease-in-out;
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-3);
  padding: var(--spacing-4);
  border-top: 1px solid var(--c-border);
  flex-shrink: 0;
  background-color: var(--c-surface-dark);
  border-bottom-left-radius: var(--radius-lg);
  border-bottom-right-radius: var(--radius-lg);
}
.btn-reset {
  margin-top: auto;
  padding: var(--spacing-2);
  border-radius: var(--radius-md);
  border: 1px solid var(--c-border);
  font-weight: var(--fw-medium);
  background-color: var(--c-surface);
}
.btn-reset:hover {
  background-color: var(--c-border);
}
.btn-primary {
  background-color: var(--c-primary);
  color: var(--c-white);
  border: 1px solid var(--c-primary);
  padding: var(--spacing-2) var(--spacing-4);
  border-radius: var(--radius-md);
  font-weight: var(--fw-semibold);
}
.btn-primary:hover {
  background-color: var(--c-primary-hover);
}
.btn-secondary {
  background-color: var(--c-surface);
  color: var(--c-text-primary);
  border: 1px solid var(--c-border);
  padding: var(--spacing-2) var(--spacing-4);
  border-radius: var(--radius-md);
  font-weight: var(--fw-semibold);
}
.btn-secondary:hover {
  background-color: var(--c-surface-dark);
}
</style>
