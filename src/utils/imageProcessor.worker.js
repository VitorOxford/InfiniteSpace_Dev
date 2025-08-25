// src/utils/imageProcessor.worker.js

/**
 * Função para extrair o DPI de um ficheiro de imagem, adaptada para Web Workers.
 */
async function getDpiFromImage(file) {
  try {
    // Usa file.arrayBuffer() que está disponível em workers, em vez de FileReader
    const arrayBuffer = await file.slice(0, 128 * 1024).arrayBuffer();
    const view = new DataView(arrayBuffer);

    // O resto da lógica para ler os metadados EXIF permanece igual
    if (view.byteLength < 2 || view.getUint16(0, false) !== 0xFFD8) {
      return 96;
    }
    let offset = 2;
    while (offset < view.byteLength - 2) {
      const marker = view.getUint16(offset, false);
      offset += 2;
      if (marker === 0xFFE1) {
        if (view.getUint32(offset + 2, false) !== 0x45786966) {
          offset += view.getUint16(offset, false);
          continue;
        }
        const tiffOffset = offset + 6;
        const bigEndian = view.getUint16(tiffOffset, false) === 0x4D4D;
        let ifdOffset = tiffOffset + view.getUint32(tiffOffset + 4, bigEndian);
        if (ifdOffset >= view.byteLength) return 96;
        const tagCount = view.getUint16(ifdOffset, bigEndian);
        ifdOffset += 2;
        for (let i = 0; i < tagCount; i++) {
          const currentTagOffset = ifdOffset + i * 12;
          if (currentTagOffset + 12 > view.byteLength) continue;
          const tagId = view.getUint16(currentTagOffset, bigEndian);
          if (tagId === 0x011A) { // XResolution tag
            const valueType = view.getUint16(currentTagOffset + 2, bigEndian);
            if (valueType !== 5) continue; // RATIONAL type
            const valueOffset = tiffOffset + view.getUint32(currentTagOffset + 8, bigEndian);
            if (valueOffset + 8 > view.byteLength) continue;
            const numerator = view.getUint32(valueOffset, bigEndian);
            const denominator = view.getUint32(valueOffset + 4, bigEndian);
            if (denominator !== 0) return Math.round(numerator / denominator);
          }
        }
      }
      if (view.byteLength <= offset + 2) return 96;
      offset += view.getUint16(offset, false);
    }
    return 96;
  } catch (e) {
    console.error('Erro ao ler o ficheiro para DPI no worker:', e);
    return 96;
  }
}

/**
 * Listener principal do worker.
 */
self.onmessage = async (e) => {
  const { file } = e.data;
  const MAX_DISPLAY_SIZE = 8192;
  const LOW_RES_PROXY_SIZE = 1000;

  try {
    const dpi = await getDpiFromImage(file);
    let imageBitmap = await createImageBitmap(file);

    const originalWidth = imageBitmap.width;
    const originalHeight = imageBitmap.height;

    let proxyBitmap = null;
    let lowResProxy = null;

    if (originalWidth > LOW_RES_PROXY_SIZE || originalHeight > LOW_RES_PROXY_SIZE) {
        const lowResRatio = Math.min(LOW_RES_PROXY_SIZE / originalWidth, LOW_RES_PROXY_SIZE / originalHeight);
        lowResProxy = await createImageBitmap(file, {
            resizeWidth: Math.round(originalWidth * lowResRatio),
            resizeHeight: Math.round(originalHeight * lowResRatio),
            resizeQuality: 'low',
        });
    }

    if (originalWidth > MAX_DISPLAY_SIZE || originalHeight > MAX_DISPLAY_SIZE) {
      const ratio = Math.min(MAX_DISPLAY_SIZE / originalWidth, MAX_DISPLAY_SIZE / originalHeight);
      proxyBitmap = await createImageBitmap(file, {
        resizeWidth: Math.round(originalWidth * ratio),
        resizeHeight: Math.round(originalHeight * ratio),
        resizeQuality: 'high',
      });
    }

    self.postMessage({
      status: 'success',
      payload: {
        dpi,
        imageBitmap,
        proxyBitmap,
        lowResProxy,
        originalWidth,
        originalHeight,
      },
    }, [imageBitmap, proxyBitmap, lowResProxy].filter(Boolean));

  } catch (error) {
    console.error('Erro no Worker de processamento de imagem:', error);
    self.postMessage({
      status: 'error',
      payload: error.message,
    });
  }
};
