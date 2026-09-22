import type { ConversionTask } from '@/types';
import { formatBytes } from '@/lib/imageConverter';
import { Download, Loader2, AlertCircle, CheckCircle2, FileImage, Trash2, Split, ArrowRight, Sparkles } from 'lucide-react';

interface TaskCardProps {
  task: ConversionTask;
  onDownload: (task: ConversionTask) => void;
  onRemove: (id: string) => void;
  onCompare: (task: ConversionTask) => void;
}

export default function TaskCard({ task, onDownload, onRemove, onCompare }: TaskCardProps) {
  const handleDownload = () => onDownload(task);
  const isDone = task.status === 'done' && task.resultBlob && task.resultSize !== undefined;
  const isSmaller = isDone && task.resultSize! < task.fileSize;
  const percentChange = isDone && task.fileSize > 0
    ? Math.abs(Math.round(((task.fileSize - task.resultSize!) / task.fileSize) * 100))
    : 0;

  return (
    <div className="group relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-3.5 sm:p-4 backdrop-blur-md transition-all duration-300 hover:border-zinc-700 hover:bg-zinc-900/90 hover:shadow-xl hover:shadow-blue-500/5">
      {/* Left: Thumbnail & Details */}
      <div className="flex items-center gap-3.5 min-w-0 w-full sm:w-auto flex-1">
        {/* Thumbnail with compare trigger */}
        <div
          onClick={() => isDone && onCompare(task)}
          className={`relative h-14 w-14 sm:h-16 sm:w-16 shrink-0 overflow-hidden rounded-xl bg-zinc-950 border border-zinc-800 transition-all ${
            isDone ? 'cursor-pointer hover:ring-2 hover:ring-blue-500 hover:border-transparent group/thumb' : ''
          }`}
          title={isDone ? 'Click to inspect / compare' : undefined}
        >
          <img
            src={isDone && task.resultUrl ? task.resultUrl : task.previewUrl}
            alt={task.fileName}
            className="h-full w-full object-cover transition-transform duration-300 group-hover/thumb:scale-110"
          />
          {isDone && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover/thumb:opacity-100">
              <Split className="h-4 w-4 text-white drop-shadow-md" />
            </div>
          )}
        </div>

        {/* Info Column */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <FileImage className="h-4 w-4 shrink-0 text-blue-400" />
            <p className="truncate text-sm font-semibold text-zinc-100">{task.fileName}</p>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-zinc-400 font-medium">{formatBytes(task.fileSize)}</span>

            {isDone && task.resultName ? (
              <>
                <ArrowRight className="h-3 w-3 text-zinc-600" />
                <span className="font-semibold text-zinc-200">{task.resultName}</span>
                <span className="font-bold text-blue-400">({formatBytes(task.resultSize!)})</span>

                {isSmaller ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-bold text-emerald-400 shadow-sm">
                    <Sparkles className="h-2.5 w-2.5" />
                    -{percentChange}%
                  </span>
                ) : task.resultSize! > task.fileSize ? (
                  <span className="inline-flex items-center rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[11px] font-bold text-amber-400">
                    +{percentChange}%
                  </span>
                ) : null}

                {task.resultWidth && task.resultHeight ? (
                  <span className="text-[11px] text-zinc-500 hidden md:inline font-mono">
                    · {task.resultWidth}×{task.resultHeight}px
                  </span>
                ) : null}
              </>
            ) : task.status === 'error' ? (
              <span className="text-red-400 font-medium truncate">{task.error || 'Conversion failed'}</span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-800/60">
        {task.status === 'processing' && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-semibold">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Converting...</span>
          </div>
        )}

        {task.status === 'done' && (
          <>
            <button
              onClick={() => onCompare(task)}
              className="flex items-center gap-1.5 rounded-xl bg-zinc-800/90 border border-zinc-700/60 px-3 py-1.5 text-xs font-semibold text-zinc-300 transition-all hover:bg-zinc-700 hover:text-white hover:border-zinc-500"
              title="Compare side-by-side"
            >
              <Split className="h-3.5 w-3.5 text-blue-400" />
              <span>Compare</span>
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-blue-600/25 transition-all hover:bg-blue-500 hover:shadow-blue-500/40"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download</span>
            </button>
          </>
        )}

        {task.status === 'error' && (
          <div className="flex items-center gap-1.5 text-xs font-medium text-red-400">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <span>Failed</span>
          </div>
        )}

        {task.status === 'idle' && (
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Queued</span>
          </div>
        )}

        <button
          onClick={() => onRemove(task.id)}
          className="flex h-8 w-8 items-center justify-center rounded-xl text-zinc-500 transition-all hover:bg-red-500/15 hover:text-red-400 ml-1"
          aria-label="Remove file"
          title="Remove image"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}


