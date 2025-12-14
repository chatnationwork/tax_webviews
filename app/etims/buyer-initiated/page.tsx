'use client';

import { useRouter } from 'next/navigation';
import { Layout, Card } from '../_components/Layout';
import { Clock, CheckCircle, XCircle, FilePlus } from 'lucide-react';

export default function BuyerInitiatedHome() {
  const router = useRouter();

  const sellerActions = [
    {
      title: 'Create Buyer-Initiated Invoice',
      icon: FilePlus,
      color: 'blue' as const,
      onClick: () => router.push('/etims/buyer-initiated/seller/create'),
    },
    {
      title: 'Pending Invoices',
      icon: Clock,
      color: 'yellow' as const,
      badge: '2',
      onClick: () => alert('Feature coming soon'),
    },
    {
      title: 'Completed Invoices',
      icon: CheckCircle,
      color: 'green' as const,
      onClick: () => alert('Feature coming soon'),
    },
    {
      title: 'Rejected Invoices',
      icon: XCircle,
      color: 'red' as const,
      onClick: () => alert('Feature coming soon'),
    },
  ];

  const buyerActions = [
    {
      title: 'Invoices Awaiting Action',
      icon: Clock,
      color: 'orange' as const,
      badge: '2',
      onClick: () => router.push('/etims/buyer-initiated/buyer/pending'),
    },
    {
      title: 'Accepted Invoices',
      icon: CheckCircle,
      color: 'green' as const,
      onClick: () => alert('Feature coming soon'),
    },
    {
      title: 'Rejected Invoices',
      icon: XCircle,
      color: 'red' as const,
      onClick: () => alert('Feature coming soon'),
    },
  ];

  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
    yellow: 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100',
    green: 'bg-green-50 border-green-200 hover:bg-green-100',
    red: 'bg-red-50 border-red-200 hover:bg-red-100',
    orange: 'bg-orange-50 border-orange-200 hover:bg-orange-100',
  };

  type ActionItem = {
    title: string;
    icon: typeof Clock;
    color: 'blue' | 'yellow' | 'green' | 'red' | 'orange';
    badge?: string;
    onClick: () => void;
  };

  const ActionButton = ({ action }: { action: ActionItem }) => {
    const Icon = action.icon;

    return (
      <button
        onClick={action.onClick}
        className={`w-full text-left transition-colors rounded-lg border ${colorClasses[action.color]}`}
      >
        <Card className="relative">
          <div className="flex items-center gap-3">
            <Icon className="w-5 h-5 text-gray-700 flex-shrink-0" />
            <span className="text-gray-900 font-medium flex-1">{action.title}</span>
            {action.badge && (
              <span className="px-2 py-1 text-xs bg-red-600 text-white rounded-full font-medium">
                {action.badge}
              </span>
            )}
          </div>
        </Card>
      </button>
    );
  };

  return (
    <Layout 
      title="Buyer Initiated" 
      onBack={() => router.push('/etims')}
    >
      <div className="space-y-6">
        {/* Seller Actions */}
        <div>
          <h2 className="text-gray-900 font-medium mb-3">Seller Actions</h2>
          <div className="space-y-2">
            {sellerActions.map((action) => (
              <ActionButton key={action.title} action={action} />
            ))}
          </div>
        </div>

        {/* Buyer Actions */}
        <div>
          <h2 className="text-gray-900 font-medium mb-3">Buyer Actions</h2>
          <div className="space-y-2">
            {buyerActions.map((action) => (
              <ActionButton key={action.title} action={action} />
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
