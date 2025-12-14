'use client';

import { useRouter } from 'next/navigation';
import { FileText, FileMinus, UserCheck, LogOut } from 'lucide-react';
import { Layout, Card } from './_components/Layout';
import { clearSalesInvoice, clearCreditNote, clearBuyerInitiated } from './_lib/store';

export default function EtimsHome() {
  const router = useRouter();

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      clearSalesInvoice();
      clearCreditNote();
      clearBuyerInitiated();
      alert('Logged out successfully');
    }
  };

  const actionCards = [
    {
      title: 'Sales Invoice',
      description: 'Create sales invoices',
      icon: FileText,
      color: 'blue' as const,
      onClick: () => {
        clearSalesInvoice();
        router.push('/etims/sales-invoice/buyer');
      },
    },
    {
      title: 'Credit Note',
      description: 'Full or partial credit notes',
      icon: FileMinus,
      color: 'green' as const,
      onClick: () => {
        clearCreditNote();
        router.push('/etims/credit-note/search');
      },
    },
    {
      title: 'Buyer Initiated',
      description: 'Buyer-seller invoice approvals',
      icon: UserCheck,
      color: 'purple' as const,
      onClick: () => {
        clearBuyerInitiated();
        router.push('/etims/buyer-initiated');
      },
    },
  ];

  const colorClasses = {
    blue: {
      card: 'bg-blue-50 border-blue-200',
      icon: 'bg-blue-100',
      text: 'text-blue-600',
    },
    green: {
      card: 'bg-green-50 border-green-200',
      icon: 'bg-green-100',
      text: 'text-green-600',
    },
    purple: {
      card: 'bg-purple-50 border-purple-200',
      icon: 'bg-purple-100',
      text: 'text-purple-600',
    },
  };

  return (
    <Layout title="eTIMS Home" showMenu={false}>
      <div className="space-y-6">
        {/* Action Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          {actionCards.map((card) => {
            const Icon = card.icon;
            const colors = colorClasses[card.color];

            return (
              <button
                key={card.title}
                onClick={card.onClick}
                className="text-left transition-transform hover:scale-105"
              >
                <Card className={`h-full ${colors.card}`}>
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className={`p-4 rounded-full ${colors.icon}`}>
                      <Icon className={`w-8 h-8 ${colors.text}`} />
                    </div>
                    <div>
                      <h3 className="text-gray-900 font-medium mb-1">{card.title}</h3>
                      <p className="text-sm text-gray-600">{card.description}</p>
                    </div>
                  </div>
                </Card>
              </button>
            );
          })}
        </div>

        {/* Guides & Help */}
        <Card className="bg-gray-50 border-gray-300">
          <h3 className="text-gray-900 font-medium mb-2">Guides & Help</h3>
          <p className="text-sm text-gray-600">
            Need assistance? Contact support for help with eTIMS features and troubleshooting.
          </p>
        </Card>

        {/* Log Out */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors font-medium"
        >
          <LogOut className="w-5 h-5" />
          Log Out
        </button>
      </div>
    </Layout>
  );
}
