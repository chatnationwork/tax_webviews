'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  CheckCircle2,
  ChevronLeft,
  Loader2,
  Phone,
  User,
} from 'lucide-react';
import { Button, Card } from '@/app/_components/Layout';

type CallbackPayload = {
  id: string;
  name: string;
  phone: string;
  issue: string;
  timestamp: string;
  status: 'pending';
};

type CallbackFormProps = {
  onClose?: () => void;
};

type FieldErrors = {
  name?: string;
  phone?: string;
};

function normalizePhone(input: string): string {
  const value = input.replace(/\s+/g, '');

  if (/^07\d{8}$/.test(value)) {
    return value;
  }

  if (/^\+2547\d{8}$/.test(value)) {
    return `0${value.slice(4)}`;
  }

  if (/^2547\d{8}$/.test(value)) {
    return `0${value.slice(3)}`;
  }

  return value;
}

function isValidPhone(input: string): boolean {
  return /^07\d{8}$/.test(input);
}

function generateReferenceId(): string {
  const now = new Date();
  const year = now.getFullYear();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `CB-${year}-${random}`;
}

export function CallbackForm({ onClose }: CallbackFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPhone = searchParams.get('phone') || '';

  const [name, setName] = useState('');
  const [phone, setPhone] = useState(initialPhone);
  const [issue, setIssue] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<CallbackPayload | null>(null);

  const trimmedIssue = useMemo(() => issue.trim(), [issue]);

  const validate = (): { valid: boolean; normalizedPhone: string } => {
    const nextErrors: FieldErrors = {};
    const normalizedPhone = normalizePhone(phone.trim());

    if (!name.trim()) {
      nextErrors.name = 'Full name is required.';
    }

    if (!phone.trim()) {
      nextErrors.phone = 'Phone number is required.';
    } else if (!isValidPhone(normalizedPhone)) {
      nextErrors.phone = 'Use 07XXXXXXXX or +2547XXXXXXXX format.';
    }

    setErrors(nextErrors);
    return { valid: Object.keys(nextErrors).length === 0, normalizedPhone };
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const { valid, normalizedPhone } = validate();
    if (!valid) {
      return;
    }

    setIsSubmitting(true);
    const timestamp = new Date().toISOString();

    try {
      const response = await fetch('/api/callback-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: normalizedPhone,
          issue: trimmedIssue,
          timestamp,
          status: 'pending',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit callback request.');
      }

      const payload: CallbackPayload = await response.json();
      setSubmitted(payload);
      localStorage.setItem('latestCallbackReferenceId', payload.id);
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        phone:
          error instanceof Error
            ? error.message
            : 'Unable to submit request. Please try again.',
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDone = () => {
    if (onClose) {
      onClose();
      return;
    }

    router.back();
  };

  return (
    <Card className="rounded-xl shadow-sm border border-gray-200 p-4">
      {!submitted ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">Full Name</label>
            <div className="relative">
              <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Your full name"
                className={`w-full pl-9 pr-3 py-2.5 text-sm border rounded-lg bg-white ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
              />
            </div>
            {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">Phone Number</label>
            <div className="relative">
              <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="07XX XXX XXX"
                className={`w-full pl-9 pr-3 py-2.5 text-sm border rounded-lg bg-white ${
                  errors.phone ? 'border-red-500' : 'border-gray-300'
                }`}
              />
            </div>
            {errors.phone && <p className="text-xs text-red-600">{errors.phone}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">Brief issue description (optional)</label>
            <textarea
              value={issue}
              onChange={(event) => setIssue(event.target.value)}
              placeholder="What do you need help with? (optional)"
              rows={3}
              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg bg-white resize-none"
            />
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Submitting...
              </span>
            ) : (
              'Request Callback'
            )}
          </Button>
        </form>
      ) : (
        <div className="py-4 text-center space-y-3">
          <div className="flex justify-center">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Request received</h2>
          <p className="text-sm text-gray-600">
            We&apos;ve logged your request. A KRA officer will call {submitted.phone} within 1
            working day.
          </p>
          <p className="text-xs text-gray-500">Reference: {submitted.id}</p>
          <Button onClick={handleDone}>Done</Button>
        </div>
      )}
    </Card>
  );
}

export default function CallbackPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-10 bg-[#CC0000] text-white">
        <div className="max-w-md mx-auto px-3 py-3 flex items-center">
          <button
            onClick={() => router.back()}
            className="p-1 rounded-md hover:bg-red-700"
            aria-label="Go back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="flex-1 text-center text-sm font-semibold pr-6">
            Request a Callback
          </h1>
        </div>
      </header>

      <main className="max-w-md mx-auto px-3 py-4 space-y-4">
        <section className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
            <Phone className="w-6 h-6 text-[#CC0000]" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">We&apos;ll call you back</h2>
          <p className="text-sm text-gray-600">
            A KRA officer will contact you within 1 working day
          </p>
          <div className="flex justify-center">
            <span className="inline-flex items-center text-xs text-[#CC0000] bg-red-50 rounded-full px-2.5 py-1">
              KRA Support
            </span>
          </div>
        </section>

        <CallbackForm />
      </main>
    </div>
  );
}
