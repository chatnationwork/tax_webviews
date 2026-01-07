'use client';

import { useRouter } from 'next/navigation';
import { Layout, Card } from '../../../_components/Layout';
import { ArrowLeft, Mail, Phone, Globe } from 'lucide-react';

export default function TermsAndConditions() {
  const router = useRouter();

  return (
    <Layout 
      title="Terms & Conditions" 
      showFooter={false}
      onBack={() => router.back()}
    >
      <div className="space-y-4 pb-6">
        {/* Header */}
        <Card className="bg-[var(--kra-black)] text-white">
          <h1 className="text-base font-semibold mb-1">Terms and Conditions</h1>
          <p className="text-xs text-gray-400">for Use of eTIMS Solutions</p>
        </Card>

        {/* Introduction */}
        <Card>
          <p className="text-xs text-gray-700 leading-relaxed">
            These Terms govern your access to and use of any Electronic Tax Invoice Management System (eTIMS) solution approved or licensed by the Kenya Revenue Authority (KRA). This includes:
          </p>
          <ul className="text-xs text-gray-700 mt-2 space-y-1 list-disc list-inside">
            <li>Solutions developed by KRA (free or subsidized)</li>
            <li>Third-party solutions licensed by KRA, whether free or paid</li>
          </ul>
          <p className="text-xs text-gray-700 mt-2 leading-relaxed">
            These Terms are binding on all users ("you" or "taxpayer") who use such solutions to generate electronic tax invoices under the Tax Procedures Act, 2015; the Electronic Tax Invoice Regulations, 2024; and other applicable laws and KRA guidelines.
          </p>
        </Card>

        {/* Section A */}
        <Card>
          <h2 className="text-sm font-semibold text-gray-900 mb-2">A. Definitions</h2>
          <ul className="text-xs text-gray-700 space-y-1.5">
            <li><strong>Terms and Conditions</strong> – These rules for using eTIMS solutions.</li>
            <li><strong>Website</strong> – https://www.kra.go.ke</li>
            <li><strong>Agreement</strong> – Service provision terms between the user and provider.</li>
            <li><strong>Online Sales Control Unit</strong> – Interface between taxpayer's system and eTIMS.</li>
            <li><strong>System</strong> – Any eTIMS-compliant invoicing or receipting solution.</li>
          </ul>
        </Card>

        {/* Section B */}
        <Card>
          <h2 className="text-sm font-semibold text-gray-900 mb-2">B. Legal Basis</h2>
          <ul className="text-xs text-gray-700 space-y-1 list-disc list-inside">
            <li>The Tax Procedures Act (Cap 469B), Sec. 23A, 23B, 59A</li>
            <li>The Tax Procedures (e-Invoice) Regulations, 2024</li>
            <li>The Data Protection Act, 2019</li>
          </ul>
        </Card>

        {/* Section C */}
        <Card>
          <h2 className="text-sm font-semibold text-gray-900 mb-2">C. Service Description</h2>
          <p className="text-xs text-gray-700 leading-relaxed">
            eTIMS enables users to create and manage electronic invoices as per tax laws. It may integrate with third-party or government systems.
          </p>
        </Card>

        {/* Section D */}
        <Card>
          <h2 className="text-sm font-semibold text-gray-900 mb-2">D. Scope</h2>
          <ul className="text-xs text-gray-700 space-y-1 list-disc list-inside">
            <li>Businesses and individuals issuing e-invoices</li>
            <li>Licensed third-party developers</li>
            <li>Authorized agents acting for taxpayers</li>
          </ul>
        </Card>

        {/* Section E */}
        <Card>
          <h2 className="text-sm font-semibold text-gray-900 mb-2">E. User Responsibilities</h2>
          <ul className="text-xs text-gray-700 space-y-1 list-disc list-inside">
            <li>Use only KRA-approved eTIMS solutions</li>
            <li>Configure and use systems per KRA guidelines</li>
            <li>Issue valid electronic tax invoices</li>
            <li>Enter accurate data</li>
            <li>Submit data to KRA in (near) real-time</li>
            <li>Secure credentials</li>
            <li>Report system failures or misuse within 24 hours</li>
            <li>Retain invoice records for at least 5 years</li>
          </ul>
        </Card>

        {/* Section F */}
        <Card>
          <h2 className="text-sm font-semibold text-gray-900 mb-2">F. Restrictions</h2>
          <ul className="text-xs text-gray-700 space-y-1 list-disc list-inside">
            <li>Tamper with eTIMS</li>
            <li>Issue false/fictitious invoices</li>
            <li>Sell/sublicense KRA solutions without approval</li>
            <li>Fail to ensure business continuity</li>
          </ul>
          <p className="text-xs text-gray-700 mt-2">KRA may audit usage and access logs.</p>
        </Card>

        {/* Section G */}
        <Card>
          <h2 className="text-sm font-semibold text-gray-900 mb-2">G. Security & Integrity</h2>
          <ul className="text-xs text-gray-700 space-y-1 list-disc list-inside">
            <li>Use strong passwords and 2FA</li>
            <li>Secure devices against malware</li>
            <li>Ensure data accuracy</li>
          </ul>
          <p className="text-xs text-gray-700 mt-2">KRA may audit or monitor usage to enforce compliance.</p>
        </Card>

        {/* Section H */}
        <Card>
          <h2 className="text-sm font-semibold text-gray-900 mb-2">H. Data Backup</h2>
          <p className="text-xs text-gray-700 leading-relaxed">
            Users are advised to regularly back up invoicing data.
          </p>
        </Card>

        {/* Section I */}
        <Card>
          <h2 className="text-sm font-semibold text-gray-900 mb-2">I. Data Privacy</h2>
          <p className="text-xs text-gray-700 leading-relaxed">
            All invoicing data will be handled per the Data Protection Act and KRA's Privacy Policy:{' '}
            <a href="https://www.kra.go.ke/about-kra-footer/data-privacy-policy" target="_blank" rel="noopener noreferrer" className="text-[var(--kra-red)] underline">
              Privacy Policy
            </a>
          </p>
          <p className="text-xs text-gray-700 mt-2">No unauthorized third-party sharing allowed.</p>
        </Card>

        {/* Section J */}
        <Card>
          <h2 className="text-sm font-semibold text-gray-900 mb-2">J. Disclaimers</h2>
          <p className="text-xs text-gray-700 leading-relaxed">
            KRA provides eTIMS "as is" and does not guarantee uptime. Third-party vendors are accountable for their tools and services.
          </p>
        </Card>

        {/* Section K */}
        <Card>
          <h2 className="text-sm font-semibold text-gray-900 mb-2">K. Limitation of Liability</h2>
          <p className="text-xs text-gray-700 leading-relaxed">
            KRA is not liable for any loss from eTIMS usage. Compliance and correct system use are the user's responsibility.
          </p>
        </Card>

        {/* Section L */}
        <Card>
          <h2 className="text-sm font-semibold text-gray-900 mb-2">L. Indemnity</h2>
          <p className="text-xs text-gray-700 leading-relaxed">
            Users agree to indemnify KRA for any claims arising from misuse or breach of these Terms.
          </p>
        </Card>

        {/* Section M */}
        <Card>
          <h2 className="text-sm font-semibold text-gray-900 mb-2">M. Suspension or Termination</h2>
          <p className="text-xs text-gray-700 leading-relaxed">
            KRA may suspend access due to misuse, fraud, non-compliance, or other risks.
          </p>
          <p className="text-xs text-gray-700 mt-2">
            Users must notify KRA of system discontinuation within 30 days (or 7 days for unplanned closures).
          </p>
        </Card>

        {/* Section N */}
        <Card>
          <h2 className="text-sm font-semibold text-gray-900 mb-2">N. Intellectual Property</h2>
          <p className="text-xs text-gray-700 leading-relaxed">
            All rights to eTIMS software, trademarks, and documents belong to KRA or its licensors.
          </p>
        </Card>

        {/* Section O */}
        <Card>
          <h2 className="text-sm font-semibold text-gray-900 mb-2">O. Dispute Resolution</h2>
          <p className="text-xs text-gray-700 leading-relaxed">
            Disputes should be raised in line with the law. KRA will aim to resolve them amicably.
          </p>
        </Card>

        {/* Section P */}
        <Card>
          <h2 className="text-sm font-semibold text-gray-900 mb-2">P. Governing Law</h2>
          <p className="text-xs text-gray-700 leading-relaxed">
            These Terms are governed by the laws of Kenya.
          </p>
        </Card>

        {/* Section Q */}
        <Card>
          <h2 className="text-sm font-semibold text-gray-900 mb-2">Q. Amendments</h2>
          <p className="text-xs text-gray-700 leading-relaxed">
            KRA may update these Terms at any time. Continued use of eTIMS implies acceptance of updated terms.
          </p>
        </Card>

        {/* Section R - Contact */}
        <Card className="bg-blue-50 border-blue-200">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">R. Contact Information</h2>
          <p className="text-xs text-gray-700 mb-3">
            For queries regarding these Terms and Conditions or your invoice, please contact:
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-gray-700">
              <Globe className="w-4 h-4 text-blue-600" />
              <span className="font-medium">KRA Call Centre</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-700">
              <Mail className="w-4 h-4 text-blue-600" />
              <a href="mailto:callcentre@kra.go.ke" className="text-[var(--kra-red)] underline">callcentre@kra.go.ke</a>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-700">
              <Phone className="w-4 h-4 text-blue-600" />
              <span>+254 20 4 999 999 or +254 711 099 999</span>
            </div>
          </div>
        </Card>

        {/* Back Button */}
        <button 
          onClick={() => router.back()}
          className="w-full py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 flex items-center justify-center gap-2 hover:bg-gray-50"
        >
          <ArrowLeft className="w-4 h-4" />
          Go Back
        </button>
      </div>
    </Layout>
  );
}
