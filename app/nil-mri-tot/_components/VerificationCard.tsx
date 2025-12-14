'use client';

import { CheckCircle } from 'lucide-react';

interface VerificationCardProps {
  fullName: string;
  idNumber: string;
  pin: string;
  yob: number;
  filingYear: number;
}

export function VerificationCard({ fullName, idNumber, pin, yob, filingYear }: VerificationCardProps) {
  return (
    <div className="bg-white rounded-xl p-8 shadow-lg border-2 border-green-200">
      <div className="flex items-start gap-4 mb-6">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
          <CheckCircle className="w-6 h-6 text-green-600" />
        </div>
        <div>
          <h3 className="text-green-900 font-semibold mb-1">Taxpayer Verified</h3>
          <p className="text-gray-600">Please confirm your details below</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-gray-500 block mb-1">Full Name</label>
            <p className="text-gray-900 font-medium">{fullName}</p>
          </div>
          <div>
            <label className="text-gray-500 block mb-1">ID Number</label>
            <p className="text-gray-900 font-medium">{idNumber}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-gray-500 block mb-1">Year of Birth</label>
            <p className="text-gray-900 font-medium">{yob}</p>
          </div>
          <div>
            <label className="text-gray-500 block mb-1">PIN Number</label>
            <p className="text-gray-900 font-medium">{pin}</p>
          </div>
        </div>

        <div>
          <label className="text-gray-500 block mb-1">Filing Year</label>
          <p className="text-gray-900 font-medium">{filingYear} <span className="text-gray-500 font-normal">(auto-picked)</span></p>
        </div>
      </div>
    </div>
  );
}
