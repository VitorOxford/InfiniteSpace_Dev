// src/utils/skeletonizer.js

/**
 * Executa o algoritmo de afinamento Zhang-Suen em uma imagem.
 * @param {HTMLCanvasElement} canvas - O canvas com a imagem a ser processada.
 * @returns {HTMLCanvasElement} Um novo canvas contendo apenas o esqueleto da imagem.
 */
export function zhangSuenSkeletonize(canvas) {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const width = canvas.width;
    const height = canvas.height;
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // --- CORREÇÃO APLICADA AQUI ---
    // Converte para uma matriz binária, mas agora respeitando a transparência
    let grid = new Array(height).fill(0).map(() => new Array(width).fill(0));
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const alpha = data[idx + 3]; // Pega o canal de transparência (alfa)

            // Um pixel faz parte do desenho (valor 1) SOMENTE SE ele for visível (alfa > 128)
            // E não for branco.
            if (alpha > 128 && (data[idx] < 250 || data[idx + 1] < 250 || data[idx + 2] < 250)) {
                grid[y][x] = 1;
            }
        }
    }
    // --- FIM DA CORREÇÃO ---

    let pointsToChange = [];
    let hasChanged;

    do {
        hasChanged = false;
        // Primeira sub-iteração
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                if (grid[y][x] === 1 && checkConditions(grid, x, y, 1)) {
                    pointsToChange.push({ x, y });
                }
            }
        }
        if (pointsToChange.length > 0) {
            pointsToChange.forEach(p => grid[p.y][p.x] = 0);
            hasChanged = true;
            pointsToChange = [];
        }

        // Segunda sub-iteração
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                if (grid[y][x] === 1 && checkConditions(grid, x, y, 2)) {
                    pointsToChange.push({ x, y });
                }
            }
        }
        if (pointsToChange.length > 0) {
            pointsToChange.forEach(p => grid[p.y][p.x] = 0);
            hasChanged = true;
            pointsToChange = [];
        }

    } while (hasChanged);

    // Cria um novo canvas com o resultado
    const resultCanvas = document.createElement('canvas');
    resultCanvas.width = width;
    resultCanvas.height = height;
    const resultCtx = resultCanvas.getContext('2d');
    const resultImageData = resultCtx.createImageData(width, height);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const color = (grid[y][x] === 1) ? 0 : 255;
            resultImageData.data[idx] = color;     // R
            resultImageData.data[idx + 1] = color; // G
            resultImageData.data[idx + 2] = color; // B
            resultImageData.data[idx + 3] = (color === 0) ? 255 : 0; // Deixa o fundo transparente
        }
    }
    resultCtx.putImageData(resultImageData, 0, 0);

    return resultCanvas;
}

function checkConditions(grid, x, y, step) {
    const p2 = grid[y-1][x], p3 = grid[y-1][x+1], p4 = grid[y][x+1],
          p5 = grid[y+1][x+1], p6 = grid[y+1][x], p7 = grid[y+1][x-1],
          p8 = grid[y][x-1], p9 = grid[y-1][x-1];

    const B = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
    if (B < 2 || B > 6) return false;

    const A = (p2 === 0 && p3 === 1) + (p3 === 0 && p4 === 1) +
              (p4 === 0 && p5 === 1) + (p5 === 0 && p6 === 1) +
              (p6 === 0 && p7 === 1) + (p7 === 0 && p8 === 1) +
              (p8 === 0 && p9 === 1) + (p9 === 0 && p2 === 1);
    if (A !== 1) return false;

    if (step === 1) {
        if (p2 * p4 * p6 !== 0) return false;
        if (p4 * p6 * p8 !== 0) return false;
    } else { // step === 2
        if (p2 * p4 * p8 !== 0) return false;
        if (p2 * p6 * p8 !== 0) return false;
    }

    return true;
}

export function traceSkeletonToSvgPaths(skeletonCanvas) {
    return import("esm-potrace-wasm").then(async ({ potrace, init }) => {
        // Garante que o WASM está inicializado
        await init();
        const ctx = skeletonCanvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, skeletonCanvas.width, skeletonCanvas.height);
        return potrace(imageData, { turdSize: 2, threshold: 128 });
    });
}
