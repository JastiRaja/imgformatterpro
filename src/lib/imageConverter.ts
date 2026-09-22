export type OutputFormat = 'png' | 'jpeg' | 'webp' | 'bmp' | 'ico' | 'svg' | 'avif';

export interface FormatOption {
  value: OutputFormat;
  label: string;
  ext: string;
  mime: string;
}

export const FORMAT_OPTIONS: FormatOption[] = [
  { value: 'png', label: 'PNG', ext: 'png', mime: 'image/png' },
  { value: 'jpeg', label: 'JPEG', ext: 'jpg', mime: 'image/jpeg' },
  { value: 'webp', label: 'WebP', ext: 'webp', mime: 'image/webp' },
  { value: 'bmp', label: 'BMP', ext: 'bmp', mime: 'image/bmp' },
  { value: 'ico', label: 'ICO', ext: 'ico', mime: 'image/x-icon' },
  { value: 'svg', label: 'SVG', ext: 'svg', mime: 'image/svg+xml' },
  { value: 'avif', label: 'AVIF', ext: 'avif', mime: 'image/avif' },
];

export const ACCEPTED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/bmp',
  'image/x-icon',
  'image/vnd.microsoft.icon',
  'image/svg+xml',
  'image/avif',
];

export interface ConvertResult {
  blob: Blob;
  width: number;
  height: number;
  outputSize: number;
  outputName: string;
  outputMime: string;
}

export interface ConvertOptions {
  format: OutputFormat;
  quality: number;
  scale: number;
  resizeMode?: 'scale' | 'dimensions';
  customWidth?: number;
  customHeight?: number;
  mode?: 'manual' | 'target_size';
  targetSizeKb?: number;
  minSizeKb?: number;
  matteColor?: string;
  watermarkText?: string;
  watermarkOpacity?: number;
}

export const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export const getMimeType = (file: File): string => {
  if (file.type) return file.type;
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const extMap: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    bmp: 'image/bmp',
    ico: 'image/x-icon',
    svg: 'image/svg+xml',
    avif: 'image/avif',
  };
  return extMap[ext] ?? 'image/png';
};

const loadImageElement = (file: File): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Could not load image: ${file.name}`));
    };
    img.src = url;
  });
};

/**
 * Encode raw ImageData into an authentic 24-bit uncompressed BMP Blob.
 */
const encodeBmpBlob = (canvas: HTMLCanvasElement): Blob => {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not get canvas context for BMP encoding');
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { width, height, data } = imgData;

  const rowSize = Math.floor((24 * width + 31) / 32) * 4;
  const pixelArraySize = rowSize * height;
  const fileSize = 54 + pixelArraySize;

  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);

  // Bitmap File Header (14 bytes)
  view.setUint16(0, 0x424d, false); // "BM" magic number
  view.setUint32(2, fileSize, true); // Total file size
  view.setUint32(6, 0, true); // Reserved
  view.setUint32(10, 54, true); // Offset to pixel data

  // DIB Header (BITMAPINFOHEADER - 40 bytes)
  view.setUint32(14, 40, true);
  view.setInt32(18, width, true);
  view.setInt32(22, height, true); // positive = bottom-to-top
  view.setUint16(26, 1, true); // 1 color plane
  view.setUint16(28, 24, true); // 24 bits per pixel (BGR)
  view.setUint32(30, 0, true); // BI_RGB (uncompressed)
  view.setUint32(34, pixelArraySize, true);
  view.setInt32(38, 2835, true); // Horizontal resolution (72 DPI)
  view.setInt32(42, 2835, true); // Vertical resolution (72 DPI)
  view.setUint32(46, 0, true); // Number of colors
  view.setUint32(50, 0, true); // Important colors

  // Pixel data: BMP stores pixels bottom-to-top, BGR format
  let offset = 54;
  for (let y = height - 1; y >= 0; y--) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      view.setUint8(offset++, b);
      view.setUint8(offset++, g);
      view.setUint8(offset++, r);
    }
    const padding = rowSize - width * 3;
    for (let p = 0; p < padding; p++) {
      view.setUint8(offset++, 0);
    }
  }

  return new Blob([buffer], { type: 'image/bmp' });
};

/**
 * Encode canvas into an authentic Windows Icon (.ico) file wrapping PNG format.
 */
const encodeIcoBlob = async (canvas: HTMLCanvasElement): Promise<Blob> => {
  const pngBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Failed to encode ICO'))), 'image/png');
  });
  const pngBuffer = await pngBlob.arrayBuffer();

  const width = Math.min(256, canvas.width);
  const height = Math.min(256, canvas.height);
  const headerSize = 6;
  const dirSize = 16;
  const totalSize = headerSize + dirSize + pngBuffer.byteLength;

  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);

  // ICONDIR
  view.setUint16(0, 0, true); // Reserved (0)
  view.setUint16(2, 1, true); // Type (1 = ICO)
  view.setUint16(4, 1, true); // Image count (1)

  // ICONDIRENTRY
  view.setUint8(6, width === 256 ? 0 : width);
  view.setUint8(7, height === 256 ? 0 : height);
  view.setUint8(8, 0); // Palette
  view.setUint8(9, 0); // Reserved
  view.setUint16(10, 1, true); // Color planes
  view.setUint16(12, 32, true); // Bits per pixel
  view.setUint32(14, pngBuffer.byteLength, true); // Bytes in resource
  view.setUint32(18, headerSize + dirSize, true); // Offset of image data

  new Uint8Array(buffer, headerSize + dirSize).set(new Uint8Array(pngBuffer));

  return new Blob([buffer], { type: 'image/x-icon' });
};

/**
 * Encode canvas into an SVG container with high-res embedded raster image.
 */
const encodeSvgBlob = (canvas: HTMLCanvasElement): Blob => {
  const dataUrl = canvas.toDataURL('image/png');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}">
  <image width="${canvas.width}" height="${canvas.height}" href="${dataUrl}" />
</svg>`;
  return new Blob([svg], { type: 'image/svg+xml' });
};

