'use strict';

// YIQ scanline filtering. Retain only the previous image's unique rows so
// hover/focus repaints can reuse their spectra without an unbounded cache.
let W, H, N, OFFSET, FS, source, out, groups;
let previousRows = new Map(), planSize = 0, swaps, stages, rows, imag;
let gainBandwidth, gains;

function planFFT() {
  if (planSize === N) return;
  planSize = N;
  swaps = [];
  for (let i = 1, j = 0; i < N; i++) {
    let bit = N >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) swaps.push(i, j);
  }
  stages = [];
  for (let len = 2; len <= N; len *= 2) {
    const angle = -2 * Math.PI / len, wr = Math.cos(angle), wi = Math.sin(angle);
    stages.push({len, wr, wi});
  }
  rows = Array.from({length: 3}, () => new Float64Array(N));
  imag = new Float64Array(N);
  gainBandwidth = undefined;
}

function fft(re, im, inverse = false) {
  for (let k = 0; k < swaps.length; k += 2) {
    const a = swaps[k], b = swaps[k + 1];
    let temp = re[a]; re[a] = re[b]; re[b] = temp;
    temp = im[a]; im[a] = im[b]; im[b] = temp;
  }
  for (const {len, wr, wi} of stages) {
    const step = inverse ? -wi : wi;
    for (let start = 0; start < N; start += len) {
      let ar = 1, ai = 0;
      for (let j = 0; j < len / 2; j++) {
        const a = start + j, b = a + len / 2;
        const tr = re[b] * ar - im[b] * ai, ti = re[b] * ai + im[b] * ar;
        re[b] = re[a] - tr; im[b] = im[a] - ti;
        re[a] += tr; im[a] += ti;
        const next = ar * wr - ai * step;
        ai = ar * step + ai * wr; ar = next;
      }
    }
  }
  if (inverse) for (let i = 0; i < N; i++) { re[i] /= N; im[i] /= N; }
}

function equalRow(a, b) {
  const left = new Uint32Array(a.buffer, a.byteOffset, a.length / 4);
  const right = new Uint32Array(b.buffer, b.byteOffset, b.length / 4);
  for (let i = 0; i < left.length; i++) if (left[i] !== right[i]) return false;
  return true;
}

function prepare(data) {
  if (W !== data.W || N !== data.N || OFFSET !== data.OFFSET || FS !== data.FS) {
    previousRows.clear(); gainBandwidth = undefined;
  }
  ({W, H, N, OFFSET, FS} = data);
  source = new Uint8ClampedArray(data.pixels);
  if (out?.length !== source.length) out = new Uint8ClampedArray(source.length);
  groups = null; // Full bandwidth never needs spectra or an FFT plan.
}

function prepareRows() {
  planFFT();
  const nextRows = new Map();
  const packed = new Uint32Array(source.buffer);
  groups = [];
  for (let y = 0; y < H; y++) {
    const pixels = source.subarray(y * W * 4, (y + 1) * W * 4);
    let uniform = true, hash = 2166136261;
    for (let x = 0; x < W; x++) {
      const pixel = packed[y * W + x];
      if ((pixel & 0xffffff) !== (packed[y * W] & 0xffffff)) uniform = false;
      hash = Math.imul(hash ^ pixel, 16777619);
    }
    if (uniform) continue;
    // Verify every hash match: collisions must never change image content.
    let row = nextRows.get(hash)?.find(entry => equalRow(entry.pixels, pixels));
    if (row) { row.destinations.push(y); continue; }
    const cached = previousRows.get(hash)?.find(entry => equalRow(entry.pixels, pixels));
    row = {pixels: cached?.pixels || pixels.slice(), channels: cached?.channels,
      filtered: cached?.filtered, bandwidth: cached?.bandwidth, destinations: [y]};
    if (!nextRows.has(hash)) nextRows.set(hash, []);
    nextRows.get(hash).push(row);
    groups.push(row);
  }
  previousRows = nextRows;
}

function spectrum(row) {
  if (row.channels) return;
  row.channels = Array.from({length: 3}, () => [new Float64Array(N), new Float64Array(N)]);
  for (let x = 0; x < N; x++) {
    const p = Math.max(0, Math.min(W - 1, x - OFFSET)) * 4;
    const r = row.pixels[p], g = row.pixels[p + 1], b = row.pixels[p + 2];
    row.channels[0][0][x] = .299*r + .587*g + .114*b;
    row.channels[1][0][x] = .596*r - .274*g - .322*b;
    row.channels[2][0][x] = .211*r - .523*g + .312*b;
  }
  for (const [re, im] of row.channels) fft(re, im);
}

function reconstruct(bw) {
  if (bw === Infinity) return source.slice().buffer;
  if (!groups) prepareRows();
  if (gainBandwidth !== bw) {
    gains = [bw, Math.min(bw, 1.3), Math.min(bw, .5)].map(cutoff =>
      Float64Array.from({length: N}, (_, k) => k === 0 ? 1 : cutoff === 0 ? 0 :
        1 / Math.sqrt(1 + (Math.min(k, N-k) * FS / N / cutoff) ** 8)));
    gainBandwidth = bw;
  }
  out.set(source);
  for (const row of groups) {
    if (!row.filtered || row.bandwidth !== bw) {
      spectrum(row);
      for (let c = 0; c < 3; c++) {
        const [re, im] = row.channels[c], samples = rows[c];
        for (let k = 0; k < N; k++) { samples[k] = re[k] * gains[c][k]; imag[k] = im[k] * gains[c][k]; }
        fft(samples, imag, true);
      }
      if (!row.filtered) row.filtered = row.pixels.slice();
      for (let x = 0; x < W; x++) {
        const k = x + OFFSET, p = x * 4, Y = rows[0][k], I = rows[1][k], Q = rows[2][k];
        row.filtered[p] = Y + .956*I + .621*Q;
        row.filtered[p+1] = Y - .272*I - .647*Q;
        row.filtered[p+2] = Y - 1.106*I + 1.703*Q;
      }
      row.bandwidth = bw;
    }
    for (const y of row.destinations) out.set(row.filtered, y * W * 4);
  }
  return out.slice().buffer;
}

onmessage = ({data}) => {
  if (data.type === 'prepare') prepare(data);
  const pixels = reconstruct(data.bw);
  postMessage({pixels, W, H, version: data.version, bw: data.bw}, [pixels]);
};
