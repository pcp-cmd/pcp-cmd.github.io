// Adapted from NikuKikai/NikuKikai.github.io at 18cad16b438792bf0d8d0842efac70819415db17.
// Source: src/pages/index/MangaRadialBackdrop.tsx and canvasForceSolver.ts.
// Shader strings are unchanged. The solver only has TypeScript types removed.
// Integration and Aleksi's responsive/keyboard behavior live in separate files.
// No upstream license declaration was found; see licenses/THIRD-PARTY.md.
(() => {
'use strict';
const VERTEX_SHADER = `#version 300 es

in vec2 a_position;

void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
}
`;
const FRAGMENT_SHADER = `#version 300 es
precision mediump float;

uniform vec2 u_resolution;
uniform vec2 u_bufferResolution;
uniform vec2 u_camera;
uniform vec2 u_center;
uniform float u_gridSize;
uniform float u_whiteRadius;
uniform float u_fadeRadius;
uniform float u_maxDotScale;
uniform float u_ditherStrength;

out vec4 outColor;

float circleCoverage(vec2 cellPosition, float radius) {
    float distanceToCenter = length(cellPosition);
    return distanceToCenter <= radius ? 1.0 : 0.0;
}

float hashCell(vec2 cell) {
    vec2 p = fract(cell * vec2(0.1031, 0.1030));
    p += dot(p, p.yx + 33.33);
    return fract((p.x + p.y) * p.x);
}

void main() {
    vec2 screen = gl_FragCoord.xy / u_bufferResolution * u_resolution;
    vec2 world = vec2(
        u_camera.x + screen.x - u_resolution.x * 0.5,
        u_camera.y + (u_resolution.y - screen.y) - u_resolution.y * 0.5
    );

    vec2 grid = mod(world + u_gridSize * 0.5, u_gridSize) - u_gridSize * 0.5;
    float distanceFromCenter = length(world - u_center);
    float t = clamp((distanceFromCenter - u_whiteRadius) / u_fadeRadius, 0.0, 1.0);
    vec2 cell = floor(world / u_gridSize);
    float dither = (hashCell(cell) - 0.5) * 0.16 * u_ditherStrength;
    float coverage = clamp(t + dither, 0.0, 1.0);
    float radius = u_gridSize * 0.5 * u_maxDotScale * sqrt(coverage);
    float ink = circleCoverage(grid, radius);

    outColor = vec4(vec3(1.0 - ink), 1.0);
}
`;



function scale(vector, factor) {
    return { x: vector.x * factor, y: vector.y * factor };
}

function clampLength(vector, maxLength) {
    const length = Math.hypot(vector.x, vector.y);
    if (!length || length <= maxLength) {
        return vector;
    }

    return scale(vector, maxLength / length);
}

function axisGapForce(distance, halfSpan, gap, buffer, pairForce) {
    const gapValue = Math.abs(distance) - halfSpan;
    const sign = distance >= 0 ? 1 : -1;

    if (gapValue < gap) {
        return sign * (gap - gapValue) * pairForce;
    }

    if (gapValue < gap + buffer) {
        const normalized = 1 - (gapValue - gap) / Math.max(buffer, 0.001);
        return sign * normalized * pairForce;
    }

    return 0;
}

function attract(self, other) {
    const dx = other.x - self.x;
    const dy = other.y - self.y;
    const gapX = Math.max(0, Math.abs(dx) - (self.w + other.w) / 2);
    const gapY = Math.max(0, Math.abs(dy) - (self.h + other.h) / 2);
    const signX = dx >= 0 ? 1 : -1;
    const signY = dy >= 0 ? 1 : -1;

    return {
        x: signX * gapX * (other.attractStrength ?? 0),
        y: signY * gapY * (other.attractStrength ?? 0),
    };
}

function randomReset(items) {
    const center = { x: 0, y: 0 };

    for (const item of items) {
        if (item.fixed && item.fixedPosition) {
            item.x = item.fixedPosition.x;
            item.y = item.fixedPosition.y;
        }
        else if (!Number.isFinite(item.x) || !Number.isFinite(item.y) || (item.x === 0 && item.y === 0)) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 180 + Math.random() * 260;
            item.x = center.x + Math.cos(angle) * radius;
            item.y = center.y + Math.sin(angle) * radius;
        }

        item.vx = 0;
        item.vy = 0;
        item.repelX = 0;
        item.repelY = 0;
    }
}

class ForceLayoutEngine {
    options;

    constructor(options) {
        this.options = options;
    }

    updateOptions(options) {
        this.options = options;
    }

    step(items, updateLayoutMotion) {
        const gap = this.options.gap;
        const dt = this.options.dt ?? 0.2;
        const damping = this.options.damping ?? 0.82;
        const buffer = this.options.buffer ?? gap;
        const iterationsPerStep = this.options.iterationsPerStep ?? 1;
        const pairForce = this.options.pairForce ?? 0.35;
        const maxSpeed = this.options.maxSpeed ?? 12;

        for (let iteration = 0; iteration < iterationsPerStep; iteration += 1) {
            const next = new Map();

            for (const item of items) {
                if (item.fixed) {
                    continue;
                }

                let attractX = 0;
                let attractY = 0;
                let repelX = 0;
                let repelY = 0;
                let repelCountX = 0;
                let repelCountY = 0;

                for (const other of items) {
                    if (other.id === item.id) {
                        continue;
                    }

                    // Attraction
                    const att = attract(item, other);
                    attractX += att.x;
                    attractY += att.y;


                    const gapX = Math.abs(item.x - other.x) - (item.w + other.w) / 2;
                    const gapY = Math.abs(item.y - other.y) - (item.h + other.h) / 2;
                    if (gapX >= gap + buffer || gapY >= gap + buffer) {
                        continue;
                    }

                    if (gapX >= gapY) {
                        repelX += axisGapForce(item.x - other.x, (item.w + other.w) / 2, gap, buffer, pairForce);
                        repelCountX += 1;
                    }
                    else {
                        repelY += axisGapForce(item.y - other.y, (item.h + other.h) / 2, gap, buffer, pairForce);
                        repelCountY += 1;
                    }
                }

                if (repelCountX > 0) {
                    repelX /= repelCountX;
                }
                if (repelCountY > 0) {
                    repelY /= repelCountY;
                }

                if (attractX * repelX < 0) {
                    attractX = 0;
                }
                if (attractY * repelY < 0) {
                    attractY = 0;
                }

                const velocity = clampLength({
                    x: item.vx * damping + (attractX + repelX) * (1 - damping),
                    y: item.vy * damping + (attractY + repelY) * (1 - damping),
                }, maxSpeed);

                const x = item.x + velocity.x * dt;
                const y = item.y + velocity.y * dt;

                if (Math.abs(x - item.x) > 1e-1 || Math.abs(y - item.y) > 1e-1) {

                    next.set(item.id, {
                        x,
                        y,
                        vx: velocity.x,
                        vy: velocity.y,
                        repelX,
                        repelY,
                    });
                }

            }

            for (const item of items) {
                const resolved = next.get(item.id);
                if (!resolved) {
                    continue;
                }

                updateLayoutMotion(item.id, resolved);
            }
        }
    }
}

window.NikuHome = Object.freeze({ vertexShader: VERTEX_SHADER, fragmentShader: FRAGMENT_SHADER, ForceLayoutEngine });
})();
