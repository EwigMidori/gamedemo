export interface NoiseOptions {
  seed: number;
}

function fract(value: number): number {
  return value - Math.floor(value);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

// Deterministic hash -> [0, 1)
function hash2D(x: number, y: number, seed: number): number {
  const n = Math.sin((x + seed * 17.31) * 127.1 + (y - seed * 9.13) * 311.7) * 43758.5453123;
  return fract(n);
}

// Value noise with bilinear interpolation.
export function valueNoise2D(x: number, y: number, options: NoiseOptions): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = x0 + 1;
  const y1 = y0 + 1;

  const sx = smoothstep(x - x0);
  const sy = smoothstep(y - y0);

  const n00 = hash2D(x0, y0, options.seed);
  const n10 = hash2D(x1, y0, options.seed);
  const n01 = hash2D(x0, y1, options.seed);
  const n11 = hash2D(x1, y1, options.seed);

  const ix0 = lerp(n00, n10, sx);
  const ix1 = lerp(n01, n11, sx);
  return lerp(ix0, ix1, sy);
}

export function fbm2D(
  x: number,
  y: number,
  options: NoiseOptions & { octaves?: number; lacunarity?: number; gain?: number },
): number {
  const octaves = options.octaves ?? 5;
  const lacunarity = options.lacunarity ?? 2;
  const gain = options.gain ?? 0.5;

  let amplitude = 1;
  let frequency = 1;
  let sum = 0;
  let norm = 0;

  for (let i = 0; i < octaves; i += 1) {
    sum += valueNoise2D(x * frequency, y * frequency, options) * amplitude;
    norm += amplitude;
    amplitude *= gain;
    frequency *= lacunarity;
  }

  return norm > 0 ? sum / norm : 0;
}