const canvasToBlob = (
  canvas: HTMLCanvasElement,
  format: OutputFormat,
  quality: number
): Promise<Blob> => {
  if (format === 'bmp') {
    return Promise.resolve(encodeBmpBlob(canvas));
  }
  if (format === 'ico') {
    return encodeIcoBlob(canvas);
  }
  if (format === 'svg') {
    return Promise.resolve(encodeSvgBlob(canvas));
  }

  const mime =
    format === 'png'
      ? 'image/png'
      : format === 'jpeg'
      ? 'image/jpeg'
      : format === 'webp'
      ? 'image/webp'
      : 'image/avif';

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error(`Conversion failed for ${format.toUpperCase()}.`));
      },
      mime,
      format === 'png' ? undefined : quality / 100
    );
  });
};

/**
 * Draw custom watermark on the canvas before encoding.
 */
const applyWatermark = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  text?: string,
  opacity: number = 0.5
) => {
  if (!text || !text.trim()) return;
  ctx.save();
  const fontSize = Math.max(16, Math.round(width * 0.035));
  ctx.font = `600 ${fontSize}px sans-serif`;
  ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
  ctx.strokeStyle = `rgba(0, 0, 0, ${opacity * 0.75})`;
  ctx.lineWidth = Math.max(2, Math.round(fontSize * 0.1));
  const padding = fontSize * 0.8;
  const metrics = ctx.measureText(text);
  const x = width - metrics.width - padding;
  const y = height - padding;
  ctx.strokeText(text, x, y);
  ctx.fillText(text, x, y);
  ctx.restore();
};

/**
 * Render an image/canvas onto a target size using progressive step-down scaling
 * and bicubic high-quality interpolation to avoid aliasing and blurriness.
 */
const renderHighQualityCanvas = (
  source: CanvasImageSource,
  srcWidth: number,
  srcHeight: number,
  dstWidth: number,
  dstHeight: number,
  format: OutputFormat,
  options?: ConvertOptions
): HTMLCanvasElement => {
  let curWidth = srcWidth;
  let curHeight = srcHeight;
  let curSource: CanvasImageSource = source;

  // Progressive step-down scaling: halving incrementally avoids moiré & aliasing artifacts
  while (curWidth * 0.5 > dstWidth && curHeight * 0.5 > dstHeight) {
    const nextWidth = Math.max(dstWidth, Math.round(curWidth * 0.5));
    const nextHeight = Math.max(dstHeight, Math.round(curHeight * 0.5));

    const stepCanvas = document.createElement('canvas');
    stepCanvas.width = nextWidth;
    stepCanvas.height = nextHeight;
    const stepCtx = stepCanvas.getContext('2d', { colorSpace: 'srgb' });
    if (stepCtx) {
      stepCtx.imageSmoothingEnabled = true;
      stepCtx.imageSmoothingQuality = 'high';
      stepCtx.drawImage(curSource, 0, 0, nextWidth, nextHeight);
      curSource = stepCanvas;
    }

    curWidth = nextWidth;
    curHeight = nextHeight;
  }

  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = dstWidth;
  finalCanvas.height = dstHeight;
  const finalCtx = finalCanvas.getContext('2d', { colorSpace: 'srgb' });
  if (!finalCtx) throw new Error('Canvas context unavailable.');

  finalCtx.imageSmoothingEnabled = true;
  finalCtx.imageSmoothingQuality = 'high';

  // For JPEG/BMP without alpha support, fill custom or clean matte
  if (format === 'jpeg' || format === 'bmp') {
    finalCtx.fillStyle = options?.matteColor || '#ffffff';
    finalCtx.fillRect(0, 0, dstWidth, dstHeight);
  }

  finalCtx.drawImage(curSource, 0, 0, dstWidth, dstHeight);

  // Apply optional watermark
  if (options?.watermarkText) {
    applyWatermark(
      finalCtx,
      dstWidth,
      dstHeight,
      options.watermarkText,
      options.watermarkOpacity ?? 0.5
    );
  }

  return finalCanvas;
};

