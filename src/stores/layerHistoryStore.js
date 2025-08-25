// src/stores/layerHistoryStore.js
import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import { useCanvasStore } from './canvasStore'

export const useLayerHistoryStore = defineStore('layerHistory', () => {
  const historyByLayer = reactive({})

  function addLayerState(layerId, state, actionName = 'Alteração') {
    if (!historyByLayer[layerId]) {
      historyByLayer[layerId] = {
        history: [],
        currentIndex: -1,
      }
    }

    const layerHistory = historyByLayer[layerId]

    if (layerHistory.currentIndex < layerHistory.history.length - 1) {
      layerHistory.history.splice(layerHistory.currentIndex + 1)
    }

    const stateWithMeta = {
        actionName,
        timestamp: new Date(),
        state: JSON.stringify(state)
    };

    layerHistory.history.push(stateWithMeta)
    layerHistory.currentIndex = layerHistory.history.length - 1
  }

  function undo(layerId) {
    if (!canUndo(layerId)) return;

    const layerHistory = historyByLayer[layerId]
    layerHistory.currentIndex--
    const canvasStore = useCanvasStore()
    const stateToRestore = JSON.parse(layerHistory.history[layerHistory.currentIndex].state)
    canvasStore.updateLayerFromHistory(layerId, stateToRestore)
  }

  function redo(layerId) {
    if (!canRedo(layerId)) return;

    const layerHistory = historyByLayer[layerId]
    layerHistory.currentIndex++
    const canvasStore = useCanvasStore()
    const stateToRestore = JSON.parse(layerHistory.history[layerHistory.currentIndex].state)
    canvasStore.updateLayerFromHistory(layerId, stateToRestore)
  }

  function revertToState(layerId, historyIndex) {
    if (!historyByLayer[layerId] || historyIndex < 0 || historyIndex >= historyByLayer[layerId].history.length) return;

    const layerHistory = historyByLayer[layerId];
    layerHistory.currentIndex = historyIndex;

    const canvasStore = useCanvasStore();
    const stateToRestore = JSON.parse(layerHistory.history[historyIndex].state);
    canvasStore.updateLayerFromHistory(layerId, stateToRestore);
  }

  function clearLayerHistory(layerId) {
    delete historyByLayer[layerId]
  }

  // --- NOVAS FUNÇÕES ---
  function canUndo(layerId) {
      return historyByLayer[layerId] && historyByLayer[layerId].currentIndex > 0;
  }

  function canRedo(layerId) {
      const layerHistory = historyByLayer[layerId];
      return layerHistory && layerHistory.currentIndex < layerHistory.history.length - 1;
  }

  return { historyByLayer, addLayerState, undo, redo, clearLayerHistory, revertToState, canUndo, canRedo }
})
