# Polynomial Image Lab

A dependency-free browser demo that reconstructs an image with a single-variable polynomial, treating its pixels as a row-by-row raster signal.

## Run it

1. Put your image in this folder (the project root).
2. Open `script.js` and change `IMAGE_SRC` from `./logo.jpg` to your filename.
3. Serve this folder with a local static server and open `index.html`. For example, from this folder run `python -m http.server 8000`, then visit `http://localhost:8000`.

Some browsers restrict local image loading from `file://`, so a tiny local static server is the most reliable approach. No packages or build step are needed.

## How it works

- The source image is fitted, without stretching, onto a power-of-two grid with each dimension at most 256 pixels.
- Pixels are read in row-major order as a single one-dimensional signal. Red, green, and blue are interpolated independently as functions of the same normalized position `x`.
- A 256-sample Chebyshev interpolant provides a stable polynomial basis. The slider truncates that expansion to the selected degree, from a flat degree-0 approximation through degree 255.
- The polynomial is evaluated along the full raster scan and drawn back into the image grid. At its maximum degree it interpolates the 256 Chebyshev sample points; values between those points are polynomial estimates, so the output is not guaranteed to reproduce every original pixel exactly.

The raster ordering deliberately evokes the way old television signals drew a picture as one continuous scan. Polynomial approximations can overshoot near sharp transitions, which is a normal interpolation effect.
