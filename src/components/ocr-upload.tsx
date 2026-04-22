'use client';

import { useState, useCallback, useRef } from 'react';
import { createWorker } from 'tesseract.js';

export default function OcrUpload({
  onTextExtracted,
}: {
  onTextExtracted: (text: string) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processImage = useCallback(async (file: File) => {
    setProcessing(true);
    setProgress(0);

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    const worker = await createWorker('eng', 1, {
      logger: (m) => {
        if (m.progress) setProgress(Math.round(m.progress * 100));
      },
    });

    const { data } = await worker.recognize(file);
    await worker.terminate();

    if (data.text.trim()) {
      onTextExtracted(data.text.trim());
    }
    setProcessing(false);
    setProgress(0);
    setPreview(null);
  }, [onTextExtracted]);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    processImage(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const handlePaste = async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        for (const type of item.types) {
          if (type.startsWith('image/')) {
            const blob = await item.getType(type);
            const file = new File([blob], 'clipboard.png', { type });
            handleFile(file);
            return;
          }
        }
      }
    } catch {
      // Clipboard API may not be available
    }
  };

  return (
    <div>
      {/* Upload area */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-xl p-6 cursor-pointer transition-colors
          ${dragging
            ? 'border-blue-500 bg-blue-50'
            : processing
              ? 'border-amber-400 bg-amber-50'
              : 'border-zinc-300 hover:border-zinc-400 hover:bg-zinc-50'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleInputChange}
          className="hidden"
        />

        {processing ? (
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-3">
              <svg
                className="animate-spin h-5 w-5 text-amber-600"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              <span className="text-sm font-medium text-amber-700">
                Recognizing text... {progress}%
              </span>
            </div>
            <div className="w-full bg-amber-200 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-amber-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg
                className="w-5 h-5 text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-zinc-700">
                Upload screenshot or paste image
              </p>
              <p className="text-xs text-zinc-400">
                Drag & drop, click to browse, or Ctrl+V paste an image
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePaste();
              }}
              className="flex-shrink-0 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200
                text-zinc-600 rounded-lg text-xs font-medium transition-colors"
            >
              Paste Image
            </button>
          </div>
        )}
      </div>

      {/* Image preview while processing */}
      {preview && processing && (
        <div className="mt-3 relative rounded-lg overflow-hidden border border-zinc-200 max-h-40">
          <img
            src={preview}
            alt="Preview"
            className="w-full h-40 object-cover opacity-60"
          />
        </div>
      )}
    </div>
  );
}
