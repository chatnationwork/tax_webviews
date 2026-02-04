'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Layout, Card, Button } from '../_components/Layout';
import { Star, CheckCircle, MessageSquare } from 'lucide-react';
import { analytics } from '../_lib/analytics';

export default function CsatPage() {
  const router = useRouter();
  const [rating, setRating] = useState<number>(0);
  const [currHover, setCurrHover] = useState<number>(0);
  const [feedback, setFeedback] = useState('');
  const [submitted, setSubmitted] = useState(false);
  
  const searchParams = useSearchParams();
  const phone = searchParams.get('phone');
  const journey = searchParams.get('journey');

  // Identify user if phone is present
  if (phone) {
    analytics.identify(phone);
  }

  const handleSubmit = async () => {
    // Track the CSAT event
    analytics.track('csat_submitted', {
      rating,
      feedback,
      journey: journey || 'Unknown'
    });
    
    // For now, just show success state
    setSubmitted(true);
  };

  const emotions = [
    { level: 1, label: 'Very Poor' },
    { level: 2, label: 'Poor' },
    { level: 3, label: 'Fair' },
    { level: 4, label: 'Good' },
    { level: 5, label: 'Excellent' },
  ];

  if (submitted) {
    return (
      <Layout title="Feedback" showMenu={false} showHeader={false}>
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center animate-in zoom-in duration-300">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-gray-900">Thank You!</h2>
            <p className="text-gray-600 max-w-xs mx-auto">
              Your feedback helps us improve the experience for everyone.
            </p>
          </div>

          <div className="w-full max-w-xs pt-4">
            <Button onClick={() => router.push('/')}>
              Return to Home
            </Button>
            
            <a
              href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER}?text=${encodeURIComponent('Main menu')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-[#25D366] hover:bg-[#128C7E] text-white text-sm font-medium rounded-xl transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              Go to WhatsApp
            </a>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Feedback" onBack={() => router.back()} showMenu>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="text-center space-y-2 py-4">
          <h1 className="text-xl font-bold text-gray-900">How was your experience?</h1>
          <p className="text-sm text-gray-500">
            Please rate your experience
          </p>
        </div>

        <Card className="p-6 space-y-8">
          {/* Star Rating */}
          <div className="flex flex-col items-center space-y-3">
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setCurrHover(star)}
                  onMouseLeave={() => setCurrHover(0)}
                  className="p-1 transition-transform hover:scale-110 focus:outline-none"
                  aria-label={`Rate ${star} stars`}
                >
                  <Star
                    className={`w-10 h-10 transition-colors ${
                      star <= (currHover || rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-200'
                    }`}
                  />
                </button>
              ))}
            </div>
            
            <p className="h-6 text-sm font-medium text-[var(--kra-red)] transition-all">
              {rating > 0 ? emotions[rating - 1].label : ''}
            </p>
          </div>

          {/* Feedback Text Area */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Additional Comments (Optional)
            </label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Tell us what you liked or what we can improve..."
              className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[var(--kra-red)] focus:border-transparent min-h-[120px] resize-none"
            />
          </div>

          <Button 
            onClick={handleSubmit} 
            disabled={rating === 0}
            className="w-full"
          >
            Submit Feedback
          </Button>
        </Card>
      </div>
    </Layout>
  );
}
