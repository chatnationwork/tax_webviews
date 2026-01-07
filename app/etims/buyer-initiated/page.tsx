'use client';

import { useRouter } from 'next/navigation';
import { Layout } from '../../_components/Layout';
import { Clock, CheckCircle, XCircle, FilePlus } from 'lucide-react';

export default function BuyerInitiatedHome() {
  const router = useRouter();

  const buyerActions = [
    { title: 'Create Invoice', description: 'Create a new buyer-initiated invoice', icon: FilePlus, color: 'blue' as const, onClick: () => router.push('/etims/buyer-initiated/buyer/create') },
    { title: 'Pending Invoices', description: 'Waiting for seller approval', icon: Clock, color: 'yellow' as const, onClick: () => router.push('/etims/buyer-initiated/buyer/invoices?status=pending') },
    { title: 'Approved Invoices', description: 'Approved by seller', icon: CheckCircle, color: 'green' as const, onClick: () => router.push('/etims/buyer-initiated/buyer/invoices?status=approved') },
    { title: 'Rejected Invoices', description: 'Declined by seller', icon: XCircle, color: 'red' as const, onClick: () => router.push('/etims/buyer-initiated/buyer/invoices?status=rejected') },
  ];

  const sellerActions = [
    { title: 'Pending Invoice', description: 'Awaiting your approval', icon: Clock, color: 'orange' as const, onClick: () => router.push('/etims/buyer-initiated/seller/pending') },
    { title: 'Approved Invoice', description: 'Invoices you approved', icon: CheckCircle, color: 'green' as const, onClick: () => router.push('/etims/buyer-initiated/seller/pending?status=approved') },
    { title: 'Rejected Invoice', description: 'Invoices you declined', icon: XCircle, color: 'red' as const, onClick: () => router.push('/etims/buyer-initiated/seller/pending?status=rejected') },
  ];

  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 active:bg-blue-100',
    yellow: 'bg-yellow-50 border-yellow-200 active:bg-yellow-100',
    green: 'bg-green-50 border-green-200 active:bg-green-100',
    red: 'bg-red-50 border-red-200 active:bg-red-100',
    orange: 'bg-orange-50 border-orange-200 active:bg-orange-100',
  };

  const iconColorClasses = {
    blue: 'text-blue-600 bg-blue-100',
    yellow: 'text-yellow-600 bg-yellow-100',
    green: 'text-green-600 bg-green-100',
    red: 'text-red-600 bg-red-100',
    orange: 'text-orange-600 bg-orange-100',
  };

  type ActionItem = { title: string; description: string; icon: typeof Clock; color: 'blue' | 'yellow' | 'green' | 'red' | 'orange'; onClick: () => void };

  const ActionButton = ({ action }: { action: ActionItem }) => {
    const Icon = action.icon;
    const color = action.color;
    return (
      <button onClick={action.onClick}
        className={`w-full text-left transition-all rounded-lg border-2 px-3 py-2 ${colorClasses[color]} active:scale-[0.98]`}>
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${iconColorClasses[color]}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-gray-900 font-semibold text-sm truncate">{action.title}</p>
            <p className="text-gray-500 text-xs truncate">{action.description}</p>
          </div>
        </div>
      </button>
    );
  };

  return (
    <Layout title="Buyer Initiated" onBack={() => router.push('/etims')}>
      <div className="space-y-4">
        {/* Buyer Actions */}
        <div>
          <h2 className="text-gray-900 font-bold text-sm mb-2">👤 Buyer</h2>
          <div className="space-y-2">
            {buyerActions.map((action) => (
              <ActionButton key={action.title} action={action} />
            ))}
          </div>
        </div>

        {/* Seller Actions */}
        <div>
          <h2 className="text-gray-900 font-bold text-sm mb-2">🏪 Seller</h2>
          <div className="space-y-2">
            {sellerActions.map((action) => (
              <ActionButton key={action.title} action={action} />
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
