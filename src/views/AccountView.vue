<script setup>
import { ref, watch } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { useRouter } from 'vue-router'
import AppHeader from '@/components/layout/AppHeader.vue'

const authStore = useAuthStore()
const router = useRouter()

const loading = ref(false)
const uploading = ref(false)
const profile = ref({
  full_name: '',
  date_of_birth: '',
  address: '',
  phone: '',
  document_type: 'CPF',
  document_number: '',
  email: '',
  subscription_plan: 'free',
  avatar_url: '',
})

// CORREÇÃO: Usamos um watcher para manter o formulário sincronizado com a store
watch(
  () => authStore.profile,
  (newProfile) => {
    if (newProfile) {
      profile.value = { ...profile.value, ...newProfile }
    }
  },
  { immediate: true, deep: true },
)

async function handleProfileUpdate() {
  loading.value = true
  try {
    await authStore.updateProfile(profile.value)
    alert('Perfil atualizado com sucesso!')
  } catch (error) {
    alert('Erro ao atualizar o perfil: ' + error.message)
  } finally {
    loading.value = false
  }
}

async function handleAvatarUpload(event) {
  const file = event.target.files[0]
  if (!file) return

  uploading.value = true
  try {
    const newUrl = await authStore.uploadAvatar(file)
    profile.value.avatar_url = newUrl // Atualiza a imagem na tela imediatamente
    alert('Avatar atualizado com sucesso!')
  } catch (error) {
    alert('Erro ao enviar o avatar: ' + error.message)
  } finally {
    uploading.value = false
  }
}
</script>

<template>
  <div class="account-layout">
    <AppHeader />
    <main class="account-content">
      <div class="account-card">
        <div class="card-header">
          <div>
            <h2>Minha Conta</h2>
            <p>Atualize as suas informações de perfil e avatar.</p>
          </div>
          <button @click="router.push('/')" class="btn-back">Voltar ao Editor</button>
        </div>

        <form @submit.prevent="handleProfileUpdate" v-if="authStore.profile">
          <div class="avatar-section">
            <img :src="profile.avatar_url || 'https://fvtzdioouypsooogsoow.supabase.co/storage/v1/object/public/logo/logo%20teste.png'" alt="Avatar" class="avatar-img" />
            <div class="avatar-actions">
              <span>{{ profile.email }}</span>
              <label for="avatar-upload" class="btn-upload">
                {{ uploading ? 'A enviar...' : 'Mudar Foto' }}
              </label>
              <input
                type="file"
                id="avatar-upload"
                @change="handleAvatarUpload"
                accept="image/*"
                hidden
                :disabled="uploading"
              />
            </div>
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label for="full_name">Nome Completo</label>
              <input
                id="full_name"
                type="text"
                v-model="profile.full_name"
                placeholder="Seu nome completo"
              />
            </div>
            <div class="form-group">
              <label for="date_of_birth">Data de Nascimento</label>
              <input id="date_of_birth" type="date" v-model="profile.date_of_birth" />
            </div>
            <div class="form-group">
              <label for="phone">Telefone</label>
              <input id="phone" type="tel" v-model="profile.phone" placeholder="(99) 99999-9999" />
            </div>
            <div class="form-group document-group">
              <label>Documento</label>
              <div class="document-input">
                <select v-model="profile.document_type">
                  <option value="CPF">CPF</option>
                  <option value="CNPJ">CNPJ</option>
                </select>
                <input
                  type="text"
                  v-model="profile.document_number"
                  placeholder="Seu CPF ou CNPJ"
                />
              </div>
            </div>
            <div class="form-group form-group-full">
              <label for="address">Endereço</label>
              <input
                id="address"
                type="text"
                v-model="profile.address"
                placeholder="Sua rua, número, cidade..."
              />
            </div>
          </div>

          <button type="submit" class="btn-submit" :disabled="loading">
            {{ loading ? 'A guardar...' : 'Guardar Alterações' }}
          </button>
        </form>
        <div v-else class="loading-state">
          <p>A carregar perfil...</p>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
/* (Estilos existentes... adicione ou modifique o seguinte) */
.account-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: var(--c-background);
}
.account-content {
  flex-grow: 1;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: var(--spacing-6);
  overflow-y: auto;
}
.account-card {
  width: 100%;
  max-width: 800px;
  background-color: var(--c-surface);
  padding: var(--spacing-6);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--spacing-4);
}
h2 {
  font-size: 1.8rem;
  font-weight: var(--fw-bold);
  margin-bottom: var(--spacing-1);
}
p {
  color: var(--c-text-secondary);
}
.btn-back {
  padding: var(--spacing-2) var(--spacing-4);
  background-color: var(--c-surface-dark);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  font-weight: var(--fw-semibold);
  cursor: pointer;
}
.avatar-section {
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
  margin-bottom: var(--spacing-6);
  padding-bottom: var(--spacing-5);
  border-bottom: 1px solid var(--c-border);
}
.avatar-img {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid var(--c-primary);
}
.avatar-actions {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}
.avatar-actions span {
  font-weight: var(--fw-semibold);
  font-size: 1.1rem;
}
.btn-upload {
  cursor: pointer;
  background: none;
  border: 1px solid var(--c-border);
  padding: var(--spacing-1) var(--spacing-3);
  border-radius: var(--radius-md);
  font-size: var(--fs-sm);
}
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-5);
}
.form-group {
  display: flex;
  flex-direction: column;
}
.form-group-full {
  grid-column: 1 / -1;
}
label {
  margin-bottom: var(--spacing-2);
  font-weight: var(--fw-medium);
  font-size: var(--fs-sm);
}
input,
select {
  width: 100%;
  padding: var(--spacing-2) var(--spacing-3);
  border-radius: var(--radius-md);
  border: 1px solid var(--c-border);
  background-color: var(--c-surface-dark);
  font-family: inherit;
  font-size: var(--fs-base);
  color: var(--c-text-primary);
}
input:focus,
select:focus {
  outline: none;
  border-color: var(--c-primary);
  box-shadow: 0 0 0 2px rgba(13, 153, 255, 0.2);
}
.document-group .document-input {
  display: flex;
  gap: var(--spacing-2);
}
.document-group select {
  flex-basis: 30%;
}
.document-group input {
  flex-basis: 70%;
}
.btn-submit {
  margin-top: var(--spacing-6);
  width: 100%;
  padding: var(--spacing-3);
  background-color: var(--c-primary);
  color: var(--c-white);
  border: none;
  border-radius: var(--radius-md);
  font-weight: var(--fw-bold);
  font-size: 1rem;
  cursor: pointer;
}
.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.loading-state {
  text-align: center;
  padding: var(--spacing-6);
  color: var(--c-text-secondary);
}
</style>
