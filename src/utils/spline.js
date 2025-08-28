// src/utils/spline.js

// Implementação básica de Catmull-Rom spline para suavização de pontos
export class Spline {
    constructor(x, y) {
        this.points = [];
        for (let i = 0; i < x.length; i++) {
            this.points.push({ x: x[i], y: y[i] });
        }
    }

    // Calcula um ponto na curva Catmull-Rom
    getPoint(t) {
        if (t < 0 || t > this.points.length - 1) {
            return { x: 0, y: 0 }; // Fora dos limites, retornar algo razoável ou lançar erro
        }

        const p = this.points;
        const n = p.length;

        // Encontrar os 4 pontos de controlo relevantes
        let i = Math.floor(t);
        if (i < 0) i = 0;
        if (i >= n - 1) i = n - 2;

        const p0 = p[i === 0 ? 0 : i - 1];
        const p1 = p[i];
        const p2 = p[i + 1];
        const p3 = p[i + 1 >= n ? n - 1 : i + 2];

        // Normalizar t para o segmento atual [0, 1]
        t = t - i;

        const t2 = t * t;
        const t3 = t2 * t;

        // Fórmulas para Catmull-Rom
        const h00 = 2 * t3 - 3 * t2 + 1;
        const h10 = t3 - 2 * t2 + t;
        const h01 = -2 * t3 + 3 * t2;
        const h11 = t3 - t2;

        // Tangentes (assumindo alfa = 0.5 para Catmull-Rom centripetal)
        const m1x = (p2.x - p0.x) / 2;
        const m1y = (p2.y - p0.y) / 2;
        const m2x = (p3.x - p1.x) / 2;
        const m2y = (p3.y - p1.y) / 2;

        const px = h00 * p1.x + h10 * m1x + h01 * p2.x + h11 * m2x;
        const py = h00 * p1.y + h10 * m1y + h01 * p2.y + h11 * m2y;

        return { x: px, y: py };
    }
}
