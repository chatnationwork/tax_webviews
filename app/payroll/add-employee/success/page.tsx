'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle, UserPlus, ArrowRight } from 'lucide-react';
import { Layout, Card, Button } from '../../../_components/Layout';
import {payrollStore } from '../../../_lib/payroll-store';

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const phone = searchParams.get('phone') || '';
  const employeeName = searchParams.get('name') || 'Employee';

  const buildUrl = (path: string) => {
    const params = new URLSearchParams();
    if (token) params.set('token', token);
    if (phone) params.set('phone', phone);
    return `${path}?${params.toString()}`;
  };

  const handleAddAnother = () => {
    payrollStore.clearEmployeeData();
    router.push(buildUrl('/payroll/add-employee/personal'));
  };

  const handleBackToPayroll = () => {
    payrollStore.clearEmployeeData();
    router.push(buildUrl('/payroll'));
  };

  return (
    <Layout 
      title="Employee Added" 
      showHeader={false}
      showFooter={false}
    >
      <div className="min-h-[80vh] flex flex-col items-center justify-center py-8">
        {/* Success Icon */}
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>

        {/* Success Message */}
        <h1 className="text-xl font-bold text-gray-900 text-center mb-2">
          Employee Added Successfully!
        </h1>
        <p className="text-gray-600 text-center mb-6">
          <span className="font-semibold text-green-600">{employeeName}</span> has been added to your payroll.
        </p>

        {/* Status Card */}
        <Card className="w-full max-w-sm bg-green-50 border-green-200 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-green-800">Active Employee</p>
              <p className="text-xs text-green-600">Ready for payroll processing</p>
            </div>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="w-full max-w-sm space-y-3">
          <Button onClick={handleAddAnother}>
            <UserPlus className="w-4 h-4 inline mr-2" />
            Add Another Employee
          </Button>
          
          <Button variant="secondary" onClick={handleBackToPayroll}>
            Back to Payroll Services
            <ArrowRight className="w-4 h-4 inline ml-2" />
          </Button>
        </div>
      </div>
    </Layout>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--kra-red)]" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
