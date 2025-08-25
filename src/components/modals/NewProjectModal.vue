<script setup>
import { ref } from 'vue';
import { useCanvasStore } from '@/stores/canvasStore';

const props = defineProps({
  isVisible: Boolean,
});

const store = useCanvasStore();
const emit = defineEmits(['close']);

const projectName = ref('Novo Projeto');
const width = ref(1920);
const height = ref(1080);
const unit = ref('px');
const dpi = ref(300);

function handleSubmit() {
  store.createBlankCanvas({
    name: projectName.value,
    width: width.value,
    height: height.value,
    unit: unit.value,
    dpi: dpi.value,
  });
  emit('close');
}
</script>

<template>
  <div v-if="isVisible" class="modal-overlay" @click.self="emit('close')">
    <div class="modal-content">
      <h3 class="modal-title">Criar Novo Projeto</h3>
      <p class="modal-subtitle">Defina as dimensões da sua área de trabalho.</p>

      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label for="project-name">Nome do Projeto</label>
          <input id="project-name" type="text" v-model="projectName" />
        </div>

        <div class="dimension-grid">
          <div class="form-group">
            <label for="width">Largura</label>
            <input id="width" type="number" v-model="width" min="1" />
          </div>
          <div class="form-group">
            <label for="height">Altura</label>
            <input id="height" type="number" v-model="height" min="1" />
          </div>
          <div class="form-group">
            <label for="unit">Unidade</label>
            <select id="unit" v-model="unit">
              <option value="px">Pixels (px)</option>
              <option value="cm">Centímetros (cm)</option>
              <option value="in">Polegadas (in)</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label for="dpi">Resolução (DPI)</label>
          <input id="dpi" type="number" v-model="dpi" min="72" />
          <p class="dpi-info">Use 72 para web e 300 para impressão de alta qualidade.</p>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="emit('close')">Cancelar</button>
          <button type="submit" class="btn btn-primary">Criar Projeto</button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0; left: 0;
  width: 100vw; height: 100vh;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  z-index: 2000;

  /* CORREÇÃO PARA TELAS PEQUENAS */
  align-items: flex-start; /* Alinha no topo */
  overflow-y: auto; /* Permite rolar a tela inteira */
  padding: var(--spacing-5); /* Adiciona um respiro */
}
.modal-content {
  background: var(--c-surface);
  padding: var(--spacing-6);
  border-radius: var(--radius-lg);
  width: 100%;
  max-width: 450px;
  text-align: left;
  margin-top: auto; /* Ajuda a centralizar verticalmente se houver espaço */
  margin-bottom: auto; /* Ajuda a centralizar verticalmente se houver espaço */
}
.modal-title {
  font-size: 1.5rem;
  font-weight: var(--fw-bold);
  margin-bottom: var(--spacing-1);
}
.modal-subtitle {
  color: var(--c-text-secondary);
  margin-bottom: var(--spacing-5);
}
form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}
.form-group {
  display: flex;
  flex-direction: column;
}
.form-group label {
  margin-bottom: var(--spacing-2);
  font-weight: var(--fw-medium);
  font-size: var(--fs-sm);
}
.form-group input, .form-group select {
  width: 100%;
  padding: var(--spacing-2) var(--spacing-3);
  border-radius: var(--radius-md);
  border: 1px solid var(--c-border);
  background-color: var(--c-surface-dark);
}
.dimension-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 100px;
  gap: var(--spacing-3);
}
.dpi-info {
  font-size: var(--fs-xs);
  color: var(--c-text-tertiary);
  margin-top: var(--spacing-2);
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-3);
  margin-top: var(--spacing-5);
  padding-top: var(--spacing-4);
  border-top: 1px solid var(--c-border);
}
.btn {
  padding: var(--spacing-2) var(--spacing-4);
  border-radius: var(--radius-md);
  font-weight: var(--fw-semibold);
  border: none;
}
.btn-primary { background-color: var(--c-primary); color: var(--c-white); }
.btn-secondary { background-color: var(--c-surface-dark); color: var(--c-text-primary); }
</style>
