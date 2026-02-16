"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Layout, Card, Button } from "../_components/Layout";
import { Loader2, Fingerprint } from "lucide-react";
import { retrievePinById } from "@/app/actions/pin-retrieval";
import { IDInput } from "@/app/_components/KRAInputs";
import { getKnownPhone, saveKnownPhone } from "@/app/_lib/session-store";
import { getStoredPhone } from "@/app/actions/checkers";

function PinRetrievalContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const urlPhone = searchParams.get("phone") || "";

  const [phone, setPhone] = useState(urlPhone);
  const [idNumber, setIdNumber] = useState("");
  const [isIdValid, setIsIdValid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState("");

  // Load phone on mount
  useEffect(() => {
    const loadPhone = async () => {
      try {
        let currentPhone = urlPhone;

        if (!currentPhone) {
          try {
            const localPhone = getKnownPhone();
            if (localPhone) currentPhone = localPhone;
          } catch (e) {}
        }

        if (!currentPhone) {
          const storedPhone = await getStoredPhone();
          if (storedPhone) currentPhone = storedPhone;
        }

        if (currentPhone) {
          setPhone(currentPhone);
          if (currentPhone !== urlPhone) {
            router.replace(
              `${pathname}?phone=${encodeURIComponent(currentPhone)}`,
            );
          }
          saveKnownPhone(currentPhone);
        }
      } finally {
        setCheckingSession(false);
      }
    };

    loadPhone();
  }, [pathname, urlPhone, router]);

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-(--kra-red)" />
      </div>
    );
  }

  const handleRetrieve = async () => {
    setError("");
    setLoading(true);

    try {
      if (!phone) {
        throw new Error(
          "Phone number is missing. Please return to WhatsApp and try again.",
        );
      }

      // Call the retrieval action
      const result = await retrievePinById(idNumber, phone);

      if (result.success && result.data) {
        // Store result for the result page
        sessionStorage.setItem(
          "pinRetrievalResult",
          JSON.stringify(result.data),
        );
        router.push(`/pin-retrieval/result?phone=${encodeURIComponent(phone)}`);
      } else {
        setError(result.error || "PIN retrieval failed");
      }
    } catch (err: any) {
      setError(err.message || "Retrieval failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="PIN Retrieval" onBack={() => router.push("/")} showMenu>
      <div className="space-y-4">
        {/* Header Hero */}
        <div className="bg-(--kra-black) rounded-xl p-4 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
              <Fingerprint className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h1 className="text-base font-semibold">Lost your PIN?</h1>
              <p className="text-gray-400 text-xs">
                Retrieve it using your ID Number
              </p>
            </div>
          </div>
        </div>

        <Card>
          <div className="space-y-4">
            <IDInput
              label="National ID Number"
              value={idNumber}
              onChange={setIdNumber}
              onValidationChange={setIsIdValid}
              required
              placeholder="Enter your ID Number"
            />
            <p className="text-xs text-gray-500">
              We will retrieve your KRA PIN and send it to your WhatsApp.
            </p>
          </div>
        </Card>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        <Button onClick={handleRetrieve} disabled={!isIdValid || loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin inline mr-1" />{" "}
              Retrieving...
            </>
          ) : (
            "Retrieve My PIN"
          )}
        </Button>
      </div>
    </Layout>
  );
}

export default function PinRetrievalPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-(--kra-red)" />
        </div>
      }
    >
      <PinRetrievalContent />
    </Suspense>
  );
}
