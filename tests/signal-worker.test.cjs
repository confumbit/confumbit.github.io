// Run with: node --test tests/signal-worker.test.cjs
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {join} = require('node:path');
const {createContext, runInContext} = require('node:vm');

// Independent O(N²) DFT reference, deliberately separate from the worker's FFT.
function reference(data, bw) {
  const {W, H, N, OFFSET, FS} = data;
  const pixels = new Uint8ClampedArray(data.pixels);
  const result = new Uint8ClampedArray(pixels);
  if (bw === Infinity) return result;
  for (let y = 0; y < H; y++) {
    const start = y * W * 4;
    const uniform = Array.from({length: W}, (_, x) => x).every(x =>
      [0, 1, 2].every(c => pixels[start + x * 4 + c] === pixels[start + c]));
    if (uniform) continue;
    const channels = [[.299, .587, .114], [.596, -.274, -.322], [.211, -.523, .312]];
    const samples = channels.map((weights, channel) => {
      const signal = Array.from({length: N}, (_, x) => {
        const p = start + Math.max(0, Math.min(W - 1, x - OFFSET)) * 4;
        return weights.reduce((sum, weight, c) => sum + weight * pixels[p + c], 0);
      });
      const cutoff = [bw, Math.min(bw, 1.3), Math.min(bw, .5)][channel];
      const spectrum = signal.map((_, k) => {
        let re = 0, im = 0;
        signal.forEach((value, n) => {
          re += value * Math.cos(-2 * Math.PI * k * n / N);
          im += value * Math.sin(-2 * Math.PI * k * n / N);
        });
        const gain = k === 0 ? 1 : cutoff === 0 ? 0 :
          1 / Math.sqrt(1 + (Math.min(k, N-k) * FS / N / cutoff) ** 8);
        return [re * gain, im * gain];
      });
      return Array.from({length: W}, (_, x) => spectrum.reduce((sum, [re, im], k) => {
        const angle = 2 * Math.PI * k * (x + OFFSET) / N;
        return sum + (re * Math.cos(angle) - im * Math.sin(angle)) / N;
      }, 0));
    });
    for (let x = 0; x < W; x++) {
      const [Y, I, Q] = samples.map(channel => channel[x]), p = start + x * 4;
      result[p] = Y + .956 * I + .621 * Q;
      result[p+1] = Y - .272 * I - .647 * Q;
      result[p+2] = Y - 1.106 * I + 1.703 * Q;
    }
  }
  return result;
}

test('FFT filtering, cached repaints, and resized signals match a direct DFT', () => {
  let output;
  const context = createContext({onmessage: null, postMessage: value => { output = value; }});
  runInContext(readFileSync(join(__dirname, '../assets/signal-worker.js'), 'utf8'), context);
  const send = data => { context.onmessage({data}); return new Uint8ClampedArray(output.pixels); };
  for (const W of [11, 13, 11]) {
    const H = 6, N = 32, OFFSET = Math.floor((N-W)/2), FS = W / 52;
    const pixels = new Uint8ClampedArray(W * H * 4);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const p = (y * W + x) * 4;
      pixels.set(y === 0 ? [16, 16, 16, 255] :
        [(x * 37) % 256, (x * 19 + y % 2) % 256, (x * 71) % 256, 255], p);
    }
    const image = {W, H, N, OFFSET, FS, pixels: pixels.buffer, version: 1};
    for (let repaint = 0; repaint < 2; repaint++) {
      send({...image, type: 'prepare', bw: Infinity});
      for (const bw of [Infinity, 0, .1, .5, 1.3, 4.9, Infinity]) {
        const actual = send({type: 'filter', bw, version: 1});
        const expected = reference(image, bw);
        // Direct trigonometric summation can round a half-integer differently.
        actual.forEach((value, i) => assert.ok(Math.abs(value - expected[i]) <= 1,
          `width=${W}, bandwidth=${bw}, byte=${i}`));
        assert.deepEqual(send({type: 'filter', bw, version: 1}), actual);
        assert.deepEqual(send({...image, type: 'prepare', bw}), actual);
        if (bw === Infinity) assert.deepEqual(actual, pixels);
      }
      pixels[W * 4 + 1] ^= 127; // Invalidate one cached row without changing dimensions.
    }
  }
});
