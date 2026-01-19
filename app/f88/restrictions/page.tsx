'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Layout, Card, Button } from '@/app/_components/Layout';
import { ArrowLeft, AlertTriangle, Ban, Package, Info } from 'lucide-react';

function RestrictionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get('phone') || '';

  const handleGoBack = () => {
    // Use router.back() to preserve form state
    router.back();
  };

  return (
    <Layout title="Restrictions & Prohibitions" onBack={handleGoBack} showMenu>
      <div className="space-y-4">
        {/* Header */}
        <div className="text-center py-2">
          <h1 className="text-lg font-bold text-gray-900">Prohibited, Restricted, and Dutiable Items</h1>
          <p className="text-xs text-gray-600 mt-1">
            The importation and exportation of certain goods is regulated under the East African Community Customs Management Act (EACCMA), as set out in the Second and Third Schedules.
          </p>
        </div>

        {/* Prohibited Items */}
        <Card className="p-4 border-l-4 border-red-500">
          <div className="flex items-center gap-2 mb-3">
            <Ban className="w-5 h-5 text-red-600" />
            <h2 className="text-base font-bold text-red-900">1. Prohibited Items</h2>
          </div>
          <p className="text-xs text-gray-600 mb-3">
            The following items are strictly prohibited from import or export under the Act. This list is not exhaustive:
          </p>
          <ul className="space-y-1.5 text-xs text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-red-500 mt-0.5">•</span>
              <span>Counterfeit currency, including false money, notes, and coins</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500 mt-0.5">•</span>
              <span>Pornographic materials in any form or media</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500 mt-0.5">•</span>
              <span>Distilled beverages that are harmful to health</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500 mt-0.5">•</span>
              <span>Used tyres for passenger cars and light commercial vehicles</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500 mt-0.5">•</span>
              <span>Matches containing white phosphorus</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500 mt-0.5">•</span>
              <span>Narcotic drugs under international control</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500 mt-0.5">•</span>
              <span>Hazardous waste and materials intended for disposal</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500 mt-0.5">•</span>
              <span>Soaps and cosmetic products containing mercury</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500 mt-0.5">•</span>
              <span>Any goods whose importation is prohibited under the Act or any other written law in force within a Partner State</span>
            </li>
          </ul>
        </Card>

        {/* Restricted Items */}
        <Card className="p-4 border-l-4 border-orange-500">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <h2 className="text-base font-bold text-orange-900">2. Restricted Items</h2>
          </div>
          <p className="text-xs text-gray-600 mb-3">
            The following items are restricted and require prior approval, permits, or licenses before import or export. This list is not exhaustive:
          </p>
          <ul className="space-y-1.5 text-xs text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-orange-500 mt-0.5">•</span>
              <span>Live animals, including pets</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-500 mt-0.5">•</span>
              <span>Plants and plant products</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-500 mt-0.5">•</span>
              <span>Explosives</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-500 mt-0.5">•</span>
              <span>Wildlife products, including ivory</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-500 mt-0.5">•</span>
              <span>Precious metals and precious stones</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-500 mt-0.5">•</span>
              <span>Arms, ammunition, and related parts or accessories</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-500 mt-0.5">•</span>
              <span>Drones</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-500 mt-0.5">•</span>
              <span>Bows and arrows</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-500 mt-0.5">•</span>
              <span>Any goods whose importation is restricted under the Act or any other written law in force within a Partner State</span>
            </li>
          </ul>
        </Card>

        {/* Duty-Free Allowance */}
        <Card className="p-4 border-l-4 border-blue-500">
          <div className="flex items-center gap-2 mb-3">
            <Package className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-blue-900">3. Items Exceeding Duty-Free Allowances</h2>
          </div>
          <p className="text-xs text-gray-600 mb-3">
            The following items are subject to duty when they exceed the allowable limits:
          </p>
          <div className="space-y-3 text-xs">
            <div className="bg-blue-50 p-3 rounded-lg">
              <span className="font-semibold text-blue-800 block mb-1">Alcoholic Beverages</span>
              <ul className="text-gray-700 ml-2 space-y-0.5">
                <li>• Spirits or liquors exceeding 1 litre, or</li>
                <li>• Wine exceeding 2 litres</li>
              </ul>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <span className="font-semibold text-blue-800 block mb-1">Perfume and Toilet Water</span>
              <ul className="text-gray-700 ml-2 space-y-0.5">
                <li>• Exceeding 0.5 litres in total, of which no more than 0.25 litres may be perfume</li>
              </ul>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <span className="font-semibold text-blue-800 block mb-1">Tobacco Products</span>
              <ul className="text-gray-700 ml-2 space-y-0.5">
                <li>• Cigarettes, cigars, cigarillos, tobacco, or snuff exceeding 250 grams in total weight</li>
              </ul>
            </div>
          </div>
          <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-800">
              <strong>Note:</strong> Duty-free allowances apply only to passengers aged 18 years and above.
            </p>
          </div>
        </Card>

        {/* Back Button */}
        <Button 
          onClick={handleGoBack}
          variant="secondary"
          className="w-full flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Declaration Form
        </Button>
      </div>
    </Layout>
  );
}

export default function RestrictionsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[var(--kra-red)] border-t-transparent rounded-full"></div>
      </div>
    }>
      <RestrictionsContent />
    </Suspense>
  );
}
