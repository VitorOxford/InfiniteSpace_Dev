// src/stores/historyStore.js
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useCanvasStore } from './canvasStore'

// Este store agora gere o histórico GLOBAL (adição/remoção de camadas, etc.)
export const useHistoryStore = defineStore('history', () => {
  const history = ref([])
  const currentIndex = ref(-1)

  function addState(state, actionName = 'Ação Global') {
    // Se o ponteiro não está no final, remove os estados "futuros" (redo)
    if (currentIndex.value < history.value.length - 1) {
      history.value.splice(currentIndex.value + 1)
    }

    const stateWithMeta = {
        actionName,
        timestamp: new Date(),
        state: JSON.stringify(state)
    };

    history.value.push(stateWithMeta)
    currentIndex.value = history.value.length - 1
  }

  function undo() {
    if (currentIndex.value > 0) {
      currentIndex.value--
      const canvasStore = useCanvasStore()
      const stateToRestore = JSON.parse(history.value[currentIndex.value].state)
      canvasStore.setGlobalState(stateToRestore)
    }
  }

  function redo() {
    if (currentIndex.value < history.value.length - 1) {
      currentIndex.value++
      const canvasStore = useCanvasStore()
      const stateToRestore = JSON.parse(history.value[currentIndex.value].state)
      canvasStore.setGlobalState(stateToRestore)
    }
  }

  // NOVA FUNÇÃO para reverter para um estado específico a partir do modal
  function revertToState(index) {
    if (index >= 0 && index < history.value.length) {
      currentIndex.value = index;
      const canvasStore = useCanvasStore();
      const stateToRestore = JSON.parse(history.value[currentIndex.value].state);
      canvasStore.setGlobalState(stateToRestore);
    }
  }

  function clearHistory() {
    history.value = []
    currentIndex.value = -1
  }

  return { history, currentIndex, addState, undo, redo, clearHistory, revertToState }
})
