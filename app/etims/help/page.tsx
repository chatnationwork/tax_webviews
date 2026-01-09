'use client';

import { Suspense, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Layout, Card } from '../../_components/Layout';
import { ChevronDown, ChevronUp, FileText, FileMinus, UserCheck, Phone } from 'lucide-react';
import { useFlowTracking } from '@/app/_components/PostHogProvider';

type Section = {
  id: string;
  title: string;
  icon: any;
  content: React.ReactNode;
};

function HelpPageContent() {
  const router = useRouter();
  const [openSection, setOpenSection] = useState<string | null>(null);
  
  // Track help page view
  useFlowTracking('help', 'help_page', 1);

  const toggleSection = (id: string) => {
    setOpenSection(openSection === id ? null : id);
  };

  const sections: Section[] = [
    {
      id: 'sales-invoice',
      title: 'Sales Invoice Guide',
      icon: FileText,
      content: (
        <div className="space-y-3 text-sm text-gray-600">
          <p>
            <strong>1. Buyer Lookup:</strong> Start by entering the Buyer's Phone Number or PIN. 
            If the buyer is registered, their details will appear automatically.
            For unregistered buyers, you can proceed as specific types (e.g., Walk-in).
          </p>
          <p>
            <strong>2. Adding Items:</strong>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>Enter Item Name, Quantity, and Unit Price.</li>
              <li>Calculations for total and tax are automatic.</li>
              <li>You must add at least one item.</li>
            </ul>
          </p>
          <p>
            <strong>3. Review & Submit:</strong>
            Check the summary. Once submitted, an Invoice Number is generated and specific WhatsApp notifications are sent to the buyer.
          </p>
        </div>
      )
    },
    {
      id: 'credit-note',
      title: 'Credit Note Guide',
      icon: FileMinus,
      content: (
        <div className="space-y-3 text-sm text-gray-600">
          <p>
            <strong>Purpose:</strong> Use this to correct a previously issued invoice (e.g., returned goods, error in price).
          </p>
          <p>
            <strong>Types:</strong>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li><strong>Full Credit Note:</strong> Cancels the entire invoice. All items are returned/refunded.</li>
              <li><strong>Partial Credit Note:</strong> You select specific items to adjust (e.g., return 2 out of 5 items).</li>
            </ul>
          </p>
          <p>
            <strong>Process:</strong> Search for the original Invoice Number, select the type, and if Partial, choose the items to adjust.
          </p>
        </div>
      )
    },
    {
      id: 'buyer-initiated',
      title: 'Buyer Initiated Invoice',
      icon: UserCheck,
      content: (
        <div className="space-y-3 text-sm text-gray-600">
          <p>
            <strong>Concept:</strong> The <em>Buyer</em> creates the invoice draft, and the <em>Seller</em> approves it.
            Useful when the Seller is informal or doesn't have an eTIMS device ready.
          </p>
          <p>
            <strong>For Buyers:</strong>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>Select "Create New", enter Seller's PIN.</li>
              <li>Add items and Submit.</li>
              <li>This sends a "Purchase Order" request to the Seller.</li>
            </ul>
          </p>
          <p>
            <strong>For Sellers:</strong>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>Go to "Pending Invoices".</li>
              <li>Review the request. Click <strong>Approve</strong> to turn it into a valid Tax Invoice.</li>
              <li>Click <strong>Reject</strong> if the details are incorrect.</li>
            </ul>
          </p>
        </div>
      )
    },
    {
      id: 'support',
      title: 'Support & Contacts',
      icon: Phone,
      content: (
        <div className="space-y-3 text-sm text-gray-600">
          <p>Need further assistance?</p>
          <p className="font-medium text-gray-800">KRA Contact Centre:</p>
          <ul className="list-none space-y-1">
            <li>📞 020 4 999 999</li>
            <li>📞 0711 099 999</li>
            <li>📧 callcentre@kra.go.ke</li>
          </ul>
        </div>
      )
    }
  ];

  return (
    <Layout title="Guides & Help" onBack={() => router.push('/etims')}>
      <div className="space-y-4">
        <p className="text-sm text-gray-500 mb-2">
          Select a topic below to view detailed instructions.
        </p>

        {sections.map((section) => {
          const Icon = section.icon;
          const isOpen = openSection === section.id;

          return (
            <Card key={section.id} className="!p-0 overflow-hidden">
              <button
                onClick={() => toggleSection(section.id)}
                className={`w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors ${isOpen ? 'border-b border-gray-100' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Icon className="w-5 h-5 text-gray-600" />
                  </div>
                  <span className="font-medium text-gray-800">{section.title}</span>
                </div>
                {isOpen ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
              </button>
              
              {isOpen && (
                <div className="p-4 bg-gray-50 border-t border-gray-100 animate-in slide-in-from-top-2 duration-200">
                  {section.content}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </Layout>
  );
}

export default function HelpPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>}>
      <HelpPageContent />
    </Suspense>
  );
}

