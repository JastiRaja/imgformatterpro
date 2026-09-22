import { useState, useEffect } from 'react';
import type { OutputFormat } from '@/lib/imageConverter';
import { FORMAT_OPTIONS } from '@/lib/imageConverter';
import type { ConversionSettings } from '@/types';
import {
  ImageIcon,
  Gauge,
  Maximize2,
  ChevronDown,
  SlidersHorizontal,
  Paintbrush,
  Type,
  ChevronRight,
  Lock,
  Unlock,
} from 'lucide-react';

interface SettingsBarProps {
  settings: ConversionSettings;
  onChange: (settings: ConversionSettings) => void;
  supportedFormats: OutputFormat[];
}

const SCALE_PRESETS = [
  { value: 0.25, label: '25% (Quarter)' },
  { value: 0.5, label: '50% (Half)' },
  { value: 0.75, label: '75%' },
  { value: 1, label: '100% (Original)' },
  { value: 1.25, label: '125%' },
  { value: 1.5, label: '150%' },
  { value: 2, label: '200% (Double)' },
];

const TARGET_SIZE_PRESETS = [
  { value: 20, label: '20 KB' },
  { value: 30, label: '30 KB' },
  { value: 50, label: '50 KB' },
  { value: 100, label: '100 KB' },
  { value: 200, label: '200 KB' },
  { value: 500, label: '500 KB' },
  { value: 1024, label: '1 MB' },
];

const STANDARD_DIMENSIONS = [
  { label: 'Standard Dimensions...', w: 0, h: 0 },
  { label: 'Square (500 × 500 px)', w: 500, h: 500 },
  { label: 'Document Signature (240 × 80 px)', w: 240, h: 80 },
  { label: 'Passport / ID Photo (300 × 300 px)', w: 300, h: 300 },
  { label: 'Portrait Photo (350 × 450 px)', w: 350, h: 450 },
  { label: 'Landscape Banner (1200 × 630 px)', w: 1200, h: 630 },
  { label: 'Full HD (1920 × 1080 px)', w: 1920, h: 1080 },
  { label: 'Web Favicon / Icon (32 × 32 px)', w: 32, h: 32 },
];

const MATTE_COLORS = [
  { value: '#ffffff', label: 'White' },
  { value: '#09090b', label: 'Dark' },
  { value: '#f4f4f5', label: 'Light Gray' },
  { value: '#0284c7', label: 'Blue' },
];

type DimensionUnit = 'px' | 'cm' | 'mm' | 'in';

