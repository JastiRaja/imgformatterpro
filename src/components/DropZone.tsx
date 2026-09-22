import { useCallback, useRef, useState } from 'react';
import { UploadCloud, FileImage, Sparkles } from 'lucide-react';

interface DropZoneProps {
  onFiles: (files: FileList) => void;
}

const SUPPORTED_PILLS = ['PNG', 'JPG', 'WEBP', 'BMP', 'SVG', 'AVIF'];

export default function DropZone({ onFiles }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragDepth = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current++;
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current--;
    if (dragDepth.current === 0) setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragDepth.current = 0;
      setIsDragging(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        onFiles(e.dataTransfer.files);
      }
    },
    [onFiles]
  );

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        onFiles(e.target.files);
      }
      e.target.value = '';
    },
    [onFiles]
  );

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') handleClick();
      }}
      className={`group relative flex flex-col items-center justify-center rounded-3xl border-2 border-dashed p-8 sm:p-12 text-center transition-all duration-300 cursor-pointer overflow-hidden
        ${
          isDragging
            ? 'border-blue-400 bg-blue-500/10 shadow-2xl shadow-blue-500/20 scale-[1.01]'
            : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/70 hover:shadow-2xl hover:shadow-blue-500/5'
        }`}
    >
      {/* Ambient background glow on hover / drag */}
      <div
        className={`pointer-events-none absolute inset-0 transition-opacity duration-500 ${
          isDragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'
        } bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.15),transparent_70%)]`}
      />

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Upload icon button container */}
      <div className="relative mb-5">
        <div
          className={`flex h-18 w-18 sm:h-20 sm:w-20 items-center justify-center rounded-2xl transition-all duration-300 ${
            isDragging
              ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/40 scale-110'
              : 'bg-zinc-800/80 text-blue-400 group-hover:bg-blue-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-blue-600/30 group-hover:scale-105'
          }`}
        >
          <UploadCloud className="h-9 w-9 transition-transform duration-300 group-hover:-translate-y-0.5" />
        </div>
        <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-white shadow-md">
          <Sparkles className="h-3 w-3" />
        </div>
      </div>

      <div className="space-y-1.5 z-10">
        <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white group-hover:text-blue-200 transition-colors">
          {isDragging ? 'Drop your images here' : 'Drop images to convert & format'}
        </h3>
        <p className="text-sm text-zinc-400">
          or <span className="font-semibold text-blue-400 underline underline-offset-4 group-hover:text-blue-300">browse files</span> directly from your device
        </p>
      </div>

      {/* Format tags */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-1.5 z-10">
        <span className="text-[11px] font-medium text-zinc-500 mr-1 flex items-center gap-1">
          <FileImage className="h-3 w-3" /> Supports:
        </span>
        {SUPPORTED_PILLS.map((fmt) => (
          <span
            key={fmt}
            className="rounded-md bg-zinc-800/90 border border-zinc-700/60 px-2 py-0.5 text-[10px] font-bold text-zinc-300 group-hover:border-zinc-600 group-hover:text-zinc-200 transition-colors"
          >
            {fmt}
          </span>
        ))}
      </div>
    </div>
  );
}

