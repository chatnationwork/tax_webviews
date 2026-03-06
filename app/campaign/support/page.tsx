/**
 * "Support & Feedback" content page.
 *
 * Displays KRA support channels (call, WhatsApp, callback, visit)
 * and a link to the post-interaction survey.
 * Includes a MicroFeedback widget at the bottom.
 */
'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Layout, Card } from '@/app/_components/Layout';
import MicroFeedback from '@/app/campaign/_components/MicroFeedback';
import { Phone, MessageCircle, PhoneCall, Landmark, ClipboardList, ExternalLink } from 'lucide-react';
import { analytics } from '@/app/_lib/analytics';

/** Support channels available to the taxpayer */
const SUPPORT_CHANNELS = [
  {
    icon: Phone,
    label: 'Call Us',
    detail: '0711 099 999',
    description: 'Speak directly with a KRA officer',
    color: 'bg-blue-50',
    iconColor: 'text-blue-600',
    action: 'tel:0711099999',
    actionLabel: 'Call',
  },
  {
    icon: MessageCircle,
    label: 'Chat with Shuru on WhatsApp',
    detail: '0711 099 999',
    description: 'Get instant help via WhatsApp',
    color: 'bg-green-50',
    iconColor: 'text-green-600',
    action: 'https://wa.me/254711099999',
    actionLabel: 'Chat',
  },
  {
    icon: PhoneCall,
    label: 'Request a Callback',
    detail: "We'll call you back",
    description: 'Leave your number and a KRA officer will reach out',
    color: 'bg-purple-50',
    iconColor: 'text-purple-600',
    action: null,
    actionLabel: null,
  },
  {
    icon: Landmark,
    label: 'Visit Tax Station',
    detail: 'Walk in for assistance',
    description: 'Visit your nearest KRA Service Centre',
    color: 'bg-gray-50',
    iconColor: 'text-gray-600',
    action: null,
    actionLabel: null,
  },
] as const;

/** Inner component that reads search params */
function SupportContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const phone = searchParams.get('phone') || '';
  const campaignId = searchParams.get('campaignId');
  const handshakeToken = searchParams.get('handshake_token');

  /** Navigate to the post-interaction survey */
  const goToSurvey = () => {
    if (phone) analytics.setUserId(phone);
    analytics.track('campaign_survey_open');
    let url = `/campaign/survey?phone=${encodeURIComponent(phone)}`;
    if (campaignId) url += `&campaignId=${encodeURIComponent(campaignId)}`;
    if (handshakeToken) url += `&handshake_token=${encodeURIComponent(handshakeToken)}`;
    window.location.href = url;
  };

  /** Navigate back to the main campaign hub, preserving query params */
  const handleBack = () => {
    let url = `/campaign?phone=${encodeURIComponent(phone)}`;
    if (campaignId) url += `&campaignId=${encodeURIComponent(campaignId)}`;
    if (handshakeToken) url += `&handshake_token=${encodeURIComponent(handshakeToken)}`;
    router.push(url);
  };

  return (
    <Layout
      title="Support & Feedback"
      phone={phone}
      showFooter={false}
      onBack={handleBack}
    >
      <div className="space-y-5">
        {/* Title */}
        <div className="space-y-1">
          <h2 className="text-base font-bold text-gray-900">Need Assistance?</h2>
          <p className="text-xs text-gray-500">
            Reach out through any of these channels.
          </p>
        </div>

        {/* Support cards */}
        <div className="space-y-2.5">
          {SUPPORT_CHANNELS.map((channel, index) => {
            const Icon = channel.icon;
            return (
              <Card key={index} className="flex items-start gap-3">
                <div className={`shrink-0 w-10 h-10 rounded-xl ${channel.color} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${channel.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-900">
                      {channel.label}
                    </p>
                    {channel.action && (
                      <a
                        href={channel.action}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold rounded-full bg-[var(--kra-red)] text-white hover:bg-[var(--kra-red-dark)] transition-colors"
                      >
                        {channel.actionLabel}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {channel.detail}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {channel.description}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Survey CTA */}
        <button
          onClick={goToSurvey}
          className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-[var(--kra-red)] text-white text-sm font-semibold hover:bg-[var(--kra-red-dark)] active:scale-[0.98] transition-all shadow-md shadow-red-200"
        >
          <ClipboardList className="w-4 h-4" />
          Take a Quick Survey
        </button>

        {/* Micro-feedback widget */}
        <MicroFeedback pageId="support" />
      </div>
    </Layout>
  );
}

export default function SupportPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen text-sm">
          Loading...
        </div>
      }
    >
      <SupportContent />
    </Suspense>
  );
}
