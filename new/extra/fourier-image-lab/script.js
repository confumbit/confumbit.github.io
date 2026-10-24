'use strict';

/* Replace this with the filename of your image in the project root. */
const IMAGE_SRC = './logo.jpg';

const MAX_DIMENSION = 256;
const DIMENSION_CHOICES = [16, 32, 64, 128, 256];
const SLIDER_STEPS = 1000;
const POLYNOMIAL_SAMPLE_COUNT = 256;
const MAX_POLYNOMIAL_DEGREE = POLYNOMIAL_SAMPLE_COUNT - 1;

const originalCanvas = document.getElementById('originalCanvas');
const resultCanvas = document.getElementById('resultCanvas');
const originalPlaceholder = document.getElementById('originalPlaceholder');
const resultPlaceholder = document.getElementById('resultPlaceholder');
const termsSlider = document.getElementById('termsSlider');
const termsValue = document.getElementById('termsValue');
const termsTotal = document.getElementById('termsTotal');
const termsPercent = document.getElementById('termsPercent');
const gridInfo = document.getElementById('gridInfo');
const renderCaption = document.getElementById('renderCaption');
const statusMessage = document.getElementById('statusMessage');
const resetButton = document.getElementById('resetButton');

let gridWidth = 0;
let gridHeight = 0;
let pixelCount = 0;
let polynomialCoefficients = [];
let isReady = false;
let renderPending = false;

function setStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.classList.toggle('error', isError);
}

function nearestGridSize(aspectRatio) {
  let best = null;
  for (const width of DIMENSION_CHOICES) {
    if (width > MAX_DIMENSION) continue;
    for (const height of DIMENSION_CHOICES) {
      if (height > MAX_DIMENSION) continue;
      const error = Math.abs(Math.log((width / height) / aspectRatio));
      const area = width * height;
      if (!best || error < best.error - 1e-10 ||
          (Math.abs(error - best.error) <= 1e-10 && area > best.area)) {
        best = { width, height, error, area };
      }
    }
  }
  return { width: best.width, height: best.height };
}

function makeContainCanvas(image, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.fillStyle = '#000000';
  context.fillRect(0, 0, width, height);

  const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = Math.max(1, Math.round(image.naturalWidth * scale));
  const drawHeight = Math.max(1, Math.round(image.naturalHeight * scale));
  const x = Math.floor((width - drawWidth) / 2);
  const y = Math.floor((height - drawHeight) / 2);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, x, y, drawWidth, drawHeight);
  return { canvas, context };
}

function sampleChannel(pixels, channel, position) {
  const left = Math.floor(position);
  const right = Math.min(pixelCount - 1, left + 1);
  const fraction = position - left;
  const start = left * 4 + channel;
  const end = right * 4 + channel;
  return pixels[start] * (1 - fraction) + pixels[end] * fraction;
}

/*
 * Fit a Chebyshev series at its roots. The expansion is a single-variable
 * polynomial and remains well-conditioned at the high degrees used here.
 */
function interpolateRaster(imageData) {
  const pixels = imageData.data;
  const coefficients = Array.from(
    { length: 3 },
    () => new Float64Array(POLYNOMIAL_SAMPLE_COUNT)
  );

  for (let sample = 0; sample < POLYNOMIAL_SAMPLE_COUNT; sample++) {
    const angle = Math.PI * (sample + 0.5) / POLYNOMIAL_SAMPLE_COUNT;
    const rasterPosition = (1 + Math.cos(angle)) * 0.5 * (pixelCount - 1);
    for (let channel = 0; channel < 3; channel++) {
      const value = sampleChannel(pixels, channel, rasterPosition);
      for (let degree = 0; degree < POLYNOMIAL_SAMPLE_COUNT; degree++) {
        coefficients[channel][degree] += value * Math.cos(degree * angle);
      }
    }
  }

  for (let channel = 0; channel < 3; channel++) {
    coefficients[channel][0] /= POLYNOMIAL_SAMPLE_COUNT;
    for (let degree = 1; degree < POLYNOMIAL_SAMPLE_COUNT; degree++) {
      coefficients[channel][degree] *= 2 / POLYNOMIAL_SAMPLE_COUNT;
    }
  }
  return coefficients;
}

function sliderToDegree(sliderValue) {
  const progress = Number(sliderValue) / SLIDER_STEPS;
  return Math.round(progress * progress * MAX_POLYNOMIAL_DEGREE);
}

