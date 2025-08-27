// src/utils/vectorizer.js
import ImageTracer from 'imagetracerjs';

/**
 * Vetoriza uma imagem a partir de um canvas ou ImageBitmap.
 * @param {HTMLCanvasElement | ImageBitmap} image - A imagem a ser vetorizada.
 * @returns {Promise<string>} Uma promessa que resolve com o caminho SVG.
 */
export function vectorizeCanvas(image) {
  return new Promise((resolve, reject) => {
    try {
      // 1. Prepara um canvas com fundo branco para garantir o contraste.
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // 2. Opções de vetorização otimizadas para logotipos (preto e branco).
      const options = {
        numberofcolors: 2, // Força a imagem a ter apenas 2 cores (preto e branco)
        mincolorratio: 0.02,
        ltres: 1,
        qtres: 1,
      };

      // 3. Usa o método assíncrono da biblioteca, que é mais robusto.
      ImageTracer.imageToTracedata(imageData, (tracedata) => {
          // 4. Converte os dados do traçado para uma string SVG.
          const svgData = ImageTracer.getSvgString(tracedata, { viewbox: true });

          // 5. Extrai o caminho 'd' da string SVG.
          const match = svgData.match(/d="([^"]+)"/);
          if (match && match[1]) {
            resolve(match[1]);
          } else {
            reject(new Error('Vetorização não produziu um caminho válido. A imagem pode ser de cor única.'));
          }
        },
        options
      );
    } catch (error) {
      reject(error);
    }
  });
}
