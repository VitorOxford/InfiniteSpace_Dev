// src/stores/historyStore.js
import { defineStore } from 'pinia'
import { ref } from 'vue'
// Remova a importação do canvasStore daqui de cima

export const useHistoryStore = defineStore('history', () => {
  const history = ref([])
  const currentIndex = ref(-1)

  function addState(state, actionName = 'Ação Global') {
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
      // Importa e usa o store SÓ AQUI DENTRO
      const { useCanvasStore } = await import('./canvasStore.js')
      const canvasStore = useCanvasStore()
      const stateToRestore = JSON.parse(history.value[currentIndex.value].state)
      canvasStore.setGlobalState(stateToRestore)
    }
  }

  function redo() {
    if (currentIndex.value < history.value.length - 1) {
      currentIndex.value++
      const { useCanvasStore } = await import('./canvasStore.js')
      const canvasStore = useCanvasStore()
      const stateToRestore = JSON.parse(history.value[currentIndex.value].state)
      canvasStore.setGlobalState(stateToRestore)
    }
  }

  async function revertToState(index) {
    if (index >= 0 && index < history.value.length) {
      currentIndex.value = index;
      const { useCanvasStore } = await import('./canvasStore.js')
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
