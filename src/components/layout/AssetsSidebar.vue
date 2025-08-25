<script setup>
import { ref, onMounted, computed } from 'vue'
import { supabase } from '@/supabase'
import { useCanvasStore } from '@/stores/canvasStore'

// NOVO: Define as props e emits para o controlo do painel
const props = defineProps({
  isVisible: Boolean,
})
const emit = defineEmits(['close'])

const store = useCanvasStore()
const activeTab = ref('patterns')
const categories = ref([])
const loading = ref(true)

const filteredCategories = computed(() => {
  return categories.value.filter((c) => c.type === activeTab.value && c.assets.length > 0)
})

function getThumbUrl(path) {
  const { data } = supabase.storage.from(activeTab.value).getPublicUrl(path)
  return data.publicUrl
}

function handleAssetClick(asset) {
  // O tipo é a aba ativa, mas convertemos para singular (ex: 'patterns' -> 'pattern')
  const type = activeTab.value.slice(0, -1)
  store.addLayer(asset, type)
  // Fecha o painel após adicionar uma camada
  emit('close')
}

async function fetchAssets() {
  loading.value = true
  try {
    const { data, error } = await supabase
      .from('categories')
      .select(`name, type, assets (id, name, file_path, metadata)`)
      .order('name', { referencedTable: 'assets', ascending: true })

    if (error) throw error
    categories.value = data
  } catch (error) {
    console.error('Erro ao buscar ativos:', error)
  } finally {
    loading.value = false
  }
}

onMounted(fetchAssets)
</script>

<template>
  <div v-if="isVisible" class="assets-sidebar-overlay" @click.self="emit('close')">
    <aside class="assets-sidebar">
      <div class="assets-tabs">
        <button @click="activeTab = 'patterns'" :class="{ active: activeTab === 'patterns' }">
          Estampas
        </button>
        <button @click="activeTab = 'mockups'" :class="{ active: activeTab === 'mockups' }">
          Mockups
        </button>
        <button @click="activeTab = 'fabrics'" :class="{ active: activeTab === 'fabrics' }">
          Tecidos
        </button>
      </div>

      <div class="assets-content">
        <div v-if="loading" class="loader">Carregando...</div>
        <div v-else-if="filteredCategories.length === 0" class="empty-state">
          Nenhum ativo encontrado para "{{ activeTab }}".
        </div>
        <div v-else class="categories-list">
          <div v-for="category in filteredCategories" :key="category.name" class="category-box">
            <h4 class="category-title">{{ category.name }}</h4>
            <div class="thumbnails-grid">
              <div
                v-for="asset in category.assets"
                :key="asset.id"
                class="thumbnail"
                :style="{ backgroundImage: `url(${getThumbUrl(asset.file_path)})` }"
                @click="handleAssetClick(asset)"
                :title="asset.name"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  </div>
</template>

<style scoped>
/* NOVO: Estilo para a sobreposição que fecha o painel ao clicar fora */
.assets-sidebar-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.2);
  z-index: 250;
  display: flex;
  justify-content: flex-end; /* Alinha o painel à direita */
}

/* O painel agora é um elemento flutuante */
.assets-sidebar {
  width: var(--assets-width);
  height: 100%;
  background-color: var(--c-surface);
  border-left: 1px solid var(--c-border);
  display: flex;
  flex-direction: column;
  box-shadow: -4px 0 15px rgba(0, 0, 0, 0.1);
}
.assets-tabs {
  display: flex;
  border-bottom: 1px solid var(--c-border);
  flex-shrink: 0;
}
.assets-tabs button {
  flex: 1;
  background: none;
  border: none;
  padding: 12px 8px;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--c-text-secondary);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s ease;
}
.assets-tabs button:hover {
  color: var(--c-text-primary);
}
.assets-tabs button.active {
  color: var(--c-primary);
  border-bottom-color: var(--c-primary);
}
.assets-content {
  flex-grow: 1;
  overflow-y: auto;
  padding: 16px;
}
.loader,
.empty-state {
  text-align: center;
  color: var(--c-text-secondary);
  margin-top: 40px;
}
.category-box {
  margin-bottom: 24px;
}
.category-title {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--c-text-secondary);
  text-transform: uppercase;
  margin-bottom: 12px;
}
.thumbnails-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
  gap: 12px;
}
.thumbnail {
  aspect-ratio: 1 / 1;
  border-radius: var(--radius-md);
  background-color: var(--c-background);
  background-size: cover;
  background-position: center;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s ease;
}
.thumbnail:hover {
  transform: scale(1.05);
  border-color: var(--c-primary-hover);
}
</style>
