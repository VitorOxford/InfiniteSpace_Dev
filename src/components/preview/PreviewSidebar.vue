<script setup>
import { computed, ref } from 'vue'
import { useCanvasStore } from '@/stores/canvasStore'
import html2canvas from 'html2canvas'
import JSZip from 'jszip'

const store = useCanvasStore()
const isDownloading = ref(false)

const mockup = computed(() => store.mockupLayer)
const pattern = computed(() => store.layers.find((l) => l.type === 'pattern'))

const mockupDimensionsCm = computed(() => {
  if (!mockup.value || !mockup.value.metadata.dpi) return { width: 0, height: 0 }
  const { metadata, scale } = mockup.value
  const widthCm = ((metadata.originalWidth * scale) / metadata.dpi) * 2.54
  const heightCm = ((metadata.originalHeight * scale) / metadata.dpi) * 2.54
  return { width: widthCm.toFixed(2), height: heightCm.toFixed(2) }
})

const patternDimensionsCm = computed(() => {
  if (!pattern.value || !pattern.value.metadata.dpi) return { width: 0, height: 0 }
  const { metadata, scale } = pattern.value
  const widthCm = ((metadata.originalWidth * scale) / metadata.dpi) * 2.54
  const heightCm = ((metadata.originalHeight * scale) / metadata.dpi) * 2.54
  return { width: widthCm.toFixed(2), height: heightCm.toFixed(2) }
})

async function generatePreviewImageBlob() {
  const artboard = document.querySelector('.artboard') // O alvo para a captura
  if (!artboard) return null

  const canvas = await html2canvas(artboard, {
    allowTaint: true,
    useCORS: true,
    backgroundColor: '#f0f2f5',
    scale: 3, // Aumenta a resolução para HD
  })
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.95))
}

async function handleDownload() {
  if (isDownloading.value) return
  isDownloading.value = true

  try {
    const zip = new JSZip()
    const techInfo = `
# Informações Técnicas - MockupCreator Pro

## Mockup
- Ficheiro: ${mockup.value?.name || 'N/A'}
- Dimensões Finais: ${mockupDimensionsCm.value.width} cm (L) x ${mockupDimensionsCm.value.height} cm (A)

## Estampa
- Ficheiro: ${pattern.value?.name || 'N/A'}
- Proporção Aplicada: ${(pattern.value?.scale * 100).toFixed(0)}%
- Rotação Aplicada: ${((pattern.value?.rotation * 180) / Math.PI).toFixed(1)}°

Aprovado por: (Cliente)
Data: ${new Date().toLocaleDateString('pt-BR')}
`
    zip.file('Informacoes_Tecnicas.txt', techInfo)

    const imageBlob = await generatePreviewImageBlob()
    if (imageBlob) {
      zip.file('Preview_Final.jpg', imageBlob)
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(zipBlob)
    link.download = 'Projeto_MockupCreatorPro.zip'
    link.click()
    URL.revokeObjectURL(link.href)
  } catch (error) {
    console.error('Erro ao gerar o download:', error)
    alert('Ocorreu um erro ao tentar gerar o ficheiro para download.')
  } finally {
    isDownloading.value = false
  }
}

function handleFinalize() {
  store.showSignatureModal(true)
}
</script>

<template>
  <div
    class="sidebar-overlay"
    :class="{ 'is-visible': store.workspace.isPreviewSidebarVisible }"
    @click.self="store.showPreviewSidebar(false)"
  >
    <aside class="preview-sidebar">
      <header class="sidebar-header">
        <h3>Detalhes do Projeto</h3>
        <button @click="store.showPreviewSidebar(false)" class="close-btn">&times;</button>
      </header>

      <div class="sidebar-content">
        <section class="info-section">
          <h4>Mockup</h4>
          <div class="info-card">
            <img v-if="mockup?.imageUrl" :src="mockup.imageUrl" class="thumbnail" />
            <div class="details">
              <span class="filename">{{ mockup?.name }}</span>
              <span class="dimensions"
                >{{ mockupDimensionsCm.width }} x {{ mockupDimensionsCm.height }} cm</span
              >
            </div>
          </div>
        </section>

        <section class="info-section">
          <h4>Estampa Aplicada</h4>
          <div v-if="pattern" class="info-card">
            <img v-if="pattern.imageUrl" :src="pattern.imageUrl" class="thumbnail" />
            <div class="details">
              <span class="filename">{{ pattern.name }}</span>
              <span class="dimensions">Escala: {{ (pattern.scale * 100).toFixed(0) }}%</span>
            </div>
          </div>
          <p v-else class="no-pattern">Nenhuma estampa aplicada.</p>
        </section>
      </div>

      <footer class="sidebar-footer">
        <button class="btn btn-secondary" @click="handleDownload" :disabled="isDownloading">
          {{ isDownloading ? 'A gerar...' : 'Baixar' }}
        </button>
        <button class="btn btn-primary" @click="handleFinalize">Finalizar e Aprovar</button>
      </footer>
    </aside>
  </div>
</template>

<style scoped>
.sidebar-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.2);
  z-index: 300;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
}
.sidebar-overlay.is-visible {
  opacity: 1;
  pointer-events: auto;
}
.preview-sidebar {
  position: fixed;
  top: 0;
  right: 0;
  width: 320px;
  height: 100%;
  background-color: var(--c-surface);
  border-left: 1px solid var(--c-border);
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  transform: translateX(100%);
  transition: transform 0.3s ease;
}
.is-visible .preview-sidebar {
  transform: translateX(0);
}
.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-4);
  border-bottom: 1px solid var(--c-border);
  flex-shrink: 0;
}
h3 {
  margin: 0;
  font-size: var(--fs-base);
  font-weight: var(--fw-semibold);
}
.close-btn {
  font-size: 1.5rem;
  font-weight: var(--fw-regular);
  color: var(--c-text-secondary);
  background: none;
  border: none;
  cursor: pointer;
}
.sidebar-content {
  padding: var(--spacing-4);
  overflow-y: auto;
  flex-grow: 1;
}
.info-section {
  margin-bottom: var(--spacing-5);
}
.info-section h4 {
  font-size: var(--fs-sm);
  font-weight: var(--fw-bold);
  color: var(--c-text-secondary);
  margin-bottom: var(--spacing-3);
  text-transform: uppercase;
}
.info-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-3);
  background-color: var(--c-background);
  border-radius: var(--radius-md);
}
.thumbnail {
  width: 60px;
  height: 60px;
  border-radius: var(--radius-sm);
  object-fit: cover;
  flex-shrink: 0;
}
.details {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
  overflow: hidden;
}
.filename {
  font-weight: var(--fw-medium);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dimensions {
  font-size: var(--fs-sm);
  color: var(--c-text-secondary);
}
.no-pattern {
  font-size: var(--fs-sm);
  color: var(--c-text-tertiary);
  text-align: center;
  padding: var(--spacing-4);
}
.sidebar-footer {
  padding: var(--spacing-4);
  border-top: 1px solid var(--c-border);
  display: flex;
  gap: var(--spacing-3);
  flex-shrink: 0;
}
.btn {
  flex: 1;
  padding: var(--spacing-3);
  border-radius: var(--radius-md);
  font-weight: var(--fw-semibold);
  border: none;
  cursor: pointer;
  transition: var(--transition-fast);
}
.btn-primary {
  background-color: var(--c-primary);
  color: var(--c-white);
}
.btn-primary:hover {
  background-color: var(--c-primary-hover);
}
.btn-secondary {
  background-color: var(--c-surface-dark);
  color: var(--c-text-primary);
}
.btn-secondary:hover {
  background-color: var(--c-border);
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
