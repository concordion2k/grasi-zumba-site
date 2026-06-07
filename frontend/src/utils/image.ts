/**
 * Client-side image downscaling/compression for avatar uploads.
 *
 * Browsers happily let users pick 10+ MB phone photos; rather than rejecting them, we re-encode to a
 * sensibly sized JPEG that fits the upload limit. Output is always `image/jpeg` (smallest for photos
 * and an allowed type), with transparency flattened onto white.
 */

interface ResizeOptions {
  /** Longest edge of the output, in pixels. */
  maxDim?: number;
  /** Maximum output size in bytes. */
  maxBytes: number;
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Image encoding failed'))),
      'image/jpeg',
      quality,
    );
  });
}

function fit(width: number, height: number, maxDim: number): { w: number; h: number } {
  const longest = Math.max(width, height);
  if (longest <= maxDim) return { w: width, h: height };
  const scale = maxDim / longest;
  return { w: Math.round(width * scale), h: Math.round(height * scale) };
}

async function loadImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  // createImageBitmap respects EXIF orientation and is fast; fall back to <img> if unavailable.
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      /* fall through */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Could not read image'));
      img.src = url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Resize/compress an image so the result is at most `maxBytes`. Returns a new JPEG File.
 * Throws if it can't get under the limit even at the smallest reasonable size.
 */
export async function resizeImageToLimit(file: File, options: ResizeOptions): Promise<File> {
  const { maxDim = 1024, maxBytes } = options;
  const source = await loadImage(file);
  const srcW = 'width' in source ? source.width : (source as HTMLImageElement).naturalWidth;
  const srcH = 'height' in source ? source.height : (source as HTMLImageElement).naturalHeight;

  let { w, h } = fit(srcW, srcH, maxDim);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');

  const draw = () => {
    canvas.width = w;
    canvas.height = h;
    ctx.fillStyle = '#ffffff'; // flatten any transparency (JPEG has no alpha)
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(source, 0, 0, w, h);
  };

  draw();
  let quality = 0.9;
  let blob = await canvasToBlob(canvas, quality);

  // First try dropping JPEG quality.
  while (blob.size > maxBytes && quality > 0.4) {
    quality -= 0.1;
    blob = await canvasToBlob(canvas, quality);
  }
  // Still too big? Shrink dimensions and retry.
  while (blob.size > maxBytes && Math.max(w, h) > 256) {
    w = Math.round(w * 0.8);
    h = Math.round(h * 0.8);
    draw();
    blob = await canvasToBlob(canvas, 0.82);
  }

  if ('close' in source) source.close();

  if (blob.size > maxBytes) {
    throw new Error('Could not compress the image enough — please try a different photo.');
  }

  const name = file.name.replace(/\.[^.]+$/, '') || 'avatar';
  return new File([blob], `${name}.jpg`, { type: 'image/jpeg' });
}
