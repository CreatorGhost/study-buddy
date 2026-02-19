'use client';

import { useRef, useState } from 'react';
import { Camera, X, Loader2 } from 'lucide-react';
import { compressImage } from '@/lib/pyq-utils';

interface PYQImageUploadProps {
  imageBase64?: string;
  onImageChange: (base64: string | undefined) => void;
  disabled?: boolean;
}

export default function PYQImageUpload({
  imageBase64,
  onImageChange,
  disabled = false,
}: PYQImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    setUploadError(null);
    try {
      const base64 = await compressImage(file);
      onImageChange(base64);
    } catch (err) {
      console.error('Failed to compress image:', err);
      setUploadError('Failed to process image. Please try a different file.');
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = () => {
    onImageChange(undefined);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2.5">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isCompressing}
      />

      {!imageBase64 && !isCompressing && (
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="w-full flex flex-col items-center justify-center gap-2 px-4 py-6
                     border border-dashed border-border rounded-md
                     bg-bg-elevated hover:border-border-hover hover:bg-bg-hover
                     transition-colors duration-100
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Camera size={20} className="text-text-muted" />
          <span className="text-[12px] text-text-secondary">
            Take photo or upload image
          </span>
          <span className="text-[11px] text-text-faint">
            Supports handwritten answers
          </span>
        </button>
      )}

      {isCompressing && (
        <div className="w-full flex items-center justify-center gap-2 px-4 py-6
                        border border-border rounded-md bg-bg-elevated">
          <Loader2 size={16} className="text-accent animate-spin" />
          <span className="text-[12px] text-text-secondary">Compressing image...</span>
        </div>
      )}

      {uploadError && (
        <p className="text-[11px] text-error">{uploadError}</p>
      )}

      {imageBase64 && !isCompressing && (
        <div className="relative border border-border rounded-md overflow-hidden bg-bg-elevated">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageBase64}
            alt="Uploaded answer"
            className="w-full max-h-[300px] object-contain"
          />
          <button
            onClick={handleRemove}
            disabled={disabled}
            className="absolute top-2 right-2 w-6 h-6 rounded-md
                       bg-bg-surface/80 border border-border
                       flex items-center justify-center
                       hover:bg-error-subtle hover:border-error
                       transition-colors duration-100
                       disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Remove image"
          >
            <X size={12} className="text-text-secondary" />
          </button>
        </div>
      )}
    </div>
  );
}