const convertSvg = async (
  file: File,
  baseName: string,
  options: ConvertOptions
): Promise<ConvertResult> => {
  const text = await file.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'image/svg+xml');
  const svg = doc.querySelector('svg');
  if (!svg) throw new Error(`Invalid SVG: ${file.name}`);

  const w = svg.getAttribute('width');
  const h = svg.getAttribute('height');
  const vb = svg.getAttribute('viewBox');
  let naturalW = 0;
  let naturalH = 0;

  if (w && h) {
    naturalW = parseFloat(w);
    naturalH = parseFloat(h);
  } else if (vb) {
    const parts = vb.split(/[\s,]+/);
    naturalW = parseFloat(parts[2]);
    naturalH = parseFloat(parts[3]);
  }
  if (!naturalW || !naturalH) {
    naturalW = 1024;
    naturalH = 1024;
  }

  const svgBlob = new Blob([text], { type: 'image/svg+xml' });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error(`Could not render SVG: ${file.name}`));
      el.src = svgUrl;
    });

    let currentScale = options.scale;
    let width = Math.max(1, Math.round(naturalW * currentScale));
    let height = Math.max(1, Math.round(naturalH * currentScale));

    let canvas = renderHighQualityCanvas(
      img,
      naturalW,
      naturalH,
      width,
      height,
      options.format,
      options
    );

    let blob = await canvasToBlob(canvas, options.format, options.quality);

    // Target size compression optimization
    if (options.mode === 'target_size' && options.targetSizeKb && options.targetSizeKb > 0) {
      const targetBytes = options.targetSizeKb * 1024;
      const isLossy = options.format === 'jpeg' || options.format === 'webp' || options.format === 'avif';

      if (isLossy) {
        let low = 5;
        let high = 100;
        let bestBlob = blob;

        for (let iter = 0; iter < 7; iter++) {
          const mid = Math.round((low + high) / 2);
          const testBlob = await canvasToBlob(canvas, options.format, mid);
          if (testBlob.size <= targetBytes) {
            bestBlob = testBlob;
            low = mid + 1;
          } else {
            high = mid - 1;
          }
        }

        // If even lowest quality exceeds target, scale down
        if (bestBlob.size > targetBytes && currentScale > 0.2) {
          while (bestBlob.size > targetBytes && currentScale > 0.2) {
            currentScale *= 0.8;
            width = Math.max(1, Math.round(naturalW * currentScale));
            height = Math.max(1, Math.round(naturalH * currentScale));
            canvas = renderHighQualityCanvas(img, naturalW, naturalH, width, height, options.format, options);
            bestBlob = await canvasToBlob(canvas, options.format, 40);
          }
        }
        blob = bestBlob;
      }
    }

    const fmtOption = FORMAT_OPTIONS.find((f) => f.value === options.format);
    const ext = fmtOption?.ext ?? (options.format === 'jpeg' ? 'jpg' : options.format);
    const outputMime = fmtOption?.mime ?? (options.format === 'jpeg' ? 'image/jpeg' : `image/${options.format}`);

    return {
      blob,
      width,
      height,
      outputSize: blob.size,
      outputName: `${baseName}.${ext}`,
      outputMime,
    };
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
};

