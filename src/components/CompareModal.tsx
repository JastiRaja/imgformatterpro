import { useState, useRef, useCallback, useEffect } from 'react';
import type { ConversionTask } from '@/types';
import { formatBytes } from '@/lib/imageConverter';
import { X, Download, Split, Check } from 'lucide-react';

interface CompareModalProps {
  task: ConversionTask | null;
  onClose: () => void;
  onDownload: (task: ConversionTask) => void;
}

export default function CompareModal({ task, onClose, onDownload }: CompareModalProps) {
  const [sliderPos, setSliderPos] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const updatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPos(percent);
  }, []);

  const handleMouseDown = () => setIsDragging(true);
  const handleMouseUp = () => setIsDragging(false);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging) {
        updatePosition(e.clientX);
      }
    },
    [isDragging, updatePosition]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length > 0) {
        updatePosition(e.touches[0].clientX);
      }
    },
    [updatePosition]
  );

  if (!task || !task.resultUrl) return null;

  const originalSize = task.fileSize;
  const newSize = task.resultSize ?? 0;
  const isSmaller = newSize < originalSize;
  const sizeDiffPercent = originalSize > 0 ? Math.abs(Math.round(((originalSize - newSize) / originalSize) * 100)) : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl p-3 sm:p-6 transition-all"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col w-full max-w-5xl max-h-[92vh] rounded-3xl border border-zinc-800/90 bg-zinc-950/95 shadow-2xl overflow-hidden ring-1 ring-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 px-5 sm:px-6 py-4 bg-zinc-900/60 backdrop-blur-md">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Split className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-white truncate">{task.fileName}</h2>
              <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400 mt-0.5">
                <span>Original: <strong className="text-zinc-200">{formatBytes(originalSize)}</strong></span>
                <span className="text-zinc-600">→</span>
                <span>Converted: <strong className="text-zinc-200">{formatBytes(newSize)}</strong></span>
                {isSmaller ? (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-bold text-emerald-400">
                    <Check className="h-3 w-3" />
                    -{sizeDiffPercent}%
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[11px] font-bold text-amber-400">
                    +{sizeDiffPercent}%
                  </span>
                )}
                {task.resultWidth && task.resultHeight ? (
                  <span className="text-zinc-500 hidden md:inline font-mono">
                    · {task.resultWidth}×{task.resultHeight}px
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onDownload(task)}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 transition-all"
            >
              <Download className="h-4 w-4" />
              <span>Download</span>
            </button>
            <button
              onClick={onClose}
              className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-all"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Interactive Split Viewer */}
        <div
          ref={containerRef}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onTouchMove={handleTouchMove}
          className="relative flex-1 min-h-[360px] sm:min-h-[500px] select-none overflow-hidden bg-zinc-950 flex items-center justify-center cursor-ew-resize"
          style={{
            backgroundImage: `radial-gradient(#27272a 1px, transparent 1px)`,
            backgroundSize: '20px 20px',
          }}
        >
          {/* Converted Image (Base Layer - Right) */}
          <img
            src={task.resultUrl}
            alt="Converted"
            className="pointer-events-none absolute max-h-[85%] max-w-[90%] object-contain"
          />

          {/* Original Image (Clipped Layer - Left) */}
          <div
            className="absolute inset-0 overflow-hidden flex items-center justify-center"
            style={{ clipPath: `polygon(0 0, ${sliderPos}% 0, ${sliderPos}% 100%, 0 100%)` }}
          >
            <img
              src={task.previewUrl}
              alt="Original"
              className="pointer-events-none absolute max-h-[85%] max-w-[90%] object-contain"
            />
          </div>

          {/* Split Divider Line & Handle */}
          <div
            className="absolute top-0 bottom-0 z-20 w-0.5 bg-blue-400 shadow-[0_0_16px_rgba(59,130,246,0.8)]"
            style={{ left: `${sliderPos}%` }}
          >
            <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white shadow-2xl shadow-blue-500/60 border-2 border-zinc-950 cursor-grab active:cursor-grabbing">
              <Split className="h-4 w-4" />
            </div>
          </div>

          {/* Floating Badges */}
          <div className="pointer-events-none absolute bottom-4 left-4 z-10 rounded-xl bg-zinc-950/85 backdrop-blur-md px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-300 border border-zinc-800/80 shadow-lg">
            Original ({formatBytes(originalSize)})
          </div>
          <div className="pointer-events-none absolute bottom-4 right-4 z-10 rounded-xl bg-blue-950/85 backdrop-blur-md px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-blue-300 border border-blue-800/80 shadow-lg">
            Converted ({formatBytes(newSize)})
          </div>
        </div>

        {/* Footer Hint */}
        <div className="border-t border-zinc-800/60 bg-zinc-900/50 px-6 py-2.5 text-center text-xs text-zinc-400">
          Drag the center handle left or right to inspect compression sharpness and artifacts in real-time
        </div>
      </div>
    </div>
  );
}

