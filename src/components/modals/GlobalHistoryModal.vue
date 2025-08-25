<script setup>
import { computed } from 'vue';
import { useHistoryStore } from '@/stores/historyStore';
import { useCanvasStore } from '@/stores/canvasStore';
import { historyActionIcons } from '@/utils/icons';
import FloatingPanel from '@/components/common/FloatingPanel.vue';

const historyStore = useHistoryStore();
const canvasStore = useCanvasStore();

function getIconPath(actionName) {
  const iconKey = Object.keys(historyActionIcons).find(key => actionName.toLowerCase().includes(key.toLowerCase()));
  return historyActionIcons[iconKey] || historyActionIcons['default'];
}

function formatTimestamp(date) {
  return new Date(date).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function handleRevertClick(index) {
  const originalIndex = historyStore.history.length - 1 - index;
  historyStore.revertToState(originalIndex);
}

</script>

<template>
  <FloatingPanel panel-id="globalHistory" title="Histórico Global">
    <div class="history-list">
      <div v-if="historyStore.history.length === 0" class="empty-state">
        Nenhuma ação global registada.
      </div>
      <div
        v-for="(item, index) in [...historyStore.history].reverse()"
        :key="`${item.timestamp}-${index}`"
        class="history-item"
        :class="{ active: historyStore.history.length - 1 - index === historyStore.currentIndex }"
        @click="handleRevertClick(index)"
        :title="`Reverter para: ${item.actionName}`"
      >
        <div class="icon-wrapper">
          <svg
            width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
          >
            <path :d="getIconPath(item.actionName)"></path>
          </svg>
        </div>
        <span class="action-name">{{ item.actionName }}</span>
        <span class="timestamp">{{ formatTimestamp(item.timestamp) }}</span>
      </div>
    </div>
  </FloatingPanel>
</template>

<style scoped>
.history-list {
  flex-grow: 1;
  overflow-y: auto;
  padding: var(--spacing-2);
  height: 100%; /* Garante que a lista ocupe o espaço disponível */
}
.history-item {
  display: grid;
  grid-template-columns: 24px 1fr auto;
  gap: var(--spacing-3);
  align-items: center;
  padding: var(--spacing-2);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background-color 0.15s ease;
}
.history-item:hover {
  background-color: var(--c-surface-dark);
}
.history-item.active {
  background-color: var(--c-primary);
  color: var(--c-white);
}
.icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--c-text-secondary);
}
.history-item.active .icon-wrapper {
  color: var(--c-white);
}
.action-name {
  font-weight: var(--fw-medium);
  font-size: var(--fs-sm);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.timestamp {
  font-size: var(--fs-xs);
  color: var(--c-text-tertiary);
  font-family: monospace;
}
.history-item.active .timestamp {
  color: rgba(255, 255, 255, 0.7);
}
.empty-state {
  text-align: center;
  padding: var(--spacing-6);
  color: var(--c-text-secondary);
  font-size: var(--fs-sm);
}
</style>
