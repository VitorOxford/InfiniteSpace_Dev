// src/utils/vectorizer.js
import { potrace, init } from "esm-potrace-wasm";

let potraceReady = false;

/**
 * Vetoriza uma imagem usando a biblioteca esm-potrace-wasm.
 * @param {HTMLCanvasElement | ImageBitmap} image - A imagem a ser vetorizada.
 * @returns {Promise<string>} SVG completo em string.
 */
export async function vectorizeCanvas(image) {
  console.log("[vectorizer] A usar o motor ESM-POTRACE-WASM.");

  try {
    // garante init do WASM apenas uma vez
    if (!potraceReady) {
      console.log("[vectorizer] Inicializando WASM...");
      await init();
      potraceReady = true;
      console.log("[vectorizer] WASM pronto!");
    }

    // cria canvas auxiliar
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    // downscale opcional (máx 1024 px, pode aumentar/diminuir)
    const maxSize = 1024;
    const scale = Math.min(maxSize / image.width, maxSize / image.height, 1);
    canvas.width = Math.floor(image.width * scale);
    canvas.height = Math.floor(image.height * scale);

    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    // garante grayscale (potrace trabalha melhor assim)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.3 * data[i] + 0.59 * data[i + 1] + 0.11 * data[i + 2];
      data[i] = data[i + 1] = data[i + 2] = gray;
      data[i + 3] = 255; // força opacidade total
    }
    ctx.putImageData(imageData, 0, 0);

    console.log(
      `[vectorizer] A enviar ImageData (${canvas.width}x${canvas.height}) para o motor potrace...`
    );

    // chamada real ao potrace
    const svgContent = await potrace(imageData, {
      turdSize: 2,         // ignora só ruído pequeno
      threshold: 180,      // sensibilidade ao contraste
      turnPolicy: "minority"
    });

    console.log(
      "%c[vectorizer] Potrace-WASM retornou o SVG com sucesso!",
      "color: #00ff00; font-weight: bold;"
    );

    console.log("[vectorizer] SVG gerado:", svgContent.slice(0, 200) + "...");

    // retorna o SVG inteiro (com <svg>, width, height, path etc.)
    return svgContent;

  } catch (error) {
    console.error(
      "%c[vectorizer] ERRO no motor Potrace-WASM:",
      "color: #ff0000; font-weight: bold;",
      error?.message,
      error
    );
    throw new Error("Ocorreu um erro durante o processo de vetorização.");
  }
}
