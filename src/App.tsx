import { useCallback, useEffect, useRef, useState } from 'react';
import JSZip from 'jszip';
import DropZone from '@/components/DropZone';
import SettingsBar from '@/components/SettingsBar';
import TaskCard from '@/components/TaskCard';
import CompareModal from '@/components/CompareModal';
import {
  convertImage,
  getMimeType,
  supportsFormat,
  type OutputFormat,
  type ConvertOptions,
  ACCEPTED_IMAGE_TYPES,
} from '@/lib/imageConverter';
import type { ConversionTask, ConversionSettings } from '@/types';
import {
  Download,
  Trash2,
  Loader2,
  Sparkles,
  Github,
  ShieldCheck,
  Zap,
  Target,
  Maximize2,
  CheckCircle2,
  SlidersHorizontal,
} from 'lucide-react';

export default function App() {
  const [tasks, setTasks] = useState<ConversionTask[]>([]);
  const [settings, setSettings] = useState<ConversionSettings>({
    format: 'webp',
    quality: 92,
    scale: 1,
    resizeMode: 'scale',
    customWidth: 240,
    customHeight: 80,
    mode: 'manual',
    targetSizeKb: 100,
    minSizeKb: 10,
    matteColor: '#ffffff',
    watermarkText: '',
    watermarkOpacity: 0.5,
  });
  const [supportedFormats, setSupportedFormats] = useState<OutputFormat[]>([
    'png',
    'jpeg',
    'webp',
    'bmp',
    'ico',
    'svg',
  ]);
  const [comparingTask, setComparingTask] = useState<ConversionTask | null>(null);
  const [isZipping, setIsZipping] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [, setGlobalError] = useState<string | null>(null);

  const settingsKey = `${settings.format}-${settings.quality}-${settings.scale}-${settings.resizeMode}-${settings.customWidth}-${settings.customHeight}-${settings.mode}-${settings.targetSizeKb}-${settings.matteColor}-${settings.watermarkText}`;
  const lastConvertedKey = useRef('');
  const conversionToken = useRef(0);

  // Detect supported formats on mount
  useEffect(() => {
    const supported = (['png', 'jpeg', 'webp', 'bmp', 'ico', 'svg', 'avif'] as OutputFormat[]).filter(supportsFormat);
    if (supported.length > 0) {
      setSupportedFormats(supported);
      if (!supported.includes(settings.format)) {
        setSettings((prev) => ({ ...prev, format: supported[0] }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generateId = (): string =>
    `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const handleFiles = useCallback((fileList: FileList) => {
    const accepted = Array.from(fileList).filter((file) => {
      const type = getMimeType(file);
      return type.startsWith('image/') || ACCEPTED_IMAGE_TYPES.includes(type);
    });
    if (accepted.length === 0) return;

    setGlobalError(null);

    const newTasks: ConversionTask[] = accepted.map((file) => ({
      id: generateId(),
      file,
      fileName: file.name,
      fileSize: file.size,
      mimeType: getMimeType(file),
      previewUrl: URL.createObjectURL(file),
      status: 'idle',
    }));

    setTasks((prev) => [...prev, ...newTasks]);
  }, []);

  const convertTask = useCallback(
    async (task: ConversionTask, opts: ConvertOptions, token: number) => {
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: 'processing' } : t))
      );
      try {
        const result = await convertImage(task.file, opts);
        if (token !== conversionToken.current) return;
        setTasks((prev) =>
          prev.map((t) =>
            t.id === task.id
              ? {
                  ...t,
                  status: 'done',
                  resultUrl: URL.createObjectURL(result.blob),
                  resultBlob: result.blob,
                  resultName: result.outputName,
                  resultMime: result.outputMime,
                  resultSize: result.outputSize,
                  resultWidth: result.width,
                  resultHeight: result.height,
                  error: undefined,
                }
              : t
          )
        );
      } catch (err) {
        if (token !== conversionToken.current) return;
        setTasks((prev) =>
          prev.map((t) =>
            t.id === task.id
              ? {
                  ...t,
                  status: 'error',
                  error: err instanceof Error ? err.message : 'Conversion failed',
                }
              : t
          )
        );
      }
    },
    []
  );

  // Auto-convert whenever tasks or settings change
  useEffect(() => {
    const pending = tasks.filter((t) => t.status === 'idle');
    if (pending.length === 0) return;

    const token = conversionToken.current;
    setIsConverting(true);

    const run = async () => {
      const opts: ConvertOptions = {
        format: settings.format,
        quality: settings.quality,
        scale: settings.scale,
        resizeMode: settings.resizeMode,
        customWidth: settings.customWidth,
        customHeight: settings.customHeight,
        mode: settings.mode,
        targetSizeKb: settings.targetSizeKb,
        minSizeKb: settings.minSizeKb,
        matteColor: settings.matteColor,
        watermarkText: settings.watermarkText,
        watermarkOpacity: settings.watermarkOpacity,
      };
      for (const task of pending) {
        await convertTask(task, opts, token);
      }
      if (token === conversionToken.current) setIsConverting(false);
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks]);

  // Re-convert when settings change (only if tasks already exist)
  useEffect(() => {
    if (tasks.length === 0) return;
    if (settingsKey === lastConvertedKey.current) return;
    lastConvertedKey.current = settingsKey;

    const token = ++conversionToken.current;
    setIsConverting(true);

    const run = async () => {
      const opts: ConvertOptions = {
        format: settings.format,
        quality: settings.quality,
        scale: settings.scale,
        resizeMode: settings.resizeMode,
        customWidth: settings.customWidth,
        customHeight: settings.customHeight,
        mode: settings.mode,
        targetSizeKb: settings.targetSizeKb,
        minSizeKb: settings.minSizeKb,
        matteColor: settings.matteColor,
        watermarkText: settings.watermarkText,
        watermarkOpacity: settings.watermarkOpacity,
      };
      for (const task of tasks) {
        await convertTask(task, opts, token);
      }
      if (token === conversionToken.current) setIsConverting(false);
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsKey]);

  const handleDownload = useCallback((task: ConversionTask) => {
    if (!task.resultBlob || !task.resultName) return;
    const url = URL.createObjectURL(task.resultBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = task.resultName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, []);

  const handleDownloadAll = useCallback(async () => {
    const done = tasks.filter((t) => t.status === 'done' && t.resultBlob && t.resultName);
    if (done.length === 0) return;

    if (done.length === 1) {
      handleDownload(done[0]);
      return;
    }

    setIsZipping(true);
    try {
      const zip = new JSZip();
      const usedNames = new Set<string>();
      for (const task of done) {
        let name = task.resultName!;
        while (usedNames.has(name)) {
          const dot = name.lastIndexOf('.');
          name = dot > 0
            ? `${name.slice(0, dot)}_copy.${name.slice(dot + 1)}`
            : `${name}_copy`;
        }
        usedNames.add(name);
        zip.file(name, task.resultBlob!);
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `converted-images-${settings.format}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } finally {
      setIsZipping(false);
    }
  }, [tasks, handleDownload, settings.format]);

  const handleRemove = useCallback((id: string) => {
    setTasks((prev) => {
      const task = prev.find((t) => t.id === id);
      if (task) {
        URL.revokeObjectURL(task.previewUrl);
        if (task.resultUrl) URL.revokeObjectURL(task.resultUrl);
      }
      return prev.filter((t) => t.id !== id);
    });
  }, []);

  const handleClearAll = useCallback(() => {
    conversionToken.current++;
    tasks.forEach((task) => {
      URL.revokeObjectURL(task.previewUrl);
      if (task.resultUrl) URL.revokeObjectURL(task.resultUrl);
    });
    setTasks([]);
    setIsConverting(false);
  }, [tasks]);

  const doneCount = tasks.filter((t) => t.status === 'done').length;
  const errorCount = tasks.filter((t) => t.status === 'error').length;
  const allDone = tasks.length > 0 && doneCount === tasks.length;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-blue-600/30 selection:text-blue-200">
      {/* Background ambient lighting effects */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[600px] w-[900px] rounded-full bg-gradient-to-tr from-blue-600/10 via-indigo-600/10 to-cyan-500/10 blur-[140px]" />
        <div className="absolute top-[60%] -left-40 h-[500px] w-[500px] rounded-full bg-blue-600/5 blur-[120px]" />
        <div className="absolute top-[70%] -right-40 h-[500px] w-[500px] rounded-full bg-purple-600/5 blur-[120px]" />
      </div>

      {/* Top Sticky Navigation Bar */}
      <nav className="sticky top-0 z-40 border-b border-zinc-800/60 bg-zinc-950/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 sm:px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 shadow-sm p-1">
              <img
                src="/imgformatterpro.png"
                alt="ImgFormatter Pro"
                className="h-full w-full object-contain rounded-lg"
              />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                ImgFormatter <span className="text-blue-400 font-extrabold text-sm uppercase px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">PRO</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-[11px] font-semibold text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              100% Client-Side
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="relative z-10 mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12 flex-1 w-full">
        {/* Hero Section */}
        <header className="mb-8 sm:mb-10 text-center space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/80 px-3.5 py-1.5 shadow-inner backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-xs font-semibold text-zinc-300">
              High-Precision Formatting & Multi-Format Transcoder
            </span>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl text-white">
            Transform & Format Images <br className="hidden sm:inline" />
            <span className="text-gradient-blue">With Zero Quality Compromise</span>
          </h1>

          <p className="mx-auto max-w-2xl text-sm sm:text-base text-zinc-400 leading-relaxed">
            Convert formats, compress to exact target KB limits, and resize with physical & pixel dimensions on your device.
          </p>

          {/* Feature Highlights Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-xs">
            <span className="inline-flex items-center gap-1 rounded-lg bg-zinc-900/80 border border-zinc-800/80 px-2.5 py-1 text-zinc-300">
              <ShieldCheck className="h-3.5 w-3.5 text-blue-400" /> 0 Cloud Uploads
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg bg-zinc-900/80 border border-zinc-800/80 px-2.5 py-1 text-zinc-300">
              <Target className="h-3.5 w-3.5 text-blue-400" /> Exact Target KB
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg bg-zinc-900/80 border border-zinc-800/80 px-2.5 py-1 text-zinc-300">
              <Maximize2 className="h-3.5 w-3.5 text-blue-400" /> px, cm, mm, in + DPI
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg bg-zinc-900/80 border border-zinc-800/80 px-2.5 py-1 text-zinc-300">
              <Zap className="h-3.5 w-3.5 text-blue-400" /> Instant Processing
            </span>
          </div>
        </header>

        {/* Drop Zone */}
        <div className="mb-6">
          <DropZone onFiles={handleFiles} />
        </div>

        {/* Conversion Dashboard (Settings + Actions + Task list) */}
        {tasks.length > 0 && (
          <div className="mb-8 space-y-4">
            {/* Settings Card */}
            <SettingsBar
              settings={settings}
              onChange={setSettings}
              supportedFormats={supportedFormats}
            />

            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-3.5 backdrop-blur-md shadow-md">
              <div className="flex items-center gap-3 text-xs sm:text-sm text-zinc-400">
                <span className="font-semibold text-zinc-200">
                  {tasks.length} {tasks.length === 1 ? 'image' : 'images'}
                </span>
                {doneCount > 0 && (
                  <span className="flex items-center gap-1 font-semibold text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {doneCount} ready
                  </span>
                )}
                {errorCount > 0 && (
                  <span className="flex items-center gap-1 font-semibold text-red-400">
                    {errorCount} failed
                  </span>
                )}
                {isConverting && (
                  <span className="flex items-center gap-1.5 font-semibold text-blue-400">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Processing...
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={handleClearAll}
                  className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-800/60 px-3 py-1.5 text-xs font-semibold text-zinc-400 transition-all hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Clear All</span>
                </button>
                <button
                  onClick={handleDownloadAll}
                  disabled={!allDone || isZipping}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-1.5 text-xs sm:text-sm font-semibold text-white transition-all hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-600 shadow-lg shadow-blue-600/30 enabled:hover:shadow-blue-500/40"
                >
                  {isZipping ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  {isZipping
                    ? 'Packaging ZIP...'
                    : doneCount > 1
                    ? `Download All (${doneCount})`
                    : 'Download'}
                </button>
              </div>
            </div>

            {/* Task Cards List */}
            <div className="space-y-2.5">
              {tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onDownload={handleDownload}
                  onRemove={handleRemove}
                  onCompare={(t) => setComparingTask(t)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Feature Cards Showcase (When empty) */}
        {tasks.length === 0 && (
          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/40 p-5 backdrop-blur-sm transition-all hover:border-zinc-700 hover:bg-zinc-900/60">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 mb-3.5 border border-blue-500/20">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1.5">100% Confidential & Local</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Images are converted strictly inside your browser using HTML5 Canvas and WebAssembly. No data is ever sent across the web.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/40 p-5 backdrop-blur-sm transition-all hover:border-zinc-700 hover:bg-zinc-900/60">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 mb-3.5 border border-cyan-500/20">
                <Target className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1.5">Target File Size Optimizer</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Set strict KB limits (e.g. ≤ 20KB, ≤ 50KB, ≤ 100KB) to satisfy job portals, visa applications, and government forms automatically.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/40 p-5 backdrop-blur-sm transition-all hover:border-zinc-700 hover:bg-zinc-900/60">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 mb-3.5 border border-purple-500/20">
                <SlidersHorizontal className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1.5">Physical & Pixel Dimensions</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Input width and height in pixels (`px`) or real-world units (`cm`, `mm`, `in`) with customizable print/scan DPI resolution.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Modern Footer */}
      <footer className="mt-auto border-t border-zinc-900 bg-zinc-950/80 py-6 text-center">
        <div className="mx-auto max-w-4xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500">
          <p>© 2026 ImgFormatter Pro · Zero Server Uploads · Runs Offline</p>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1 text-zinc-400">
              <ShieldCheck className="h-3.5 w-3.5 text-blue-400" /> Pure Client-Side
            </span>
            <span className="text-zinc-700">|</span>
            <span>Fast · Free · Secure</span>
          </div>
        </div>
      </footer>

      {/* Before/After Split Comparison Modal */}
      {comparingTask && (
        <CompareModal
          task={comparingTask}
          onClose={() => setComparingTask(null)}
          onDownload={handleDownload}
        />
      )}
    </div>
  );
}

