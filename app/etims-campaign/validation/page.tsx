"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";
import { lookupById, getStoredPhone } from "@/app/actions/nil-mri-tot";
import { taxpayerStore } from "../../nil-mri-tot/_lib/store";
import { Layout, Card, Button } from "../../_components/Layout";
import { IDInput } from "@/app/_components/KRAInputs";
import { YearOfBirthInput } from "@/app/_components/YearOfBirthInput";
import { analytics } from "@/app/_lib/analytics";
import { getKnownPhone, saveKnownPhone } from "@/app/_lib/session-store";

function EtimsCampaignValidationContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const pathname = usePathname();
	const phone = searchParams.get("phone") || "";

	const [yob, setYob] = useState("");
	const [idNumber, setIdNumber] = useState("");
	const [isIdValid, setIsIdValid] = useState(false);
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);
	const [checkingSession, setCheckingSession] = useState(true);

	useEffect(() => {
		const performSessionCheck = async () => {
			try {
				let currentPhone = phone;

				if (!currentPhone) {
					try {
						const localPhone = getKnownPhone();
						if (localPhone) {
							currentPhone = localPhone;
						}
					} catch (e) {
						console.error("Error accessing localStorage", e);
					}
				}

				if (!currentPhone) {
					const storedPhone = await getStoredPhone();
					if (storedPhone) {
						currentPhone = storedPhone;
					}
				}

				if (currentPhone) {
					if (currentPhone !== phone) {
						router.replace(
							`${pathname}?phone=${encodeURIComponent(currentPhone)}`,
						);
					}
					saveKnownPhone(currentPhone);
				}

				setCheckingSession(false);
			} catch (err) {
				console.error("Phone check failed", err);
				setCheckingSession(false);
			}
		};

		performSessionCheck();
	}, [pathname, phone, router]);

	const isYobValid = yob.length === 4 && /^\d{4}$/.test(yob);

	const handleValidate = async () => {
		setError("");
		setLoading(true);

		try {
			if (!phone) {
				throw new Error(
					"Phone number is missing. Please re-verify via OTP.",
				);
			}

			const result = await lookupById(idNumber, phone, yob);

			if (result.success) {
				const taxpayer = {
					fullName: result.name || "Unknown",
					pin: result.pin || "Unknown",
					yob: parseInt(yob),
				};

				taxpayerStore.setTaxpayerInfo(
					idNumber,
					parseInt(yob),
					taxpayer.fullName,
					taxpayer.pin,
				);

				if (phone) analytics.setUserId(phone);
				analytics.track(
					"mri_validation_success",
					{ obligation_type: "mri" },
					{ journey_start: true },
				);

				router.push(
					`/etims-campaign/account${phone ? `?phone=${encodeURIComponent(phone)}` : ""}`,
				);
			} else {
				setError(
					result.error ||
						"Invalid taxpayer credentials. Please check your details.",
				);
			}
		} catch (err: unknown) {
			setError(
				err instanceof Error
					? err.message
					: "Failed to validate taxpayer. Please try again.",
			);
		} finally {
			setLoading(false);
		}
	};

	if (checkingSession) {
		return (
			<Layout title="eTIMS Campaign" showHeader={false} showFooter={false}>
				<div className="min-h-[60vh] flex items-center justify-center">
					<Loader2 className="w-8 h-8 animate-spin text-[var(--kra-red)]" />
				</div>
			</Layout>
		);
	}

	return (
		<Layout
			title="eTIMS Campaign"
			step="Step 1: Validation"
			onBack={() => router.push("/etims-campaign")}
			showMenu>
			<div className="max-w-xl mx-auto space-y-6">
				<Card className="p-6">
					<h2 className="text-lg font-semibold text-gray-800 mb-4">
						Validate Taxpayer
					</h2>

					<div className="space-y-4">
						<IDInput
							label="ID Number"
							value={idNumber}
							onChange={setIdNumber}
							onValidationChange={setIsIdValid}
							helperText="Enter 6-8 digit National ID"
						/>

						<YearOfBirthInput
							label="Year of Birth"
							value={yob}
							onChange={val =>
								setYob(val.replace(/\D/g, "").slice(0, 4))
							}
						/>

						{error && (
							<div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
								<AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
								<p className="text-sm text-red-600">{error}</p>
							</div>
						)}

						<Button
							onClick={handleValidate}
							disabled={!isYobValid || !isIdValid || loading}
							className="w-full mt-2">
							{loading ? (
								<>
									<Loader2 className="w-4 h-4 animate-spin inline mr-1" />{" "}
									Validating...
								</>
							) : (
								"Continue"
							)}
						</Button>
					</div>
				</Card>
			</div>
		</Layout>
	);
}

export default function EtimsCampaignValidationPage() {
	return (
		<Suspense
			fallback={
				<div className="min-h-screen bg-gray-50 flex items-center justify-center">
					<Loader2 className="w-8 h-8 animate-spin text-[var(--kra-red)]" />
				</div>
			}>
			<EtimsCampaignValidationContent />
		</Suspense>
	);
}