function evaluatePolynomial(coefficients, degree, x) {
  let next = 0;
  let afterNext = 0;

  for (let term = degree; term >= 1; term--) {
    const current = 2 * x * next - afterNext + coefficients[term];
    afterNext = next;
    next = current;
  }
  return x * next - afterNext + coefficients[0];
}

function reconstruct(degree) {
  const output = resultCanvas.getContext('2d').createImageData(gridWidth, gridHeight);
  const outputPixels = output.data;

  for (let pixel = 0; pixel < pixelCount; pixel++) {
    const x = pixelCount === 1 ? 0 : 2 * pixel / (pixelCount - 1) - 1;
    for (let channel = 0; channel < 3; channel++) {
      const value = evaluatePolynomial(polynomialCoefficients[channel], degree, x);
      outputPixels[pixel * 4 + channel] = Math.max(0, Math.min(255, Math.round(value)));
    }
    outputPixels[pixel * 4 + 3] = 255;
  }

  resultCanvas.getContext('2d').putImageData(output, 0, 0);

  const termCount = degree + 1;
  termsValue.textContent = termCount.toLocaleString();
  termsTotal.textContent = `of ${POLYNOMIAL_SAMPLE_COUNT.toLocaleString()} polynomial terms`;
  termsPercent.textContent = `${(termCount / POLYNOMIAL_SAMPLE_COUNT * 100).toFixed(termCount < 26 ? 1 : 0)}% of polynomial terms used`;
  renderCaption.textContent = degree === MAX_POLYNOMIAL_DEGREE
    ? 'Full 256-sample polynomial interpolant along the raster scan.'
    : `Degree ${degree.toLocaleString()} polynomial approximation of the raster scan.`;
}

function requestRender() {
  if (!isReady || renderPending) return;
  renderPending = true;
  requestAnimationFrame(() => {
    renderPending = false;
    try {
      reconstruct(sliderToDegree(termsSlider.value));
    } catch (error) {
      console.error(error);
      setStatus('Reconstruction failed. Try a smaller image or a modern browser.', true);
    }
  });
}

function setCanvasDimensions(canvas, width, height) {
  canvas.width = width;
  canvas.height = height;
  canvas.style.aspectRatio = `${width} / ${height}`;
}

function initializeFromImage(image) {
  const grid = nearestGridSize(image.naturalWidth / image.naturalHeight);
  gridWidth = grid.width;
  gridHeight = grid.height;
  pixelCount = gridWidth * gridHeight;

  const { context } = makeContainCanvas(image, gridWidth, gridHeight);
  const sourceData = context.getImageData(0, 0, gridWidth, gridHeight);

  setCanvasDimensions(originalCanvas, gridWidth, gridHeight);
  setCanvasDimensions(resultCanvas, gridWidth, gridHeight);
  originalCanvas.getContext('2d').putImageData(sourceData, 0, 0);

  polynomialCoefficients = interpolateRaster(sourceData);
  isReady = true;

  originalPlaceholder.classList.add('hidden');
  resultPlaceholder.classList.add('hidden');
  termsSlider.disabled = false;
  resetButton.disabled = false;
  termsSlider.max = String(SLIDER_STEPS);
  gridInfo.textContent = `Raster: ${gridWidth} × ${gridHeight}`;
  setStatus(`Loaded ${IMAGE_SRC}. Increase the polynomial degree to rebuild the raster signal.`);

  termsSlider.value = '240';
  requestRender();
}

termsSlider.addEventListener('input', requestRender);
resetButton.addEventListener('click', () => {
  termsSlider.value = String(SLIDER_STEPS);
  requestRender();
});

const sourceImage = new Image();
sourceImage.onload = () => {
  try {
    initializeFromImage(sourceImage);
  } catch (error) {
    console.error(error);
    setStatus('Could not process this image. Use a normal JPG or PNG image.', true);
    originalPlaceholder.textContent = 'Could not process this image.';
    resultPlaceholder.textContent = 'Reconstruction unavailable.';
  }
};
sourceImage.onerror = () => {
  const message = `Image not found: ${IMAGE_SRC}. Put your image in the project root, then update IMAGE_SRC in script.js.`;
  setStatus(message, true);
  originalPlaceholder.textContent = 'Image not found. Update IMAGE_SRC in script.js.';
  resultPlaceholder.textContent = 'Waiting for a valid source image.';
};
sourceImage.src = IMAGE_SRC;
