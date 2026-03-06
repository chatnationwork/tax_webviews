/**
 * "Simplified Filing Options" content page.
 *
 * Lists all channels a taxpayer can use to file returns or get help:
 * USSD, WhatsApp Shuru, iTax Portal, eCitizen, and KRA Service Centres.
 * Includes a MicroFeedback widget at the bottom.
 *
 * Analytics: fires `campaign_page_view` on mount and `campaign_channel_click`
 * whenever the user taps an actionable channel link, enabling measurement of
 * which filing channels are most popular in the campaign cohort.
 */
'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Layout, Card } from '@/app/_components/Layout';
import MicroFeedback from '@/app/campaign/_components/MicroFeedback';
import { Hash, MessageCircle, Globe, Landmark, ExternalLink } from 'lucide-react';
import { analytics } from '@/app/_lib/analytics';

/** Available filing channels */
const CHANNELS = [
  {
    icon: Hash,
    label: 'USSD',
    detail: '*222*5#',
    description: 'Dial from any phone — no internet required',
    color: 'bg-orange-50',
    iconColor: 'text-orange-600',
    action: 'tel:*222*5#',
    actionLabel: 'Dial',
  },
  {
    icon: MessageCircle,
    label: 'WhatsApp Shuru',
    detail: '0711 099 999',
    description: 'Chat with our AI assistant on WhatsApp',
    color: 'bg-green-50',
    iconColor: 'text-green-600',
    action: 'https://wa.me/254711099999',
    actionLabel: 'Chat',
  },
  {
    icon: Globe,
    label: 'iTax Portal',
    detail: 'itax.kra.go.ke',
    description: 'File directly on the iTax web portal',
    color: 'bg-blue-50',
    iconColor: 'text-blue-600',
    action: 'https://itax.kra.go.ke',
    actionLabel: 'Open',
  },
  {
    icon: Globe,
    label: 'eCitizen',
    detail: 'ecitizen.kra.go.ke',
    description: 'Access KRA services via the eCitizen portal',
    color: 'bg-indigo-50',
    iconColor: 'text-indigo-600',
    action: 'https://ecitizen.kra.go.ke',
    actionLabel: 'Open',
  },
  {
    icon: Landmark,
    label: 'KRA Service Centre',
    detail: 'Visit in person',
    description: 'Walk into your nearest KRA office for assistance',
    color: 'bg-gray-50',
    iconColor: 'text-gray-600',
    action: null,
    actionLabel: null,
  },
] as const;

/** Inner component that reads search params */
function FilingOptionsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const phone = searchParams.get('phone') || '';
  const campaignId = searchParams.get('campaignId');
  const handshakeToken = searchParams.get('handshake_token');

  /** Navigate back to the main campaign hub, preserving query params */
  const handleBack = () => {
    let url = `/campaign?phone=${encodeURIComponent(phone)}`;
    if (campaignId) url += `&campaignId=${encodeURIComponent(campaignId)}`;
    if (handshakeToken) url += `&handshake_token=${encodeURIComponent(handshakeToken)}`;
    router.push(url);
  };

  /**
   * Track that the user landed on this sub-page.
   * The AnalyticsProvider fires a generic page() event, but this
   * explicit track gives us a named funnel step we can filter on.
   */
  useEffect(() => {
    if (phone) analytics.setUserId(phone);
    analytics.track('campaign_page_view', { page: 'filing-options' });
  }, [phone]);

  /**
   * Track when a user taps an actionable channel link.
   * This reveals which filing channels the campaign cohort prefers.
   */
  const handleChannelClick = (channelLabel: string) => {
    analytics.track('campaign_channel_click', {
      channel: channelLabel,
      page: 'filing-options',
    });
  };

  return (
    <Layout
      title="Filing Options"
      phone={phone}
      showFooter={false}
      onBack={handleBack}
    >
      <div className="space-y-5">
        {/* Title */}
        <div className="space-y-1">
          <h2 className="text-base font-bold text-gray-900">
            Ways to File or Get Help
          </h2>
          <p className="text-xs text-gray-500">
            Choose the channel that works best for you.
          </p>
        </div>

        {/* Channel cards */}
        <div className="space-y-2.5">
          {CHANNELS.map((channel, index) => {
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
                        onClick={() => handleChannelClick(channel.label)}
                        className="shrink-0 flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold rounded-full bg-[var(--kra-red)] text-white hover:bg-[var(--kra-red-dark)] transition-colors"
                      >
                        {channel.actionLabel}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  <p className="text-xs font-mono text-[var(--kra-red)] mt-0.5">
                    {channel.detail}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {channel.description}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Micro-feedback widget */}
        <MicroFeedback pageId="filing-options" />
      </div>
    </Layout>
  );
}

export default function FilingOptionsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen text-sm">
          Loading...
        </div>
      }
    >
      <FilingOptionsContent />
    </Suspense>
  );
}
