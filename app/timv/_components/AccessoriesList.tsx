'use client';

import { Plus, Trash2 } from 'lucide-react';
import { Input } from '../../_components/Layout';
import { FileUpload } from './FileUpload';

export interface Accessory {
  description: string;
  value: string;
  attachment?: File | null;
}

interface AccessoriesListProps {
  accessories: Accessory[];
  onChange: (accessories: Accessory[]) => void;
}

export function AccessoriesList({ accessories, onChange }: AccessoriesListProps) {
  const update = (index: number, patch: Partial<Accessory>) => {
    const next = accessories.map((a, i) => (i === index ? { ...a, ...patch } : a));
    onChange(next);
  };

  const add = () => {
    onChange([...accessories, { description: '', value: '' }]);
  };

  const remove = (index: number) => {
    onChange(accessories.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      {accessories.map((acc, i) => (
        <div key={i} className="border border-gray-200 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-600">Accessory {i + 1}</span>
            <button
              type="button"
              onClick={() => remove(i)}
              className="text-red-400 hover:text-red-600"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <Input
            label="Description"
            value={acc.description}
            onChange={v => update(i, { description: v })}
            required
          />
          <Input
            label="Value (KES)"
            value={acc.value}
            onChange={v => update(i, { value: v })}
            type="number"
            required
          />
          <FileUpload
            label="Attachment (optional)"
            value={acc.attachment ?? null}
            onChange={file => update(i, { attachment: file })}
          />
        </div>
      ))}

      <button
        type="button"
        onClick={add}
        className="flex items-center gap-1 text-xs text-[var(--kra-red)] font-medium hover:underline"
      >
        <Plus className="w-4 h-4" />
        Add Accessory
      </button>
    </div>
  );
}
