import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSubscriptionStore = defineStore('subscription', () => {
  const isModalVisible = ref(false)

  function openModal() {
    isModalVisible.value = true
  }

  function closeModal() {
    isModalVisible.value = false
  }

  return { isModalVisible, openModal, closeModal }
})
