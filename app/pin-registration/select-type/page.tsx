'use client';

import { useRouter } from 'next/navigation';
import { Layout } from '../../_components/Layout';
import { Globe, Flag } from 'lucide-react';

export default function SelectResidencyType() {
  const router = useRouter();

  return (
    <Layout title="Select Registration Type" onBack={() => router.back()}>
      <div className="space-y-4">
        <button
          onClick={() => router.push('/pin-registration/kenyan/identity')}
          className="w-full bg-white border-2 border-gray-300 rounded-xl p-6 hover:border-green-600 hover:bg-green-50 transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Flag className="w-8 h-8 text-green-600" />
            </div>
            <div className="text-left flex-1">
              <h3 className="text-gray-900 font-semibold mb-1">Kenyan Resident</h3>
              <p className="text-sm text-gray-600">
                Register using your National ID
              </p>
            </div>
          </div>
        </button>

        <button
          onClick={() => router.push('/pin-registration/non-kenyan/identity')}
          className="w-full bg-white border-2 border-gray-300 rounded-xl p-6 hover:border-green-600 hover:bg-green-50 transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Globe className="w-8 h-8 text-blue-600" />
            </div>
            <div className="text-left flex-1">
              <h3 className="text-gray-900 font-semibold mb-1">Non-Kenyan Resident</h3>
              <p className="text-sm text-gray-600">
                Register using your Alien ID
              </p>
            </div>
          </div>
        </button>
      </div>
    </Layout>
  );
}
