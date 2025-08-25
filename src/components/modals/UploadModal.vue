<script setup>
import { useCanvasStore } from '@/stores/canvasStore'
import { ref } from 'vue'

const props = defineProps({
  isVisible: Boolean,
})
// --- CORREÇÃO APLICADA ---
// Removido 'open-new-project-modal' dos emits
const emit = defineEmits(['close'])

const store = useCanvasStore()
const dragOverEstampa = ref(false)
const dragOverMockup = ref(false)

function handleFile(file, type) {
  if (!file || !file.type.startsWith('image/')) {
    alert('Por favor, selecione um ficheiro de imagem.')
    return
  }
  store.addLocalLayer(file, type)
  emit('close')
}

function onDrop(e, type) {
  e.preventDefault()
  dragOverEstampa.value = false
  dragOverMockup.value = false
  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
    handleFile(e.dataTransfer.files[0], type)
  }
}

function onFileSelect(e, type) {
  if (e.target.files && e.target.files[0]) {
    handleFile(e.target.files[0], type)
  }
}
</script>

<template>
  <div v-if="isVisible" class="modal-overlay" @click.self="emit('close')">
    <div class="modal-content">
      <h3 class="modal-title">Carregar Ficheiros</h3>

      <div class="drop-zones">
        <div
          class="drop-zone"
          :class="{ 'drag-over': dragOverEstampa }"
          @click="$refs.estampaInput.click()"
          @dragover.prevent="dragOverEstampa = true"
          @dragleave.prevent="dragOverEstampa = false"
          @drop="onDrop($event, 'pattern')"
        >
          <p>Carregar <strong>Estampa</strong></p>
          <span>Arraste e largue ou clique aqui</span>
          <input
            type="file"
            ref="estampaInput"
            @change="onFileSelect($event, 'pattern')"
            accept="image/*"
            hidden
          />
        </div>
        <div
          class="drop-zone"
          :class="{ 'drag-over': dragOverMockup }"
          @click="$refs.mockupInput.click()"
          @dragover.prevent="dragOverMockup = true"
          @dragleave.prevent="dragOverMockup = false"
          @drop="onDrop($event, 'mockup')"
        >
          <p>Carregar <strong>Mockup</strong></p>
          <span>Arraste e largue ou clique aqui</span>
          <input
            type="file"
            ref="mockupInput"
            @change="onFileSelect($event, 'mockup')"
            accept="image/*"
            hidden
          />
        </div>
      </div>
      <button class="btn-close" @click="emit('close')">Fechar</button>
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
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-content {
  background-color: var(--c-surface);
  padding: var(--spacing-5) var(--spacing-6);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  width: 90%;
  max-width: 600px;
  text-align: center;
}
.modal-title {
  font-size: 1.25rem;
  font-weight: var(--fw-bold);
  margin-bottom: var(--spacing-5);
}
.drop-zones {
  display: flex;
  gap: var(--spacing-5);
  margin-bottom: var(--spacing-5);
}
.drop-zone {
  flex: 1;
  padding: var(--spacing-6) var(--spacing-4);
  border: 2px dashed var(--c-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: var(--transition-fast);
}
.drop-zone:hover {
  border-color: var(--c-primary);
  background-color: var(--c-background);
}
.drop-zone.drag-over {
  border-color: var(--c-primary);
  background-color: #e6f5ff;
}
.drop-zone p {
  font-size: var(--fs-base);
  margin-bottom: var(--spacing-2);
}
.drop-zone span {
  font-size: var(--fs-sm);
  color: var(--c-text-secondary);
}
.btn-close {
  background: none;
  border: 1px solid var(--c-border);
  padding: var(--spacing-2) var(--spacing-4);
  border-radius: var(--radius-md);
  font-weight: var(--fw-semibold);
}
.btn-close:hover {
  background-color: var(--c-surface-dark);
}
</style>
