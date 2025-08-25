<script setup>
import { ref, computed } from 'vue'
import { useCanvasStore } from '@/stores/canvasStore'
import html2canvas from 'html2canvas'
import JSZip from 'jszip'

const store = useCanvasStore()
const hasDownloaded = ref(false)
const isApproved = ref(false)
const signedDocument = ref(null)
const signedDocumentName = ref('')
const isProcessing = ref(false)

const documentUrl =
  'https://cdn.shopify.com/s/files/1/0661/4574/6991/files/Termos_Uso_MockupCreatorPro_EstudioMJ.pdf?v=1755001824'
const canSubmit = computed(
  () => hasDownloaded.value && isApproved.value && signedDocument.value && !isProcessing.value,
)

function handleDownloadClick() {
  window.open(documentUrl, '_blank')
  hasDownloaded.value = true
}

function handleFileChange(event) {
  const file = event.target.files[0]
  if (file) {
    signedDocument.value = file
    signedDocumentName.value = file.name
  }
}

async function generatePreviewImageBlob() {
  const artboard = document.querySelector('.artboard')
  if (!artboard) return null
  const canvas = await html2canvas(artboard, {
    allowTaint: true,
    useCORS: true,
    backgroundColor: '#f0f2f5',
    scale: 3,
  })
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.95))
}