export const convertImage = async (
  file: File,
  options: ConvertOptions
): Promise<ConvertResult> => {
  const baseName = file.name.replace(/\.[^.]+$/, '');
  const mime = getMimeType(file);

  if (mime === 'image/svg+xml') {
    return convertSvg(file, baseName, options);
  }

  const img = await loadImageElement(file);
  let currentScale = options.scale;
  let width = Math.max(1, Math.round(img.naturalWidth * currentScale));
  let height = Math.max(1, Math.round(img.naturalHeight * currentScale));

  if (options.resizeMode === 'dimensions' && options.customWidth && options.customHeight) {
    width = Math.max(1, Math.round(options.customWidth));
    height = Math.max(1, Math.round(options.customHeight));
  }

  let canvas = renderHighQualityCanvas(
    img,
    img.naturalWidth,
    img.naturalHeight,
    width,
    height,
    options.format,
    options
  );

  let blob = await canvasToBlob(canvas, options.format, options.quality);

  // Target size compression optimization
  if (options.mode === 'target_size' && options.targetSizeKb && options.targetSizeKb > 0) {
    const targetBytes = options.targetSizeKb * 1024;
    const isLossy = options.format === 'jpeg' || options.format === 'webp' || options.format === 'avif';

    if (isLossy) {
      // Pre-scale large smartphone photos if target budget is tight (e.g. <= 50 KB) and not in fixed dimension mode
      if (options.resizeMode !== 'dimensions' && targetBytes <= 50 * 1024 && (width > 1200 || height > 1200)) {
        const maxDim = targetBytes <= 25 * 1024 ? 600 : 900;
        const autoScale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
        currentScale = Math.min(currentScale, autoScale);
        width = Math.max(1, Math.round(img.naturalWidth * currentScale));
        height = Math.max(1, Math.round(img.naturalHeight * currentScale));
        canvas = renderHighQualityCanvas(img, img.naturalWidth, img.naturalHeight, width, height, options.format, options);
      }

      let low = 10;
      let high = 95;
      let bestBlob = await canvasToBlob(canvas, options.format, 70);

      // Binary search quality
      for (let iter = 0; iter < 8; iter++) {
        const mid = Math.round((low + high) / 2);
        const testBlob = await canvasToBlob(canvas, options.format, mid);
        if (testBlob.size <= targetBytes) {
          bestBlob = testBlob;
          low = mid + 1; // Try higher quality
        } else {
          high = mid - 1; // Reduce quality
        }
      }

      // If still exceeding target budget and not strictly locked to dimensions, downscale dimensions
      if (options.resizeMode !== 'dimensions') {
        while (bestBlob.size > targetBytes && currentScale > 0.08) {
          currentScale *= 0.85;
          width = Math.max(1, Math.round(img.naturalWidth * currentScale));
          height = Math.max(1, Math.round(img.naturalHeight * currentScale));
          canvas = renderHighQualityCanvas(img, img.naturalWidth, img.naturalHeight, width, height, options.format, options);
          bestBlob = await canvasToBlob(canvas, options.format, 65);
        }
      }

      blob = bestBlob;
    } else {
      // For lossless (PNG, BMP, etc.), scale down dimensions if oversized and not in fixed dimension mode
      if (options.resizeMode !== 'dimensions') {
        while (blob.size > targetBytes && currentScale > 0.08) {
          currentScale *= 0.82;
          width = Math.max(1, Math.round(img.naturalWidth * currentScale));
          height = Math.max(1, Math.round(img.naturalHeight * currentScale));
          canvas = renderHighQualityCanvas(img, img.naturalWidth, img.naturalHeight, width, height, options.format, options);
          blob = await canvasToBlob(canvas, options.format, options.quality);
        }
      }
    }
  }

  const fmtOption = FORMAT_OPTIONS.find((f) => f.value === options.format);
  const ext = fmtOption?.ext ?? (options.format === 'jpeg' ? 'jpg' : options.format);
  const outputMime = fmtOption?.mime ?? (options.format === 'jpeg' ? 'image/jpeg' : `image/${options.format}`);

  return {
    blob,
    width,
    height,
    outputSize: blob.size,
    outputName: `${baseName}.${ext}`,
    outputMime,
  };
};

export const supportsFormat = (format: OutputFormat): boolean => {
  if (format === 'bmp' || format === 'ico' || format === 'svg') return true;
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const mime =
    format === 'png'
      ? 'image/png'
      : format === 'jpeg'
      ? 'image/jpeg'
      : format === 'webp'
      ? 'image/webp'
      : 'image/avif';
  try {
    return canvas.toDataURL(mime).startsWith(`data:${mime}`);
  } catch {
    return false;
  }
};
