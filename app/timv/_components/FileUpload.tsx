'use client';

import { useRef } from 'react';
import { Paperclip, X, FileText } from 'lucide-react';

interface FileUploadProps {
  label: string;
  value?: File | null;
  onChange: (file: File | null) => void;
  accept?: string;
  required?: boolean;
  error?: string;
  existingFileName?: string;
}

export function FileUpload({
  label,
  value,
  onChange,
  accept = '.pdf,application/pdf',
  required,
  error,
  existingFileName,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const displayName = value?.name ?? existingFileName ?? null;

  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>

      {displayName ? (
        <div className="flex items-center gap-2 p-2 bg-gray-50 border border-gray-200 rounded-lg">
          <FileText className="w-4 h-4 text-gray-500 shrink-0" />
          <span className="text-xs text-gray-700 flex-1 truncate">{displayName}</span>
          <button
            type="button"
            onClick={() => {
              onChange(null);
              if (inputRef.current) inputRef.current.value = '';
            }}
            className="text-red-400 hover:text-red-600 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={`w-full flex items-center gap-2 p-2 border-2 border-dashed rounded-lg text-xs text-gray-500 hover:border-[var(--kra-red)] hover:text-[var(--kra-red)] transition-colors ${
            error ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white'
          }`}
        >
          <Paperclip className="w-4 h-4 shrink-0" />
          <span>Select PDF (max 10 MB)</span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0] ?? null;
          onChange(file);
        }}
      />

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
