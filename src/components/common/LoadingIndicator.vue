<script setup>
defineProps({
  message: {
    type: String,
    default: 'A processar...',
  },
});
</script>

<template>
  <div class="loading-indicator-overlay">
    <div class="indicator-content">
      <div class="spinner"></div>
      <p>{{ message }}</p>
    </div>
  </div>
</template>

<style scoped>
.loading-indicator-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(4px);
}
.indicator-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-4);
  background-color: var(--c-surface);
  padding: var(--spacing-5) var(--spacing-6);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  color: var(--c-text-primary);
}
.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--c-border);
  border-top-color: var(--c-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
p {
  font-weight: var(--fw-semibold);
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
