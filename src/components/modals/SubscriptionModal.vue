<script setup>
import { useSubscriptionStore } from '@/stores/subscriptionStore'
import { useAuthStore } from '@/stores/authStore';

const store = useSubscriptionStore()
const authStore = useAuthStore()

const plans = [
  { name: 'Free', price: 'R$0', features: ['10 Mockups/mês', "Marca d'água", 'Suporte Básico'] },
  {
    name: 'Basic',
    price: 'R$29',
    features: ['50 Mockups/mês', "Sem marca d'água", 'Suporte Prioritário'],
  },
  {
    name: 'Pro',
    price: 'R$79',
    features: ['Mockups Ilimitados', 'Assets Premium', 'Suporte Dedicado 24/7'],
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    features: ['Tudo do Pro', 'Equipa Dedicada', 'API & Integrações'],
  },
]
</script>

<template>
  <div v-if="store.isModalVisible" class="modal-overlay" @click.self="store.closeModal()">
    <div class="modal-content">
      <button class="close-btn" @click="store.closeModal()">&times;</button>
      <h3>Nossos Planos</h3>
      <p>Escolha o plano que melhor se adapta às suas necessidades.</p>
      <div class="plans-container">
        <div
            v-for="plan in plans"
            :key="plan.name"
            class="plan-column"
            :class="{ 'current-plan': authStore.profile?.subscription_plan === plan.name.toLowerCase() }"
        >
          <div class="plan-inner">
            <h4 :class="{ 'current-plan-title': authStore.profile?.subscription_plan === plan.name.toLowerCase() }">{{ plan.name }}</h4>
            <div class="price">{{ plan.price }}<span>/mês</span></div>
            <ul>
              <li v-for="feature in plan.features" :key="feature">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                {{ feature }}
              </li>
            </ul>
            <button class="btn-select">Selecionar</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: var(--spacing-4);
}
.modal-content {
  background: var(--c-surface);
  padding: var(--spacing-6);
  border-radius: var(--radius-lg);
  width: 100%;
  /* --- CORREÇÃO APLICADA AQUI: Modal mais largo --- */
  max-width: 1100px;
  text-align: center;
  position: relative;
}
.close-btn {
  position: absolute;
  top: var(--spacing-3);
  right: var(--spacing-4);
  font-size: 2rem;
  color: var(--c-text-secondary);
}
h3 {
  font-size: 1.8rem;
  margin-bottom: var(--spacing-2);
}
p {
  color: var(--c-text-secondary);
  margin-bottom: var(--spacing-5);
}

/* --- CORREÇÃO APLICADA AQUI: Layout do grid e scroll --- */
.plans-container {
  display: grid;
  grid-template-columns: repeat(4, minmax(220px, 1fr)); /* Mantém 4 colunas */
  gap: var(--spacing-5);
  overflow-x: auto; /* Adiciona scroll horizontal se não couber */
  padding-bottom: var(--spacing-4); /* Espaço para a barra de scroll */
}

/* Estilo base para todos os planos */
.plan-column {
  border-radius: var(--radius-lg);
  padding: 1px;
  background: var(--c-border);
  transition: all 0.3s ease;
  flex-shrink: 0; /* Previne que os cards encolham */
}
.plan-column:hover {
    transform: translateY(-5px);
    box-shadow: var(--shadow-lg);
}

/* Apenas o plano ATIVO recebe a borda animada */
.plan-column.current-plan {
  padding: 2px;
  background: linear-gradient(90deg,
    var(--c-palette-sky-light),
    var(--c-palette-mint),
    var(--c-palette-lemon),
    var(--c-palette-peach),
    var(--c-palette-green),
    var(--c-palette-blue),
    var(--c-palette-sky-light)
  );
  animation: gradient-border 8s linear infinite;
  background-size: 400% 100%;
}

@keyframes gradient-border {
  0% { background-position: 0% 50%; }
  100% { background-position: 400% 50%; }
}

.plan-inner {
  background: var(--c-surface);
  border-radius: calc(var(--radius-lg) - 1px);
  padding: var(--spacing-5);
  display: flex;
  flex-direction: column;
  height: 100%;
}
.current-plan .plan-inner {
    border-radius: calc(var(--radius-lg) - 2px);
}

.plan-column h4 {
  font-size: 1.2rem;
  color: var(--c-text-primary);
  margin-bottom: var(--spacing-4);
  font-weight: var(--fw-bold);
}
.plan-column h4.current-plan-title {
    color: var(--c-primary);
}
.price {
  font-size: 2rem;
  font-weight: var(--fw-bold);
}
.price span {
  font-size: var(--fs-base);
  font-weight: var(--fw-regular);
  color: var(--c-text-secondary);
  margin-left: var(--spacing-2);
}
ul {
  list-style: none;
  margin: var(--spacing-5) 0;
  text-align: left;
  flex-grow: 1;
}
li {
  padding: var(--spacing-2) 0;
  font-size: var(--fs-sm);
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}
li svg {
    color: var(--c-success);
    flex-shrink: 0;
}
.btn-select {
  background: var(--c-primary);
  color: var(--c-white);
  padding: var(--spacing-3);
  border-radius: var(--radius-md);
  font-weight: var(--fw-semibold);
  margin-top: auto;
  border: none;
}
.btn-select:hover {
    background-color: var(--c-primary-hover);
}
.current-plan .btn-select {
    background-color: var(--c-success);
}
</style>
