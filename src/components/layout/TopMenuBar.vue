<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useCanvasStore } from '@/stores/canvasStore'
import { useImageAdjustmentsStore } from '@/stores/imageAdjustmentsStore'

const store = useCanvasStore()
const adjustmentsStore = useImageAdjustmentsStore()
const router = useRouter() // Adiciona o router
const activeMenu = ref(null)

// --- CORREÇÃO ADICIONADA ---
// Emit para notificar o componente pai que o modal de novo projeto deve ser aberto
const emit = defineEmits(['open-new-project-modal'])

const isLassoSelectionActive = computed(() => store.workspace.lasso.points.length > 2)

const menus = [
  {
    name: 'Ficheiro',
    items: [
      // --- CORREÇÃO ADICIONADA ---
      // Novo item de menu que chama a ação de emitir o evento
      { name: 'Novo Projeto...', action: () => emit('open-new-project-modal') },
      { type: 'divider' },
      { name: 'Exportar...', action: () => alert('Exportar!') }
    ]
  },
  {
    name: 'Editar',
    items: [
      {
        name: 'Desfazer (Ctrl+Z)',
        action: () => store.undoLastAction(),
      },
      { type: 'divider' },
      {
        name: 'Duplicar Camada',
        action: () => store.duplicateLayer(store.selectedLayerId),
        requiresLayer: true,
      },
      { type: 'divider' },
      {
        name: 'Duplicar Seleção',
        action: () => store.duplicateSelection(store.selectedLayerId),
        requiresLayer: true,
        requiresSelection: true,
      },
      {
        name: 'Recortar Seleção',
        action: () => store.cutoutSelection(store.selectedLayerId),
        requiresLayer: true,
        requiresSelection: true,
      },
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
      {
        name: 'Inverter Horizontalmente',
        action: () => store.flipLayer('horizontal'),
        requiresLayer: true,
      },
      {
        name: 'Inverter Verticalmente',
        action: () => store.flipLayer('vertical'),
        requiresLayer: true,
      },
    ],
  },
  {
    name: 'Histórico',
    items: [
        { name: 'Ver Histórico Global...', action: () => store.togglePanel('globalHistory', true) }
    ]
  }
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
  // A ação (incluindo o emit) é executada aqui
  item.action()
  activeMenu.value = null
}
</script>

<template>
  <nav class="top-menu-bar">
    <button class="home-button" @click="router.push({ name: 'home' })" title="Voltar para Início">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
    </button>
    <div class="divider"></div>
    <div v-for="menu in menus" :key="menu.name" class="menu-item">
      <button @click="toggleMenu(menu.name)">{{ menu.name }}</button>
      <ul v-if="activeMenu === menu.name" class="dropdown-menu">
        <li v-for="(item, index) in menu.items" :key="item.name || `divider-${index}`">
          <div v-if="item.type === 'divider'" class="divider"></div>
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
  </nav>
</template>

<style scoped>
.top-menu-bar {
  grid-area: top-menu;
  display: flex;
  align-items: center; /* Alinha itens verticalmente */
  background-color: var(--c-surface);
  border-bottom: 1px solid var(--c-border);
  padding: 0 var(--spacing-3);
  height: 40px;
  z-index: 1000;
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
.menu-item button {
  padding: 0 var(--spacing-3);
  height: 100%;
  font-size: var(--fs-sm);
  font-weight: var(--fw-medium);
  color: var(--c-text-secondary);
}
.menu-item button:hover,
.menu-item button.active {
  background-color: var(--c-surface-dark);
  color: var(--c-text-primary);
}
.dropdown-menu {
  position: absolute;
  top: 100%;
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
.dropdown-menu .divider {
  height: 1px;
  background-color: var(--c-border);
  margin: var(--spacing-2) 0;
}
</style>
