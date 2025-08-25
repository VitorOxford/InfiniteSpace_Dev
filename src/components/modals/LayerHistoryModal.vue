<script setup>
import { computed, ref, watch } from 'vue';
import { useLayerHistoryStore } from '@/stores/layerHistoryStore';
import { useCanvasStore } from '@/stores/canvasStore';
import { historyActionIcons } from '@/utils/icons';
import FloatingPanel from '@/components/common/FloatingPanel.vue';

console.log(`%c[LayerHistoryModal.vue] | SCRIPT INICIADO E COMPONENTE CARREGADO!`, 'color: green; font-weight: bold;');

const layerHistoryStore = useLayerHistoryStore();
const canvasStore = useCanvasStore();

const activeTab = ref('');

// --- LOGS NAS VARIÁVEIS COMPUTADAS ---

const targetLayerId = computed(() => {
  const id = canvasStore.workspace.historyModalTargetLayerId;
  console.log(`[LayerHistoryModal.vue] | COMPUTED 'targetLayerId' FOI ACESSADO. Valor retornado: ${id}`);
  return id;
});

const targetLayer = computed(() => {
  console.log(`%c[LayerHistoryModal.vue] | COMPUTED 'targetLayer' ESTÁ SENDO CALCULADO...`, 'color: #8A2BE2');
  console.log(`[LayerHistoryModal.vue] |   - Tentando encontrar a camada com ID: ${targetLayerId.value}`);
  console.log(`[LayerHistoryModal.vue] |   - Lista de todas as camadas na store:`, JSON.parse(JSON.stringify(canvasStore.layers)));
  const layer = canvasStore.layers.find(l => l.id === targetLayerId.value);
  if (layer) {
    console.log(`[LayerHistoryModal.vue] |   - SUCESSO! Camada encontrada:`, JSON.parse(JSON.stringify(layer)));
  } else {
    console.error(`[LayerHistoryModal.vue] |   - FALHA! Nenhuma camada encontrada com o ID '${targetLayerId.value}'. O painel não será renderizado por causa disso (v-if="targetLayer" vai falhar).`);
  }
  return layer;
});

const groupedHistory = computed(() => {
  console.log(`[LayerHistoryModal.vue] | COMPUTED 'groupedHistory' ESTÁ SENDO CALCULADO...`);
  if (!targetLayerId.value || !layerHistoryStore.historyByLayer[targetLayerId.value]) {
    console.warn(`[LayerHistoryModal.vue] |   - CONDIÇÃO FALHOU: Ou não há targetLayerId ('${targetLayerId.value}'), ou não há histórico para esta camada no 'historyByLayer'. Retornando array vazio.`);
    console.log(`[LayerHistoryModal.vue] |   - Conteúdo de 'historyByLayer':`, JSON.parse(JSON.stringify(layerHistoryStore.historyByLayer)));
    return [];
  }

  const historyData = layerHistoryStore.historyByLayer[targetLayerId.value];
  console.log(`[LayerHistoryModal.vue] |   - Dados de histórico encontrados para a camada:`, JSON.parse(JSON.stringify(historyData)));
  const reversedHistory = [...historyData.history].slice().reverse();

  if (reversedHistory.length === 0) {
    console.log(`[LayerHistoryModal.vue] |   - O histórico da camada está vazio. Retornando array vazio.`);
    return [];
  }

  const groups = [];
  let currentGroup = { name: reversedHistory[0].actionName, items: [] };

  reversedHistory.forEach((item, index) => {
    const originalIndex = historyData.history.length - 1 - index;
    const itemWithIndex = { ...item, originalIndex };

    if (item.actionName === currentGroup.name) {
      currentGroup.items.push(itemWithIndex);
    } else {
      groups.push(currentGroup);
      currentGroup = { name: item.actionName, items: [itemWithIndex] };
    }
  });
  groups.push(currentGroup);

  console.log(`[LayerHistoryModal.vue] |   - Histórico agrupado com sucesso:`, JSON.parse(JSON.stringify(groups)));
  return groups;
});


// --- LOGS NOS WATCHERS ---

watch(() => canvasStore.workspace.panels.layerHistory.isVisible, (isVisible) => {
    console.log(`%c[LayerHistoryModal.vue] | WATCH DETECTOU MUDANÇA EM 'isVisible'! Novo valor: ${isVisible}`, 'color: orange; font-weight: bold;');
    if (!isVisible) {
        console.log(`[LayerHistoryModal.vue] |   - O painel está sendo fechado, limpando a aba ativa.`);
        activeTab.value = '';
    } else {
        console.log(`[LayerHistoryModal.vue] |   - O painel está sendo aberto.`);
    }
});

