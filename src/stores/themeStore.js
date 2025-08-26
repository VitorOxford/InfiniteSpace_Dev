// src/stores/themeStore.js
import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'

export const useThemeStore = defineStore('theme', () => {
  // Tenta carregar o tema do localStorage ou define 'light' como padrão
  const theme = ref(localStorage.getItem('theme') || 'light')

  const isDarkMode = computed(() => theme.value === 'dark')

  function toggleTheme() {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
  }

  // Observa mudanças no tema e atualiza o localStorage e a classe do HTML
  watch(theme, (newTheme) => {
    localStorage.setItem('theme', newTheme)
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, { immediate: true }) // 'immediate: true' aplica o tema assim que a app carrega

  return { theme, isDarkMode, toggleTheme }
})
