<script setup>
import { useSubscriptionStore } from '@/stores/subscriptionStore'
const store = useSubscriptionStore()

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
        <div v-for="plan in plans" :key="plan.name" class="plan-column">
          <h4>{{ plan.name }}</h4>
          <div class="price">{{ plan.price }}<span>/mês</span></div>
          <ul>
            <li v-for="feature in plan.features" :key="feature">{{ feature }}</li>
          </ul>
          <button class="btn-select">Selecionar</button>
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
}
.modal-content {
  background: var(--c-surface);
  padding: var(--spacing-6);
  border-radius: var(--radius-lg);
  width: 90%;
  max-width: 900px;
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
.plans-container {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--spacing-5);
}
.plan-column {
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  padding: var(--spacing-5);
  display: flex;
  flex-direction: column;
}
.plan-column:hover {
  border-color: var(--c-primary);
  box-shadow: var(--shadow-lg);
  transform: translateY(-5px);
  transition: var(--transition-fast);
}
.plan-column h4 {
  font-size: 1.2rem;
  color: var(--c-primary);
  margin-bottom: var(--spacing-4);
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
  border-bottom: 1px solid var(--c-border);
  font-size: var(--fs-sm);
}
.btn-select {
  background: var(--c-primary);
  color: var(--c-white);
  padding: var(--spacing-3);
  border-radius: var(--radius-md);
  font-weight: var(--fw-semibold);
}
</style>
