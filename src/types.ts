import type { OutputFormat } from '@/lib/imageConverter';

export type TaskStatus = 'idle' | 'processing' | 'done' | 'error';

export interface ConversionTask {
  id: string;
  file: File;
  fileName: string;
  fileSize: number;
  mimeType: string;
  previewUrl: string;
  status: TaskStatus;
  error?: string;
  resultUrl?: string;
  resultBlob?: Blob;
  resultName?: string;
  resultMime?: string;
  resultSize?: number;
  resultWidth?: number;
  resultHeight?: number;
}

export type QualityMode = 'manual' | 'target_size';
export type ResizeMode = 'scale' | 'dimensions';

export interface ConversionSettings {
  format: OutputFormat;
  quality: number;
  scale: number;
  resizeMode: ResizeMode;
  customWidth?: number;
  customHeight?: number;
  mode: QualityMode;
  targetSizeKb: number;
  minSizeKb?: number;
  matteColor: string;
  watermarkText: string;
  watermarkOpacity: number;
  activePreset?: string;
}
