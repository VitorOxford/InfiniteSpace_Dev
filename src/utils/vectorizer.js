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
    if (!potraceReady) {
      console.log("[vectorizer] Inicializando WASM...");
      await init();
      potraceReady = true;
      console.log("[vectorizer] WASM pronto!");
    }

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    const maxSize = 1024;
    const scale = Math.min(maxSize / image.width, maxSize / image.height, 1);
    canvas.width = Math.floor(image.width * scale);
    canvas.height = Math.floor(image.height * scale);

    // --- CORREÇÃO FINAL E MAIS IMPORTANTE ---
    // 1. Criamos um fundo branco sólido para remover qualquer ambiguidade.
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Desenhamos a imagem do usuário por cima do fundo branco.
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    // 3. Agora, obtemos os dados da imagem, que garantidamente não tem transparência.
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    // Não precisamos mais do loop para tratar a transparência.
    // --- FIM DA CORREÇÃO ---

    console.log(
      `[vectorizer] A enviar ImageData (${canvas.width}x${canvas.height}) para o motor potrace...`
    );

    const svgContent = await potrace(imageData, {
      turdSize: 2,
      threshold: 180, // Limite para o que é considerado "preto"
      turnPolicy: "minority"
    });

    console.log(
      "%c[vectorizer] Potrace-WASM retornou o SVG com sucesso!",
      "color: #00ff00; font-weight: bold;"
    );

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
