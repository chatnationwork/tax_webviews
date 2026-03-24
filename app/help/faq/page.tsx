'use client';

import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ChevronLeft,
  FileCheck,
  HelpCircle,
  Search,
} from 'lucide-react';
import { Card, Layout } from '@/app/_components/Layout';

const TAX_SUMMARY_URL = 'https://analytics.chatnationbot.com/w/tax-summary';
const FILE_RETURNS_URL = 'https://www.kra.go.ke/file-my-returns#file-my-returns';

const REASONS = [
  {
    icon: Search,
    text: 'KRA has received employment income data linked to your PIN for 2025.',
  },
  {
    icon: AlertCircle,
    text: 'Your return has been pre-populated to make filing easier.',
  },
  {
    icon: FileCheck,
    text: 'You are required to review and submit your return.',
  },
  {
    icon: HelpCircle,
    text: 'The process is simple and guided.',
  },
] as const;

export default function HelpFaqPage() {
  const router = useRouter();

  return (
    <Layout title="Why KRA Contacted You" showHeader={false}>
      <header className="sticky top-0 z-10 bg-[#CC0000] text-white">
        <div className="max-w-md mx-auto px-3 py-3 flex items-center">
          <button
            onClick={() => router.back()}
            className="p-1 rounded-md hover:bg-red-700"
            aria-label="Go back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="flex-1 text-center text-sm font-semibold pr-6">Why KRA Contacted You</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto px-3 py-4 space-y-4">
        <div className="space-y-1">
          <h2 className="text-base font-bold text-gray-900">Why did KRA send this notice?</h2>
          <p className="text-xs text-gray-500">We want to help you stay compliant.</p>
        </div>

        <Card className="divide-y divide-gray-100">
          {REASONS.map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={index} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                <div className="shrink-0 mt-0.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-blue-600" />
                  </div>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{item.text}</p>
              </div>
            );
          })}
        </Card>

        <div className="space-y-2">
          <a
            href={FILE_RETURNS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center py-2.5 px-4 rounded-lg text-sm font-medium bg-[var(--kra-red)] text-white hover:bg-[var(--kra-red-dark)]"
          >
            Start Filling
          </a>
          <a
            href={TAX_SUMMARY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center py-2.5 px-4 rounded-lg text-sm font-medium bg-[var(--kra-red)] text-white hover:bg-[var(--kra-red-dark)]"
          >
            View Tax Summary
          </a>
        </div>
      </main>
    </Layout>
  );
}
