// src/main.js
import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { draggable } from './directives/draggable.js'
import { resizable } from './directives/resizable.js' // <-- Importe a nova diretiva

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.directive('draggable', draggable)
app.directive('resizable', resizable) // <-- Registre a nova diretiva

// Diretiva para focar em um elemento
app.directive('focus', {
  mounted(el) {
    el.focus()
  }
})


app.mount('#app')