export default function SettingsBar({ settings, onChange, supportedFormats }: SettingsBarProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [unit, setUnit] = useState<DimensionUnit>('px');
  const [dpi, setDpi] = useState<number>(100);
  const [lockAspectRatio, setLockAspectRatio] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<number>(
    (settings.customWidth || 240) / (settings.customHeight || 80)
  );

  const showQuality = settings.format === 'jpeg' || settings.format === 'webp' || settings.format === 'avif';
  const visibleFormats = FORMAT_OPTIONS.filter((f) => supportedFormats.includes(f.value));

  // Current width and height in px
  const currentWidthPx = settings.customWidth || 240;
  const currentHeightPx = settings.customHeight || 80;

  // Conversion helper between px and chosen unit
  const pxToUnit = (px: number, u: DimensionUnit, d: number): number => {
    switch (u) {
      case 'in':
        return Number((px / d).toFixed(2));
      case 'cm':
        return Number(((px / d) * 2.54).toFixed(2));
      case 'mm':
        return Number(((px / d) * 25.4).toFixed(1));
      case 'px':
      default:
        return Math.round(px);
    }
  };

  const unitToPx = (val: number, u: DimensionUnit, d: number): number => {
    switch (u) {
      case 'in':
        return Math.max(1, Math.round(val * d));
      case 'cm':
        return Math.max(1, Math.round((val / 2.54) * d));
      case 'mm':
        return Math.max(1, Math.round((val / 25.4) * d));
      case 'px':
      default:
        return Math.max(1, Math.round(val));
    }
  };

  const [inputW, setInputW] = useState<string>(pxToUnit(currentWidthPx, unit, dpi).toString());
  const [inputH, setInputH] = useState<string>(pxToUnit(currentHeightPx, unit, dpi).toString());

  // Sync inputs when settings, unit, or dpi change externally
  useEffect(() => {
    setInputW(pxToUnit(currentWidthPx, unit, dpi).toString());
    setInputH(pxToUnit(currentHeightPx, unit, dpi).toString());
  }, [currentWidthPx, currentHeightPx, unit, dpi]);

  const handleWidthChange = (valStr: string) => {
    setInputW(valStr);
    const num = parseFloat(valStr);
    if (!isNaN(num) && num > 0) {
      const newWidthPx = unitToPx(num, unit, dpi);
      let newHeightPx = currentHeightPx;
      if (lockAspectRatio && aspectRatio > 0) {
        newHeightPx = Math.max(1, Math.round(newWidthPx / aspectRatio));
        setInputH(pxToUnit(newHeightPx, unit, dpi).toString());
      }
      onChange({
        ...settings,
        customWidth: newWidthPx,
        customHeight: newHeightPx,
        activePreset: undefined,
      });
    }
  };

  const handleHeightChange = (valStr: string) => {
    setInputH(valStr);
    const num = parseFloat(valStr);
    if (!isNaN(num) && num > 0) {
      const newHeightPx = unitToPx(num, unit, dpi);
      let newWidthPx = currentWidthPx;
      if (lockAspectRatio && aspectRatio > 0) {
        newWidthPx = Math.max(1, Math.round(newHeightPx * aspectRatio));
        setInputW(pxToUnit(newWidthPx, unit, dpi).toString());
      }
      onChange({
        ...settings,
        customWidth: newWidthPx,
        customHeight: newHeightPx,
        activePreset: undefined,
      });
    }
  };

  const toggleAspectLock = () => {
    if (!lockAspectRatio) {
      setAspectRatio(currentWidthPx / currentHeightPx);
    }
    setLockAspectRatio(!lockAspectRatio);
  };

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 shadow-xl backdrop-blur-md transition-all">
      {/* Main Controls Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
        {/* 1. Format Selection */}
        <div className="flex flex-col gap-2.5 lg:col-span-4">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              <ImageIcon className="h-3.5 w-3.5 text-blue-400" />
              Target Format
            </label>
            <span className="text-[11px] font-medium text-zinc-500">
              {settings.format.toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6 lg:grid-cols-3">
            {visibleFormats.map((fmt) => {
              const isSelected = settings.format === fmt.value;
              return (
                <button
                  key={fmt.value}
                  onClick={() => onChange({ ...settings, format: fmt.value, activePreset: undefined })}
                  className={`flex flex-col items-center justify-center rounded-xl py-2 px-1 text-xs font-semibold transition-all duration-200
                    ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 ring-1 ring-blue-400'
                        : 'bg-zinc-800/80 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                    }`}
                >
                  <span className="text-xs uppercase">{fmt.label}</span>
                  <span className={`text-[10px] ${isSelected ? 'text-blue-100' : 'text-zinc-500'}`}>
                    .{fmt.value}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. File Size & Quality Mode */}
        <div className="flex flex-col gap-2.5 lg:col-span-4">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              <Gauge className="h-3.5 w-3.5 text-blue-400" />
              Compression & Size
            </label>
            <div className="flex rounded-lg bg-zinc-800/90 p-0.5 text-[11px] font-medium">
              <button
                onClick={() => onChange({ ...settings, mode: 'manual', activePreset: undefined })}
                className={`rounded-md px-2.5 py-0.5 transition-all ${
                  settings.mode === 'manual'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Quality %
              </button>
              <button
                onClick={() => onChange({ ...settings, mode: 'target_size', activePreset: undefined })}
                className={`rounded-md px-2.5 py-0.5 transition-all ${
                  settings.mode === 'target_size'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Target KB
              </button>
            </div>
          </div>

          {settings.mode === 'manual' ? (
            <div className="flex flex-col gap-2 rounded-xl bg-zinc-950/40 p-3 border border-zinc-800/50">
              <div className={`flex items-center gap-3 ${showQuality ? '' : 'opacity-40 pointer-events-none'}`}>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="1"
                  value={settings.quality}
                  onChange={(e) => onChange({ ...settings, quality: Number(e.target.value), activePreset: undefined })}
                  className="w-full accent-blue-500 cursor-pointer"
                />
                <span className="w-12 text-right text-xs font-bold text-blue-400">{settings.quality}%</span>
              </div>
              <p className="text-[11px] text-zinc-500">
                {showQuality
                  ? 'Higher percentage retains maximum visual fidelity; lower reduces size.'
                  : 'Lossless format active — quality slider is not applicable.'}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2 rounded-xl bg-zinc-950/40 p-3 border border-zinc-800/50">
              <div className="flex flex-wrap gap-1">
                {TARGET_SIZE_PRESETS.map((t) => {
                  const isSelected = settings.targetSizeKb === t.value;
                  return (
                    <button
                      key={t.value}
                      onClick={() => onChange({ ...settings, targetSizeKb: t.value, activePreset: undefined })}
                      className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                          : 'bg-zinc-800/90 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                      }`}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs text-zinc-400">Custom Max:</span>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    min="5"
                    max="50000"
                    step="5"
                    value={settings.targetSizeKb}
                    onChange={(e) =>
                      onChange({
                        ...settings,
                        targetSizeKb: Math.max(5, Number(e.target.value) || 5),
                        activePreset: undefined,
                      })
                    }
                    className="w-20 rounded-lg bg-zinc-800 px-2.5 py-1 text-xs font-semibold text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="ml-1.5 text-xs font-semibold text-zinc-400">KB</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 3. Dimensions & Sizing */}
        <div className="flex flex-col gap-2.5 lg:col-span-4">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              <Maximize2 className="h-3.5 w-3.5 text-blue-400" />
              Dimensions & Sizing
            </label>
            <div className="flex rounded-lg bg-zinc-800/90 p-0.5 text-[11px] font-medium">
              <button
                onClick={() => onChange({ ...settings, resizeMode: 'scale', activePreset: undefined })}
                className={`rounded-md px-2.5 py-0.5 transition-all ${
                  settings.resizeMode === 'scale'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Scale %
              </button>
              <button
                onClick={() =>
                  onChange({
                    ...settings,
                    resizeMode: 'dimensions',
                    customWidth: settings.customWidth || 240,
                    customHeight: settings.customHeight || 80,
                    activePreset: undefined,
                  })
                }
                className={`rounded-md px-2.5 py-0.5 transition-all ${
                  settings.resizeMode === 'dimensions'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Custom (W × H)
              </button>
            </div>
          </div>

          {settings.resizeMode === 'scale' ? (
            <div className="flex flex-col gap-2 rounded-xl bg-zinc-950/40 p-3 border border-zinc-800/50">
              <div className="relative">
                <select
                  value={settings.scale}
                  onChange={(e) => onChange({ ...settings, scale: Number(e.target.value), activePreset: undefined })}
                  className="w-full appearance-none rounded-lg bg-zinc-800 px-3.5 py-1.5 pr-9 text-xs font-medium text-zinc-200 transition-colors hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
                >
                  {SCALE_PRESETS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              </div>
              <p className="text-[11px] text-zinc-500">
                Scales image proportionally based on original dimensions.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5 rounded-xl bg-zinc-950/40 p-3 border border-zinc-800/50">
              {/* Presets + Unit Picker */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <select
                    onChange={(e) => {
                      const preset = STANDARD_DIMENSIONS.find((p) => p.label === e.target.value);
                      if (preset && preset.w > 0) {
                        onChange({
                          ...settings,
                          customWidth: preset.w,
                          customHeight: preset.h,
                          activePreset: undefined,
                        });
                        setAspectRatio(preset.w / preset.h);
                      }
                    }}
                    className="w-full appearance-none rounded-lg bg-zinc-800 px-2.5 py-1 pr-7 text-[11px] font-medium text-zinc-200 transition-colors hover:bg-zinc-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  >
                    {STANDARD_DIMENSIONS.map((p) => (
                      <option key={p.label} value={p.label}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
                </div>

                {/* Units */}
                <div className="flex rounded-lg bg-zinc-800 p-0.5 text-[10px] font-semibold">
                  {(['px', 'cm', 'mm', 'in'] as DimensionUnit[]).map((u) => (
                    <button
                      key={u}
                      onClick={() => setUnit(u)}
                      className={`rounded px-1.5 py-0.5 transition-all uppercase ${
                        unit === u ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>

              {/* Physical DPI selector if physical units chosen */}
              {unit !== 'px' && (
                <div className="flex items-center justify-between text-[11px] text-zinc-400 bg-zinc-900/80 px-2 py-1 rounded-lg border border-zinc-800">
                  <span>Resolution DPI:</span>
                  <div className="flex gap-1">
                    {[100, 150, 300].map((d) => (
                      <button
                        key={d}
                        onClick={() => setDpi(d)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          dpi === d ? 'bg-blue-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {d} DPI
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* W x H Inputs */}
              <div className="flex items-center gap-2 text-xs">
                <div className="flex flex-1 items-center gap-1 rounded-lg bg-zinc-800 px-2 py-1">
                  <span className="text-zinc-500 font-semibold text-[11px]">W:</span>
                  <input
                    type="number"
                    step={unit === 'px' ? '1' : '0.1'}
                    value={inputW}
                    onChange={(e) => handleWidthChange(e.target.value)}
                    className="w-full bg-transparent text-xs font-semibold text-zinc-100 focus:outline-none"
                  />
                  <span className="text-[10px] font-bold text-zinc-500 uppercase">{unit}</span>
                </div>

                <button
                  type="button"
                  onClick={toggleAspectLock}
                  className={`p-1.5 rounded-lg border transition-all ${
                    lockAspectRatio
                      ? 'border-blue-500/50 bg-blue-500/20 text-blue-400'
                      : 'border-zinc-700 bg-zinc-800 text-zinc-500 hover:text-zinc-300'
                  }`}
                  title={lockAspectRatio ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
                >
                  {lockAspectRatio ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                </button>

                <div className="flex flex-1 items-center gap-1 rounded-lg bg-zinc-800 px-2 py-1">
                  <span className="text-zinc-500 font-semibold text-[11px]">H:</span>
                  <input
                    type="number"
                    step={unit === 'px' ? '1' : '0.1'}
                    value={inputH}
                    onChange={(e) => handleHeightChange(e.target.value)}
                    className="w-full bg-transparent text-xs font-semibold text-zinc-100 focus:outline-none"
                  />
                  <span className="text-[10px] font-bold text-zinc-500 uppercase">{unit}</span>
                </div>
              </div>

              {unit !== 'px' && (
                <p className="text-[10px] text-zinc-500 text-right">
                  Equivalent to {currentWidthPx} × {currentHeightPx} px @ {dpi} DPI
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Advanced Utilities Accordion */}
      <div className="border-t border-zinc-800/80 pt-3">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <SlidersHorizontal className="h-3.5 w-3.5 text-blue-400" />
          <span>Advanced Utilities (Matte Color, Batch Watermark)</span>
          <ChevronRight className={`h-3.5 w-3.5 transition-transform duration-200 ${showAdvanced ? 'rotate-90' : ''}`} />
        </button>

        {showAdvanced && (
          <div className="mt-3.5 grid grid-cols-1 gap-4 rounded-xl bg-zinc-950/60 p-4 border border-zinc-800/60 sm:grid-cols-2">
            {/* Matte Background Color */}
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-400">
                <Paintbrush className="h-3.5 w-3.5 text-zinc-400" />
                Matte Background (for JPEG/BMP transparency fill)
              </label>
              <div className="flex items-center gap-2">
                {MATTE_COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => onChange({ ...settings, matteColor: c.value })}
                    className={`h-7 w-7 rounded-lg border transition-all ${
                      settings.matteColor === c.value
                        ? 'border-blue-500 ring-2 ring-blue-500/30 scale-110'
                        : 'border-zinc-700 hover:border-zinc-500'
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={c.label}
                  />
                ))}
                <input
                  type="color"
                  value={settings.matteColor}
                  onChange={(e) => onChange({ ...settings, matteColor: e.target.value })}
                  className="h-7 w-7 rounded-lg bg-transparent border-0 cursor-pointer p-0"
                  title="Pick custom color"
                />
              </div>
            </div>

            {/* Watermark Tool */}
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-400">
                <Type className="h-3.5 w-3.5 text-zinc-400" />
                Batch Text Watermark
              </label>
              <input
                type="text"
                placeholder="e.g. © 2026 My Brand"
                value={settings.watermarkText}
                onChange={(e) => onChange({ ...settings, watermarkText: e.target.value })}
                className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