watch(targetLayer, (newLayer) => {
    console.log(`%c[LayerHistoryModal.vue] | WATCH DETECTOU MUDANÇA EM 'targetLayer'!`, 'color: orange; font-weight: bold;');
    if (newLayer) {
        console.log(`[LayerHistoryModal.vue] |   - Nova camada alvo definida: ${newLayer.name} (ID: ${newLayer.id})`);
    } else {
        console.log(`[LayerHistoryModal.vue] |   - A camada alvo foi removida (tornou-se nula).`);
    }
}, { immediate: true });

watch(groupedHistory, (newGroups) => {
  console.log(`%c[LayerHistoryModal.vue] | WATCH DETECTOU MUDANÇA EM 'groupedHistory'!`, 'color: orange; font-weight: bold;');
  if (newGroups.length > 0 && (!activeTab.value || !newGroups.some(g => g.name === activeTab.value))) {
    const newActiveTab = newGroups[0].name;
    console.log(`[LayerHistoryModal.vue] |   - Grupos de histórico foram atualizados. Definindo aba ativa para: '${newActiveTab}'`);
    activeTab.value = newActiveTab;
  }
});


function getIconPath(actionName) {
  const icon = historyActionIcons[actionName] || historyActionIcons['default'];
  // console.log(`[LayerHistoryModal.vue] | getIconPath para '${actionName}': ${icon ? 'Encontrado' : 'Usando default'}`);
  return icon;
}

function formatTimestamp(date) {
  return new Date(date).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function handleRevertClick(originalIndex) {
    console.log(`%c[LayerHistoryModal.vue] | 'handleRevertClick' chamado com o índice: ${originalIndex}`, 'color: #FF1493');
  if (targetLayerId.value) {
    layerHistoryStore.revertToState(targetLayerId.value, originalIndex);
  } else {
    console.error(`[LayerHistoryModal.vue] | Tentou reverter estado mas não há targetLayerId!`);
  }
}
</script>

<template>
    <FloatingPanel v-if="targetLayer" panel-id="layerHistory" :title="`Histórico: ${targetLayer.name}`">
       <div class="panel-body">
            <div class="tabs-nav">
                <button
                v-for="group in groupedHistory"
                :key="group.name"
                class="tab-button"
                :class="{ active: activeTab === group.name }"
                @click="activeTab = group.name"
                >
                <svg
                    width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                >
                    <path :d="getIconPath(group.name)"></path>
                </svg>
                <span>{{ group.name }}</span>
                </button>
            </div>

            <div class="history-list">
                <div v-if="!groupedHistory || groupedHistory.length === 0" class="empty-state">
                  Nenhuma alteração registada para esta camada.
                </div>
                <template v-for="group in groupedHistory" :key="group.name">
                  <div v-if="activeTab === group.name" class="tab-content">
                      <div
                      v-for="item in group.items"
                      :key="item.timestamp"
                      class="history-item"
                      :class="{ active: item.originalIndex === layerHistoryStore.historyByLayer[targetLayerId]?.currentIndex }"
                      @click="handleRevertClick(item.originalIndex)"
                      >
                      <span class="timestamp">{{ formatTimestamp(item.timestamp) }}</span>
                      <span class="revert-text">Reverter para este ponto</span>
                      </div>
                  </div>
                </template>
            </div>
       </div>
    </FloatingPanel>
</template>

<style scoped>
.panel-body {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    height: 100%;
}
.tabs-nav {
  display: flex;
  overflow-x: auto;
  border-bottom: 1px solid var(--c-border);
  flex-shrink: 0;
  padding: 0 var(--spacing-2);
  background-color: var(--c-background);
}
.tab-button {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-3) var(--spacing-4);
  font-size: var(--fs-sm);
  font-weight: var(--fw-semibold);
  color: var(--c-text-secondary);
  border-bottom: 2px solid transparent;
  transition: all 0.2s ease;
}
.tab-button:hover {
  color: var(--c-text-primary);
}
.tab-button.active {
  color: var(--c-primary);
  border-bottom-color: var(--c-primary);
}
.history-list {
  flex-grow: 1;
  overflow-y: auto;
}
.tab-content {
  padding: var(--spacing-2);
}
.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-3) var(--spacing-4);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.15s ease;
}
.history-item:hover {
  background-color: var(--c-surface-dark);
}
.history-item .revert-text {
  opacity: 0;
  font-size: var(--fs-xs);
  color: var(--c-text-secondary);
  transition: opacity 0.15s ease;
}
.history-item:hover .revert-text {
  opacity: 1;
}
.history-item.active {
  background-color: var(--c-primary);
  color: var(--c-white);
}
.timestamp {
  font-family: monospace;
}
.history-item.active .timestamp {
  color: var(--c-white);
  font-weight: var(--fw-semibold);
}
.history-item.active .revert-text {
  opacity: 1;
  color: rgba(255, 255, 255, 0.8);
}
.empty-state {
  text-align: center;
  padding: var(--spacing-6);
  color: var(--c-text-secondary);
  font-size: var(--fs-sm);
}
</style>
