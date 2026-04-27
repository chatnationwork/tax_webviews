'use client';

import { Check } from 'lucide-react';

interface StepIndicatorProps {
  current: 1 | 2 | 3;
  labels?: [string, string, string];
}

const DEFAULT_LABELS: [string, string, string] = ['Details', 'Traveler', 'Preview'];

export function StepIndicator({ current, labels = DEFAULT_LABELS }: StepIndicatorProps) {
  return (
    <div className="flex items-center mb-4">
      {labels.map((label, i) => {
        const step = i + 1;
        const completed = step < current;
        const active = step === current;
        return (
          <div key={step} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  completed
                    ? 'bg-green-500 text-white'
                    : active
                    ? 'bg-[var(--kra-red)] text-white'
                    : 'bg-gray-200 text-gray-400'
                }`}
              >
                {completed ? <Check className="w-4 h-4" /> : step}
              </div>
              <span
                className={`text-xs mt-1 whitespace-nowrap ${
                  active ? 'text-gray-900 font-semibold' : 'text-gray-400'
                }`}
              >
                {label}
              </span>
            </div>
            {i < 2 && (
              <div
                className={`flex-1 h-0.5 mx-1 mb-4 ${
                  completed ? 'bg-green-400' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
