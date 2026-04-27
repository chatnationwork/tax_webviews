'use client';

import { useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { Button } from '../../_components/Layout';

interface AcknowledgementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  error?: string;
}

export function AcknowledgementModal({ isOpen, onClose, onConfirm, error }: AcknowledgementModalProps) {
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!checked || submitting) return;
    setSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
      <div className="w-full max-w-md bg-white rounded-t-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Declaration</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-gray-600 leading-relaxed">
          I hereby declare that all the information provided in this application is true, correct,
          and complete to the best of my knowledge. I understand that providing false information
          is an offence under the Customs and Excise Act.
        </p>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={checked}
            onChange={e => setChecked(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-[var(--kra-red)]"
          />
          <span className="text-xs text-gray-700">
            I agree to the declaration above and confirm the accuracy of all submitted information.
          </span>
        </label>

        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
        )}

        <div className="flex gap-2 pt-1">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!checked || submitting}
            className="flex-1"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin inline mr-1" />
                Submitting…
              </>
            ) : (
              'Submit Application'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
