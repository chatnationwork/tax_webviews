'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  UserPlus, 
  Upload, 
  Users, 
  Calculator, 
  FileText, 
  Receipt,
  ArrowLeft,
  Loader2,
  Shield
} from 'lucide-react';
import { Layout } from '../_components/Layout';

interface ServiceOption {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  color: string;
  bgColor: string;
  borderColor: string;
  disabled?: boolean;
}

function PayrollServicesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';




  const services: ServiceOption[] = [
    {
      id: 'add-employee',
      title: 'Add New Employee',
      description: 'Add a single employee to your payroll',
      icon: <UserPlus className="w-6 h-6" />,
      href:"/payroll/add-employee/personal",
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200 hover:border-blue-400'
    },
    {
      id: 'bulk-upload',
      title: 'Bulk Upload Employees',
      description: 'Upload multiple employees via Excel',
      icon: <Upload className="w-6 h-6" />,
      href: "/payroll/bulk-upload",
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200 hover:border-purple-400'
    },
    {
      id: 'manage-employees',
      title: 'Manage Existing Employee',
      description: 'View, edit, or deactivate employees',
      icon: <Users className="w-6 h-6" />,
      href: "/payroll/manage",
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
      borderColor: 'border-teal-200 hover:border-teal-400'
    },
    {
      id: 'process-payroll',
      title: 'Process Regular Payroll',
      description: 'Run payroll for a specific period',
      icon: <Calculator className="w-6 h-6" />,
      href: "/payroll/process",
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200 hover:border-green-400'
    },
    {
      id: 'process-vouchers',
      title: 'Process Vouchers',
      description: 'Coming soon',
      icon: <Receipt className="w-6 h-6" />,
      href: '#',
      color: 'text-gray-400',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      disabled: true
    },
    {
      id: 'download-reports',
      title: 'Download Reports',
      description: 'Generate and download payroll reports',
      icon: <FileText className="w-6 h-6" />,
      href: "/payroll/reports",
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200 hover:border-orange-400'
    }
  ];

  return (
    <Layout 
      title="Payroll Services" 
      step="Select a service"
      onBack={() => router.push('/services')}
      showMenu
    >
      <div className="space-y-3">
        {/* Services Grid */}
        <div className="grid grid-cols-1 gap-3">
          {services.map((service) => (
            service.disabled ? (
              <div
                key={service.id}
                className={`bg-white rounded-xl p-4 border-2 ${service.borderColor} opacity-60 cursor-not-allowed`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 ${service.bgColor} rounded-full flex items-center justify-center flex-shrink-0`}>
                    <span className={service.color}>{service.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-400">{service.title}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">{service.description}</p>
                  </div>
                  <div className="flex-shrink-0">
                    <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                  </div>
                </div>
              </div>
            ) : (
              <Link
                key={service.id}
                href={service.href}
                className={`bg-white rounded-xl p-4 border-2 ${service.borderColor} hover:shadow-md transition-all duration-200 active:scale-[0.98]`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 ${service.bgColor} rounded-full flex items-center justify-center flex-shrink-0`}>
                    <span className={service.color}>{service.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900">{service.title}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{service.description}</p>
                  </div>
                  <div className="flex-shrink-0">
                    <div className={`w-5 h-5 rounded-full border-2 ${service.borderColor.split(' ')[0].replace('border-', 'border-')}`} />
                  </div>
                </div>
              </Link>
            )
          ))}
        </div>

        {/* Info Note */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
          <p className="text-xs text-blue-700">
            <strong>Note:</strong> Files like Excel templates will be sent to your WhatsApp for download.
          </p>
        </div>
      </div>
    </Layout>
  );
}

export default function PayrollServicesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--kra-red)]" />
      </div>
    }>
      <PayrollServicesContent />
    </Suspense>
  );
}