async function handleSubmit() {
  if (!canSubmit.value) {
    alert('Por favor, baixe os termos, marque a aprovação e anexe o documento assinado.')
    return
  }
  isProcessing.value = true

  try {
    const zip = new JSZip()
    const mockup = store.mockupLayer
    const pattern = store.layers.find((l) => l.type === 'pattern')

    const mockupDimensionsCm = (m) => {
      if (!m || !m.metadata.dpi) return { width: 'N/A', height: 'N/A' }
      const { metadata, scale } = m
      return {
        width: (((metadata.originalWidth * scale) / metadata.dpi) * 2.54).toFixed(2),
        height: (((metadata.originalHeight * scale) / metadata.dpi) * 2.54).toFixed(2),
      }
    }
    const m_dims = mockupDimensionsCm(mockup)
    const p_scale = pattern ? (pattern.scale * 100).toFixed(0) : 'N/A'
    const p_rotation = pattern ? ((pattern.rotation * 180) / Math.PI).toFixed(1) : 'N/A'

    // --- CORREÇÃO AQUI ---
    const techInfo = `
# Informações Técnicas - MockupCreator Pro

## Mockup
- Ficheiro: ${mockup?.name || 'N/A'}
- Dimensões Finais: ${m_dims.width} cm (Largura) x ${m_dims.height} cm (Altura)

## Estampa
- Ficheiro: ${pattern?.name || 'N/A'}
- Proporção Aplicada: ${p_scale}%
- Rotação Aplicada: ${p_rotation}°

Aprovado por: (Cliente)
Data: ${new Date().toLocaleDateString('pt-BR')}
`
    zip.file('Informacoes_Tecnicas.txt', techInfo.trim())

    // O resto da lógica permanece
    const previewBlob = await generatePreviewImageBlob()
    if (previewBlob) zip.file('Preview_Final.jpg', previewBlob)

    if (signedDocument.value)
      zip.file(`Documento_Assinado_${signedDocumentName.value}`, signedDocument.value)

    const mockupBlob = await store.getLayerBlob(mockup)
    if (mockupBlob) zip.file(`Mockup_${mockup.name}`, mockupBlob)

    const patternBlob = await store.getLayerBlob(pattern)
    if (patternBlob) zip.file(`Estampa_${pattern.name}`, patternBlob)

    const zipBlob = await zip.generateAsync({ type: 'blob' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(zipBlob)
    link.download = `PROJETO_${mockup?.name.split('.')[0] || 'Final'}.zip`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(link.href)

    alert(
      'Pacote de aprovação baixado! Por favor, anexe o ficheiro .zip que acabou de baixar na conversa do WhatsApp que irá abrir.',
    )

    // --- CORREÇÃO AQUI ---
    const message = `
Olá!

Estou a finalizar um projeto no MockupCreator Pro e gostaria de o aprovar.

*Detalhes do Projeto:*
- *Mockup:* ${mockup?.name || 'N/A'}
- *Dimensões do Mockup:* ${m_dims.width} x ${m_dims.height} cm
- *Estampa:* ${pattern?.name || 'N/A'}
- *Escala da Estampa:* ${p_scale}%

*Aprovação:*
- [x] Li e aprovo os termos (documento baixado).
- [x] Pacote .zip com todos os ficheiros em anexo.

Obrigado!
`
    const encodedMessage = encodeURIComponent(message.trim())
    const whatsappUrl = `https://wa.me/5515991876055?text=${encodedMessage}`
    window.open(whatsappUrl, '_blank')

    store.showSignatureModal(false)
    store.showPreviewSidebar(false)
  } catch (error) {
    console.error('Erro ao finalizar o projeto:', error)
    alert('Ocorreu um erro ao gerar o pacote de aprovação. Por favor, tente novamente.')
  } finally {
    isProcessing.value = false
  }
}
</script>

<template>
  <div
    v-if="store.workspace.isSignatureModalVisible"
    class="modal-overlay"
    @click.self="store.showSignatureModal(false)"
  >
    <div class="modal-content">
      <h3 class="modal-title">Aprovação do Projeto</h3>
      <p class="modal-subtitle">
        Para finalizar, baixe os termos, assine e anexe o documento abaixo.
      </p>
      <div class="download-section">
        <button @click="handleDownloadClick" class="btn-download">
          1. Baixar Termos para Assinatura
        </button>
        <p class="download-info">O documento será aberto numa nova aba.</p>
      </div>
      <div class="approval-section" :class="{ disabled: !hasDownloaded }">
        <div class="checkbox-wrapper">
          <input
            type="checkbox"
            id="approval-check"
            v-model="isApproved"
            :disabled="!hasDownloaded"
          />
          <label for="approval-check">Li, concordo e assinei os termos de aprovação.</label>
        </div>
        <label for="file-upload" class="file-upload-label"> 2. Anexar Documento Assinado </label>
        <input
          id="file-upload"
          type="file"
          @change="handleFileChange"
          accept="image/*,.pdf"
          hidden
          :disabled="!hasDownloaded"
        />
        <span v-if="signedDocumentName" class="file-name">{{ signedDocumentName }}</span>
      </div>
      <button @click="handleSubmit" class="btn-submit" :disabled="!canSubmit">
        {{ isProcessing ? 'A processar...' : '3. Finalizar e Enviar via WhatsApp' }}
      </button>
    </div>
  </div>
</template>
<style scoped>
.modal-overlay {
  z-index: 1001;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal-content {
  background-color: var(--c-surface);
  padding: var(--spacing-6);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  width: 90%;
  max-width: 500px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-5);
}
.modal-title {
  font-size: 1.5rem;
  margin: 0;
}
.modal-subtitle {
  color: var(--c-text-secondary);
  margin: 0;
  margin-top: -10px;
}
.download-section {
  text-align: center;
}
.btn-download {
  width: 100%;
  padding: var(--spacing-3);
  background-color: var(--c-primary);
  color: var(--c-white);
  border: none;
  border-radius: var(--radius-md);
  font-weight: var(--fw-semibold);
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.2s;
}
.btn-download:hover {
  background-color: var(--c-primary-hover);
}
.download-info {
  font-size: var(--fs-xs);
  color: var(--c-text-tertiary);
  margin-top: var(--spacing-2);
}
.approval-section {
  padding: var(--spacing-4);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  transition: opacity 0.3s;
}
.approval-section.disabled {
  opacity: 0.5;
  pointer-events: none;
  background-color: var(--c-background);
}
.checkbox-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-2);
  margin-bottom: var(--spacing-4);
}
#approval-check {
  width: 18px;
  height: 18px;
}
.file-upload-label {
  display: inline-block;
  padding: var(--spacing-3) var(--spacing-5);
  background-color: var(--c-surface-dark);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-weight: var(--fw-semibold);
  transition: var(--transition-fast);
}
.file-upload-label:hover {
  background-color: var(--c-border);
}
.file-name {
  display: block;
  margin-top: var(--spacing-2);
  color: var(--c-text-secondary);
  font-style: italic;
}
.btn-submit {
  width: 100%;
  padding: var(--spacing-3);
  background-color: #25d366;
  color: white;
  border-radius: var(--radius-md);
  font-weight: var(--fw-bold);
  font-size: 1rem;
}
.btn-submit:disabled {
  background-color: var(--c-border);
  color: var(--c-text-tertiary);
  cursor: not-allowed;
}
</style>
