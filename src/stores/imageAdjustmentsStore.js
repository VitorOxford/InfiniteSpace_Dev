import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useCanvasStore } from './canvasStore'

export const useImageAdjustmentsStore = defineStore('imageAdjustments', () => {
  const isModalVisible = ref(false)
  const targetLayerId = ref(null)

  // Estado temporário para os ajustes dentro do modal
  const tempAdjustments = ref({})

  function openModal() {
    const canvasStore = useCanvasStore()
    if (!canvasStore.selectedLayer) return

    targetLayerId.value = canvasStore.selectedLayerId
    // Clona os ajustes existentes da camada para o estado temporário do modal
    tempAdjustments.value = { ...canvasStore.selectedLayer.adjustments }

    isModalVisible.value = true
  }

  function closeModal() {
    isModalVisible.value = false
    targetLayerId.value = null
    tempAdjustments.value = {}
  }

  function applyAdjustments() {
    const canvasStore = useCanvasStore()
    canvasStore.updateLayerAdjustments(targetLayerId.value, tempAdjustments.value)
    closeModal()
  }

  // Atualiza o preview em tempo real
  function updatePreview(newAdjustments) {
    tempAdjustments.value = newAdjustments
  }

  return {
    isModalVisible,
    targetLayerId,
    tempAdjustments,
    openModal,
    closeModal,
    applyAdjustments,
    updatePreview,
  }
})
