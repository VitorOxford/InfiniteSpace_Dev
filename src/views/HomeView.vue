<script setup>
import { useRouter } from 'vue-router'
import AppHeader from '@/components/layout/AppHeader.vue'

const router = useRouter()

function goToWorkspace() {
  // Por enquanto, navegar para o workspace genérico.
  // Futuramente, isso poderia levar a /workspace/new ou /workspace/:id
  router.push('/workspace')
}
</script>

<template>
  <div class="home-layout">
    <AppHeader />
    <main class="home-content">
      <div class="welcome-card">
        <img src="https://fvtzdioouypsooogsoow.supabase.co/storage/v1/object/public/logo/logo%20teste.png" alt="MockupCreator Pro Logo" class="logo" />
        <h1>Seu Estúdio Criativo Digital</h1>
        <p>Crie, gerencie e edite seus mockups com facilidade. Comece um novo projeto ou continue de onde parou.</p>
        <button @click="goToWorkspace" class="btn-new-project">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Criar Novo Projeto
        </button>
      </div>

      <div class="projects-grid">
        <div class="project-card-placeholder" @click="goToWorkspace">
          <div class="placeholder-icon">+</div>
          <p>Novo Projeto</p>
        </div>
        </div>
    </main>
  </div>
</template>

<style scoped>
.home-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: var(--c-background);
}

.home-content {
  flex-grow: 1;
  overflow-y: auto;
  padding: var(--spacing-6);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.welcome-card {
  width: 100%;
  max-width: 800px;
  text-align: center;
  margin-bottom: var(--spacing-6);
}

.logo {
  width: 64px;
  height: 64px;
  margin-bottom: var(--spacing-4);
}

h1 {
  font-size: 2.5rem;
  font-weight: var(--fw-bold);
  color: var(--c-text-primary);
  margin-bottom: var(--spacing-3);
}

p {
  font-size: var(--fs-base);
  color: var(--c-text-secondary);
  max-width: 600px;
  margin: 0 auto var(--spacing-5);
}

.btn-new-project {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-3) var(--spacing-5);
  background-color: var(--c-primary);
  color: var(--c-white);
  border-radius: var(--radius-md);
  font-size: var(--fs-base);
  font-weight: var(--fw-semibold);
  transition: var(--transition-fast);
}

.btn-new-project:hover {
  background-color: var(--c-primary-hover);
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.projects-grid {
  width: 100%;
  max-width: 1200px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--spacing-5);
}

.project-card-placeholder {
  aspect-ratio: 4 / 3;
  border: 2px dashed var(--c-border);
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--c-text-tertiary);
  cursor: pointer;
  transition: var(--transition-fast);
}

.project-card-placeholder:hover {
  border-color: var(--c-primary);
  color: var(--c-primary);
  background-color: var(--c-surface-dark);
}

.placeholder-icon {
  font-size: 3rem;
  font-weight: 200;
  line-height: 1;
}
</style>
