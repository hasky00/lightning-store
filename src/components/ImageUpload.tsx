"use client";

import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { resizeImage } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  value: string;
  onChange: (dataUrl: string) => void;
  className?: string;
}

export function ImageUpload({ value, onChange, className }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    if (file.size > 10 * 1024 * 1024) {
      alert("Image must be under 10 MB");
      return;
    }
    setLoading(true);
    try {
      const dataUrl = await resizeImage(file);
      onChange(dataUrl);
    } catch {
      alert("Failed to process image");
    } finally {
      setLoading(false);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  return (
    <div className={cn("space-y-2", className)}>
      <label className="label">Product Image</label>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "relative flex aspect-video cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors",
          dragging
            ? "border-[var(--bolt)] bg-[var(--bolt)]/5"
            : "border-[var(--border)] hover:border-[var(--bolt)]/50 hover:bg-[var(--surface-2)]"
        )}
      >
        {value ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt="Preview"
              className="h-full w-full rounded-[10px] object-cover"
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 p-6 text-center">
            <ImagePlus className="h-8 w-8 text-[var(--text-muted)]" />
            <p className="text-sm font-medium text-[var(--text-secondary)]">
              {loading ? "Processing…" : "Drop image or click to upload"}
            </p>
            <p className="text-xs text-[var(--text-muted)]">JPG, PNG, WebP · max 10 MB</p>
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </div>
  );
}