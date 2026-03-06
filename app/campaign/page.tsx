/**
 * Campaign Landing Page — hub for the WhatsApp interactive campaign.
 *
 * Displays 4 primary buttons that open lightweight informational webviews.
 * The page is opened from a WhatsApp interactive message and expects
 * a `phone` query parameter for analytics identification.
 */
'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Layout, Card } from '@/app/_components/Layout';
import { analytics } from '@/app/_lib/analytics';
import { sendCampaignTemplates } from '@/app/actions/campaign';
import { Info, BookOpen, Smartphone, MessageCircle, ChevronRight } from 'lucide-react';

/** Primary interactive buttons shown on the campaign hub */
const CAMPAIGN_BUTTONS = [
  {
    id: 'why-contacted',
    icon: Info,
    emoji: 'ℹ️',
    label: 'Why Was I Contacted?',
    description: 'Understand why KRA sent this notice',
    href: '/campaign/why-contacted',
    color: 'bg-blue-50 border-blue-200 text-blue-700',
    iconColor: 'text-blue-600',
  },
  {
    id: 'pre-population',
    icon: BookOpen,
    emoji: '📘',
    label: 'How Pre-Population Works',
    description: 'Learn about automatic return filing',
    href: '/campaign/pre-population',
    color: 'bg-purple-50 border-purple-200 text-purple-700',
    iconColor: 'text-purple-600',
  },
  {
    id: 'filing-options',
    icon: Smartphone,
    emoji: '📲',
    label: 'Simplified Filing Options',
    description: 'Ways to file or get help',
    href: '/campaign/filing-options',
    color: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    iconColor: 'text-emerald-600',
  },
  {
    id: 'support',
    icon: MessageCircle,
    emoji: '💬',
    label: 'Support & Feedback',
    description: 'Contact us or share feedback',
    href: '/campaign/support',
    color: 'bg-amber-50 border-amber-200 text-amber-700',
    iconColor: 'text-amber-600',
  },
] as const;

/** Inner content component that reads search params */
function CampaignHubContent() {
  const searchParams = useSearchParams();
  const phone = searchParams.get('phone') || '';
  /**
   * Send the 4 campaign WhatsApp templates only on the very first visit.
   * A localStorage flag keyed by phone ensures templates are never re-sent
   * across page reloads or re-visits.
   */
  // useEffect(() => {
  //   if (!phone) return;

  //   const storageKey = `campaign_sent_${phone}`;
  //   if (localStorage.getItem(storageKey)) return;

  //   localStorage.setItem(storageKey, new Date().toISOString());

  //   const videoUrl = `${window.location.origin}/etims_video.mp4`;
  //   sendCampaignTemplates(phone, videoUrl).then(({ sent, failed }) => {
  //     console.log(`[Campaign] Templates delivered: ${sent} sent, ${failed} failed`);
  //   });
  // }, [phone]);

  /** Navigate to a content page, forwarding the phone param */
  const handleNavigate = (button: (typeof CAMPAIGN_BUTTONS)[number]) => {
    if (phone) analytics.setUserId(phone);
    analytics.track('campaign_button_click', { button: button.id });
    const campaignId = searchParams.get('campaignId');
    const handshakeToken = searchParams.get('handshake_token');
    
    let url = `${button.href}?phone=${encodeURIComponent(phone)}`;
    if (campaignId) url += `&campaignId=${encodeURIComponent(campaignId)}`;
    if (handshakeToken) url += `&handshake_token=${encodeURIComponent(handshakeToken)}`;
    
    window.location.href = url;
  };

  return (
    <Layout title="KRA Notice" phone={phone} showFooter={false}>
      <div className="space-y-5">
        {/* Hero section */}
        <div className="text-center space-y-2 pt-2 pb-1">
          <div className="w-14 h-14 mx-auto bg-[var(--kra-red)] rounded-2xl flex items-center justify-center shadow-lg shadow-red-200">
            <span className="text-2xl">📋</span>
          </div>
          <h2 className="text-lg font-bold text-gray-900">
            Important Tax Notice
          </h2>
          <p className="text-sm text-gray-500 max-w-xs mx-auto leading-relaxed">
            Select an option below to learn more about this notice and how to respond.
          </p>
        </div>

        {/* eTIMS Explainer Video */}
        <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-black">
          <video
            className="w-full aspect-video"
            controls
            playsInline
            preload="metadata"
            poster="/kra_logo.png"
          >
            <source src="/etims_video.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
          <div className="bg-white px-3 py-2">
            <p className="text-xs font-semibold text-gray-700">📺 Watch: How eTIMS Works</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Short explainer · Tap to play</p>
          </div>
        </div>

        {/* Primary action buttons */}
        <div className="space-y-3">
          {CAMPAIGN_BUTTONS.map((button) => {
            const Icon = button.icon;
            return (
              <button
                key={button.id}
                onClick={() => handleNavigate(button)}
                className={`w-full flex items-center gap-3.5 p-4 rounded-xl border transition-all active:scale-[0.98] ${button.color}`}
              >
                <div className={`shrink-0 ${button.iconColor}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold">{button.label}</p>
                  <p className="text-xs opacity-70 mt-0.5">
                    {button.description}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 opacity-40 shrink-0" />
              </button>
            );
          })}
        </div>

        {/* Footer note */}
        <p className="text-[10px] text-gray-400 text-center pt-2 pb-4">
          Kenya Revenue Authority · Compliance Campaign 2025
        </p>
      </div>
    </Layout>
  );
}

export default function CampaignPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen text-sm">
          Loading...
        </div>
      }
    >
      <CampaignHubContent />
    </Suspense>
  );
}
