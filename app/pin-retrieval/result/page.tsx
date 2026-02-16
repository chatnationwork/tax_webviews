"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Layout, Card, Button, MaskedDataCard } from "../../_components/Layout";

import {
  Loader2,
  CheckCircle,
  ClipboardList,
  ShieldCheck,
  Info,
} from "lucide-react";

interface PinRetrievalData {
  name: string;
  pin: string;
  idNumber?: string;
  obligations: string[];
}

function PinRetrievalResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get("phone") || "";

  const [result, setResult] = useState<PinRetrievalData | null>(null);

  useEffect(() => {
    const storedResult = sessionStorage.getItem("pinRetrievalResult");
    if (storedResult) {
      setResult(JSON.parse(storedResult));
    } else {
      router.push("/pin-retrieval");
    }
  }, [router]);

  if (!result) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-(--kra-red)" />
      </div>
    );
  }

  const handleClose = () => {
    router.push("/");
  };

  return (
    <Layout
      title="PIN Retrieval Result"
      onBack={() => router.push("/pin-retrieval")}
    >
      <div className="space-y-4">
        {/* Success Banner */}
        <div className="bg-green-600 rounded-xl p-4 text-white shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base font-semibold">
                PIN Found Successfully
              </h1>
              <p className="text-green-100 text-xs">
                We've sent these details to your WhatsApp
              </p>
            </div>
          </div>
        </div>

        {/* User Details Card - Following Registration Pattern */}
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-gray-400" />
            Your Details
          </h3>
          <div className="space-y-2">
            <MaskedDataCard label="Name" value={result.name} />
            {result.idNumber && (
              <MaskedDataCard label="ID Number" value={result.idNumber} />
            )}
          </div>
        </Card>

        {/* Existing PIN Card - Following "Already Registered" Pattern */}
        <Card className="p-6 bg-blue-50 border border-blue-200">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Record Found</h2>

          <div className="flex items-start gap-3 bg-white/60 p-4 rounded-lg border border-blue-100 shadow-sm">
            <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <Info className="text-white w-3 h-3" />
            </div>
            <div className="text-sm text-gray-700">
              <p>Our records indicate that you have a KRA PIN registered.</p>
              <p className="mt-2 font-semibold flex items-center gap-2">
                Your existing PIN:
                <span className="font-mono bg-blue-100/50 px-2 py-0.5 rounded text-blue-700 select-all tracking-wider">
                  {result.pin}
                </span>
              </p>
            </div>
          </div>
        </Card>

        {/* Obligations Card */}
        {result.obligations && result.obligations.length > 0 && (
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2 text-gray-500 uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              Registered Obligations
            </h3>
            <div className="space-y-2">
              {result.obligations.map((obligation, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100"
                >
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  {obligation}
                </div>
              ))}
            </div>
          </Card>
        )}

        <div className="space-y-3 pt-4">
          <Button
            onClick={handleClose}
            className="w-full bg-(--kra-red) hover:bg-red-700"
          >
            Close
          </Button>

          <Button
            variant="secondary"
            onClick={() => router.push("/pin-retrieval")}
          >
            Retrieve Another
          </Button>
        </div>
      </div>
    </Layout>
  );
}

export default function PinRetrievalResultPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-(--kra-red)" />
        </div>
      }
    >
      <PinRetrievalResultContent />
    </Suspense>
  );
}
