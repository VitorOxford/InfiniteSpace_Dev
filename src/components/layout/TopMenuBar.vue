<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useCanvasStore } from '@/stores/canvasStore'
import { useImageAdjustmentsStore } from '@/stores/imageAdjustmentsStore'

const store = useCanvasStore()
const adjustmentsStore = useImageAdjustmentsStore()
const router = useRouter()
const activeMenu = ref(null)

const emit = defineEmits(['open-new-project-modal', 'toggle-layers-panel'])

const isLassoSelectionActive = computed(() => store.workspace.lasso.points.length > 2)
const isLayerSelected = computed(() => !!store.selectedLayerId);

function goToHome() {
  router.push({ name: 'home' });
}

const menus = [
  {
    name: 'Ficheiro',
    items: [
      { name: 'Novo Projeto...', action: () => emit('open-new-project-modal') },
      { type: 'divider' },
      // --- NOVA OPÇÃO DE EXPORTAR ADICIONADA AQUI ---
      { name: 'Exportar Área Desenhada...', action: () => store.exportDrawnArea(), requiresLayer: true },
      { name: 'Exportar Camada Selecionada...', action: () => store.exportLayer(store.selectedLayerId, 'png'), requiresLayer: true }
    ]
  },
  {
    name: 'Editar',
    items: [
      { name: 'Desfazer (Ctrl+Z)', action: () => store.undoLastAction() },
      { type: 'divider' },
      { name: 'Duplicar Camada', action: () => store.duplicateLayer(store.selectedLayerId), requiresLayer: true },
      { type: 'divider' },
      { name: 'Duplicar Seleção', action: () => store.duplicateSelection(store.selectedLayerId), requiresLayer: true, requiresSelection: true },
      { name: 'Recortar Seleção', action: () => store.cutoutSelection(store.selectedLayerId), requiresLayer: true, requiresSelection: true },
    ],
  },
  {
    name: 'Imagem',
    items: [
      { name: 'Ajustes...', action: () => adjustmentsStore.openModal(), requiresLayer: true },
      { type: 'divider' },
      { name: 'Rodar 90° Horário', action: () => store.rotateLayer(90), requiresLayer: true },
      { name: 'Rodar 90° Anti-horário', action: () => store.rotateLayer(-90), requiresLayer: true },
      { type: 'divider' },
      { name: 'Inverter Horizontalmente', action: () => store.flipLayer('horizontal'), requiresLayer: true },
      { name: 'Inverter Verticalmente', action: () => store.flipLayer('vertical'), requiresLayer: true },
    ],
  },
]

function toggleMenu(menuName) {
  activeMenu.value = activeMenu.value === menuName ? null : menuName
}

function handleItemClick(item) {
  if (item.requiresLayer && !store.selectedLayer) {
    alert('Por favor, selecione uma camada para aplicar esta ação.')
    activeMenu.value = null
    return
  }
  if (item.requiresSelection && !isLassoSelectionActive.value) {
    alert('Esta ação requer uma seleção de laço ativa.')
    activeMenu.value = null
    return
  }
  item.action()
  activeMenu.value = null
}
</script>

<template>
  <nav class="top-menu-bar">
    <div class="menu-left">
        <button class="home-button" @click="goToHome" title="Voltar para Início">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
        </button>
        <div class="divider"></div>
        <div v-for="menu in menus" :key="menu.name" class="menu-item">
            <button @click="toggleMenu(menu.name)">{{ menu.name }}</button>
            <ul v-if="activeMenu === menu.name" class="dropdown-menu">
                <li v-for="(item, index) in menu.items" :key="item.name || `divider-${index}`">
                <div v-if="item.type === 'divider'" class="divider-dropdown"></div>
                <a
                    v-else
                    @click="handleItemClick(item)"
                    :class="{
                    disabled:
                        (item.requiresLayer && !store.selectedLayer) ||
                        (item.requiresSelection && !isLassoSelectionActive),
                    }"
                >
                    {{ item.name }}
                </a>
                </li>
            </ul>
        </div>
    </div>
    <div class="menu-right">
        <button class="menu-button" @click="store.togglePanel('globalHistory', true)">
            Histórico Global
        </button>
        <button class="menu-button" :disabled="!isLayerSelected" @click="store.togglePanel('layerHistory', true, store.selectedLayerId)">
            Histórico da Camada
        </button>
        <div class="divider"></div>
        <button class="menu-button layers-toggle-button" @click="emit('toggle-layers-panel')">
            <span>Camadas</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M15 3v18"/></svg>
        </button>
    </div>
  </nav>
</template>

<style scoped>
.top-menu-bar {
  grid-area: top-menu;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: var(--c-surface);
  border-bottom: 1px solid var(--c-border);
  padding: 0 var(--spacing-3);
  height: 40px;
  z-index: 1000;
}

.menu-left, .menu-right {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
}

.home-button {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  width: 32px;
  border-radius: var(--radius-md);
  color: var(--c-text-secondary);
}
.home-button:hover {
  background-color: var(--c-surface-dark);
  color: var(--c-text-primary);
}
.divider {
  width: 1px;
  height: 24px;
  background-color: var(--c-border);
  margin: 0 var(--spacing-2);
}
.menu-item {
  position: relative;
}
.menu-item button, .menu-button {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: 0 var(--spacing-3);
  height: 32px;
  font-size: var(--fs-sm);
  font-weight: var(--fw-medium);
  color: var(--c-text-secondary);
  border-radius: var(--radius-md);
}
.menu-item button:hover,
.menu-item button.active,
.menu-button:hover:not(:disabled) {
  background-color: var(--c-surface-dark);
  color: var(--c-text-primary);
}
.menu-button:disabled {
    color: var(--c-text-tertiary);
    cursor: not-allowed;
}
.dropdown-menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  background-color: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  padding: var(--spacing-2) 0;
  z-index: 1100;
  min-width: 220px;
  list-style: none;
}
.dropdown-menu li a {
  display: block;
  padding: var(--spacing-2) var(--spacing-4);
  cursor: pointer;
  white-space: nowrap;
}
.dropdown-menu li a:hover {
  background-color: var(--c-surface-dark);
  color: var(--c-primary);
}
.dropdown-menu li a.disabled {
  color: var(--c-text-tertiary);
  cursor: not-allowed;
  background-color: transparent !important;
}
.divider-dropdown {
  height: 1px;
  background-color: var(--c-border);
  margin: var(--spacing-2) 0;
}
</style>
