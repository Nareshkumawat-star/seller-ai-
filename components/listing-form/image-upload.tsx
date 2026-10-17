"use client";

import * as React from "react";
import { Eye, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label, Textarea } from "@/components/ui/primitives";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

export type ImageUploadProps = {
  file: File | null;
  onFileChange: (file: File | null) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
  onAnalyze: () => void;
  analyzing: boolean;
  analysisError?: string | null;
  visionConfigured: boolean;
  visionSupported?: boolean;
  maxSizeMb: number;
  disabled?: boolean;
};

export function ImageUpload({
  file,
  onFileChange,
  notes,
  onNotesChange,
  onAnalyze,
  analyzing,
  analysisError,
  visionConfigured,
  visionSupported,
  maxSizeMb,
  disabled,
}: ImageUploadProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = React.useState<string | null>(null);
  const [preview, setPreview] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleSelect = (selected: File | null) => {
    setLocalError(null);
    if (!selected) {
      onFileChange(null);
      return;
    }
    if (!ACCEPTED.includes(selected.type)) {
      setLocalError("Use a JPEG, PNG, or WebP image.");
      return;
    }
    if (selected.size > maxSizeMb * 1024 * 1024) {
      setLocalError(`Images must be ${maxSizeMb} MB or smaller.`);
      return;
    }
    onFileChange(selected);
  };

  return (
    <div className="space-y-3 rounded-card border border-border bg-surface-muted/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Product photo</p>
          <p className="text-xs text-muted-foreground">
            Optional. Attached for reference only — it is never saved by Seller AI.
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(",")}
          className="sr-only"
          id="product-image"
          onChange={(event) => handleSelect(event.target.files?.[0] ?? null)}
          disabled={disabled}
        />
        <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={disabled}>
          <ImagePlus className="h-3.5 w-3.5" aria-hidden />
          {file ? "Replace" : "Attach image"}
        </Button>
      </div>

      {localError ? (
        <p role="alert" className="text-xs font-medium text-danger">
          {localError}
        </p>
      ) : null}

      {file && preview ? (
        <div className="flex gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt={`Preview of ${file.name}`}
            className="h-20 w-20 rounded-lg border border-border object-cover"
          />
          <div className="min-w-0 flex-1 space-y-2">
            <p className="truncate text-xs text-muted-foreground">
              {file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={onAnalyze}
                disabled={disabled || analyzing || !visionConfigured}
                title={
                  visionConfigured
                    ? "Send this image to your configured vision model"
                    : "Set OLLAMA_VISION_MODEL to enable image analysis"
                }
              >
                {analyzing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                ) : (
                  <Eye className="h-3.5 w-3.5" aria-hidden />
                )}
                {analyzing ? "Analyzing…" : "Analyze image"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  onFileChange(null);
                  if (inputRef.current) inputRef.current.value = "";
                }}
                disabled={disabled || analyzing}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                Remove
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <p className="text-xs leading-relaxed text-muted-foreground">
        {!visionConfigured
          ? "Image analysis is off on this deployment (no vision model configured). The photo stays in your browser; enter details like material and size manually."
          : visionSupported === false
            ? "The configured vision model is unavailable or does not support images. You can still attach the photo for reference and type the details manually."
            : "Image analysis is optional. Any observations are shown below as editable notes and are clearly marked as visual estimates — never treated as confirmed materials or dimensions."}
      </p>

      {analysisError ? (
        <p role="alert" className="text-xs font-medium text-danger">
          {analysisError}
        </p>
      ) : null}

      {notes ? (
        <div className="space-y-1.5">
          <Label htmlFor="vision-notes" className="text-xs">
            Visual notes (sent with the next generation)
          </Label>
          <Textarea
            id="vision-notes"
            value={notes}
            onChange={(event) => onNotesChange(event.target.value)}
            rows={3}
            className="text-xs"
          />
          <p className="text-[11px] text-muted-foreground">
            Visual observations only. Confirm materials, size, and origin yourself.
          </p>
        </div>
      ) : null}
    </div>
  );
}
