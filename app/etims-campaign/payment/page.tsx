"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Loader2, Receipt } from "lucide-react";

import {
	getStoredPhone,
	makePayment,
	generatePrn,
} from "@/app/actions/payments";
import { getContactTags } from "@/app/actions/contact-tags";
import { getAllTaxpayerObligations } from "@/app/actions/etims-obligations";
import { getFilingPeriods } from "@/app/actions/nil-mri-tot";
import { Layout, Card, Button, Input } from "../../_components/Layout";
import { analytics } from "@/app/_lib/analytics";
import { getKnownPhone, saveKnownPhone } from "@/app/_lib/session-store";
import { taxpayerStore } from "../../payments/_lib/store";

interface ContactTagsResponse {
	status: string;
	data?: {
		name?: string | null;
		pin?: string | null;
		tag_json?: {
			pin_no?: string;
			taxable_amount?: string;
			financial_year?: string;
			obligation_name?: string;
			obligation_code?: string;
		};
	};
}

interface DetailRow {
	label: string;
	value: string;
}

const formatCurrency = (value: string) => {
	const amount = Number(value);

	if (!Number.isFinite(amount)) {
		return value || "Not available";
	}

	return `KES ${amount.toLocaleString("en-KE", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}`;
};

const deriveFinancialYear = (payload: ContactTagsResponse["data"]) => {
	if (payload?.tag_json?.financial_year) {
		return payload.tag_json.financial_year;
	}

	return "Not available";
};

function EtimsCampaignPaymentContent() {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const phone = searchParams.get("phone") || "";

	const [currentPhone, setCurrentPhone] = useState(phone);
	const [prn, setPrn] = useState("");
	const [amount, setAmount] = useState("");
	const [checkoutUrl, setCheckoutUrl] = useState("");
	const [data, setData] = useState<ContactTagsResponse["data"]>();
	const [prnLoading, setPrnLoading] = useState(false);
	const [prnError, setPrnError] = useState("");

	const totalAmount = Number(data?.tag_json?.taxable_amount || 0);

	useEffect(() => {
		if (totalAmount > 0 && !amount) {
			setAmount(totalAmount.toString());
		}
	}, [totalAmount, amount]);
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);
	const [detailsLoading, setDetailsLoading] = useState(true);
	const [checkingSession, setCheckingSession] = useState(true);
	const [paymentStatus, setPaymentStatus] = useState("");

	useEffect(() => {
		const initialize = async () => {
			try {
				let resolvedPhone = phone;

				if (!resolvedPhone) {
					const storedPhone = await getStoredPhone();
					if (storedPhone) {
						resolvedPhone = storedPhone;
					} else {
						try {
							const localPhone = getKnownPhone();
							if (localPhone) {
								resolvedPhone = localPhone;
							}
						} catch (storageError) {
							console.error(
								"Error accessing session store",
								storageError,
							);
						}
					}
				}

				if (resolvedPhone) {
					setCurrentPhone(resolvedPhone);
					saveKnownPhone(resolvedPhone);

					if (resolvedPhone !== phone) {
						router.replace(
							`${pathname}?phone=${encodeURIComponent(resolvedPhone)}`,
						);
					}
				}
			} catch (sessionError) {
				console.error("Session check failed", sessionError);
			} finally {
				setCheckingSession(false);
			}
		};

		initialize();
	}, [pathname, phone, router]);

	useEffect(() => {
		const loadDetailsAndGeneratePrn = async () => {
			if (!currentPhone) {
				setData(undefined);
				setError("Phone number is missing. Please restart validation.");
				setDetailsLoading(false);
				return;
			}

			setDetailsLoading(true);
			setPrnLoading(true);
			setError("");
			setPrnError("");

			try {
				// Step 1: Get contact tags (eTIMS data)
				const payload = await getContactTags(currentPhone);
				setData(payload.data);

				const pin = payload.data?.tag_json?.pin_no || payload.data?.pin;
				const obligationName = payload.data?.tag_json?.obligation_name;
				const financialYear = payload.data?.tag_json?.financial_year;
				const taxableAmount = payload.data?.tag_json?.taxable_amount;

				if (!pin || !obligationName || !taxableAmount) {
					setPrnError("Missing required information to generate PRN");
					setPrnLoading(false);
					setDetailsLoading(false);
					return;
				}

				// Initialize amount from taxable amount
				setAmount(taxableAmount);

				// Step 2: Get all obligations for this PIN
				const obligationsResult = await getAllTaxpayerObligations(pin);

				if (
					!obligationsResult.success ||
					!obligationsResult.obligations?.length
				) {
					setPrnError("Failed to retrieve taxpayer obligations");
					setPrnLoading(false);
					setDetailsLoading(false);
					return;
				}

				// Step 3: Match obligation_name with obligationShortName to get obligation ID
				const matchedObligation = obligationsResult.obligations.find(
					obl => {
						const oblShortName = obl.obligationShortName?.trim();
						const targetName = obligationName.trim();
						return oblShortName === targetName;
					},
				);

				if (!matchedObligation) {
					// Log all available short names for debugging
					const availableShortNames = obligationsResult.obligations
						.map(o => o.obligationShortName)
						.join(", ");
					setPrnError(
						`Obligation "${obligationName}" not found for this taxpayer. Available: ${availableShortNames}`,
					);
					setPrnLoading(false);
					setDetailsLoading(false);
					return;
				}

				// Step 4: Get filing periods
				const periodsResult = await getFilingPeriods(
					pin,
					matchedObligation.obligationId,
				);

				if (!periodsResult.success || !periodsResult.periods?.length) {
					setPrnError(
						"No filing periods available for this obligation",
					);
					setPrnLoading(false);
					setDetailsLoading(false);
					return;
				}

				// Step 5: Find period matching financial year
				let matchedPeriod = periodsResult.periods[0];

				if (financialYear) {
					// Try to find a period that contains the financial year
					const foundPeriod = periodsResult.periods.find(period => {
						// Period format: "DD/MM/YYYY - DD/MM/YYYY"
						return period.includes(financialYear);
					});
					if (foundPeriod) {
						matchedPeriod = foundPeriod;
					}
				}

				// Parse period dates
				let taxPeriodFrom = matchedPeriod;
				let taxPeriodTo = matchedPeriod;

				if (matchedPeriod.includes("-")) {
					const parts = matchedPeriod.split("-").map(p => p.trim());
					if (parts.length >= 2) {
						taxPeriodFrom = parts[0];
						taxPeriodTo = parts[1];
					}
				}

				// Step 6: Generate PRN
				const prnResult = await generatePrn(
					pin,
					matchedObligation.obligationId,
					taxPeriodFrom,
					taxPeriodTo,
					taxableAmount,
				);

				if (prnResult.success && prnResult.prn) {
					setPrn(prnResult.prn);
				} else {
					setPrnError(prnResult.message || "Failed to generate PRN");
				}
			} catch (err: unknown) {
				setData(undefined);
				setError(
					err instanceof Error
						? err.message
						: "Unable to load eTIMS details right now.",
				);
			} finally {
				setDetailsLoading(false);
				setPrnLoading(false);
			}
		};

		if (!checkingSession) {
			loadDetailsAndGeneratePrn();
		}
	}, [checkingSession, currentPhone]);

	const phoneParam = currentPhone
		? `?phone=${encodeURIComponent(currentPhone)}`
		: "";
	const isPrnValid = prn.trim().length >= 5;
	const amountValue = Number(amount);
	const isAmountValid = amountValue > 0 && amountValue <= totalAmount;

	const detailRows = useMemo<DetailRow[]>(() => {
		return [
			{
				label: "Total Amount Due",
				value: formatCurrency(data?.tag_json?.taxable_amount || ""),
			},
		];
	}, [data]);

	const handlePayment = async () => {
		setError("");
		setLoading(true);
		setPaymentStatus("");

		try {
			if (!currentPhone) {
				throw new Error(
					"Phone number is missing. Please re-verify via OTP.",
				);
			}

			setPaymentStatus("Initiating payment...");

			const payRes = await makePayment(currentPhone, prn.trim());

			if (payRes.success) {
				if (payRes.checkoutUrl) {
					setCheckoutUrl(payRes.checkoutUrl);
				}
				taxpayerStore.setTaxpayerInfo(
					"",
					0,
					data?.name?.trim() || "",
					data?.tag_json?.pin_no || data?.pin || "",
				);

				const amountValue = Number(data?.tag_json?.taxable_amount || 0);
				taxpayerStore.setPaymentDetails(
					deriveFinancialYear(data),
					deriveFinancialYear(data),
					Number.isFinite(amountValue) ? amountValue : 0,
				);
				taxpayerStore.setPrn(prn.trim());
				if (payRes.checkoutUrl) {
					taxpayerStore.setCheckoutUrl(payRes.checkoutUrl);
				}
				taxpayerStore.setPaymentStatus(
					"success",
					"Payment initiated. Check your phone for the M-Pesa prompt.",
				);

				setPaymentStatus(
					"Payment initiated. Check your phone for the M-Pesa prompt.",
				);

				analytics.setUserId(currentPhone);
				analytics.track(
					"etims_campaign_payment_started",
					{
						prn: prn.trim(),
						amount: amount,
						pin: data?.tag_json?.pin_no || data?.pin || "",
					},
					{ journey_start: true },
				);
			} else {
				const errorMessage =
					typeof payRes.message === "object"
						? JSON.stringify(payRes.message)
						: payRes.message ||
							"Payment initiation failed. Please try again.";

				taxpayerStore.setPrn(prn.trim());
				if (payRes.checkoutUrl) {
					taxpayerStore.setCheckoutUrl(payRes.checkoutUrl);
				}
				taxpayerStore.setPaymentStatus("failed", errorMessage);
				setError(errorMessage);
			}
		} catch (err: unknown) {
			setError(
				err instanceof Error
					? err.message
					: "Failed to initiate payment. Please try again.",
			);
		} finally {
			setLoading(false);
		}
	};

	if (checkingSession) {
		return (
			<Layout
				title="eTIMS Campaign"
				showHeader={false}
				showFooter={false}>
				<div className="min-h-[60vh] flex items-center justify-center">
					<Loader2 className="w-8 h-8 animate-spin text-[var(--kra-red)]" />
				</div>
			</Layout>
		);
	}

	return (
		<Layout
			title="eTIMS Campaign"
			step="Step 3: Payment"
			onBack={() => router.push(`/etims-campaign/account${phoneParam}`)}
			showMenu>
			<div className="max-w-xl mx-auto space-y-6">
				<div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
					<div className="flex items-start gap-3">
						<Receipt className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
						<div>
							<h3 className="font-semibold text-blue-800 mb-1">
								Complete Your Payment
							</h3>
							<p className="text-sm text-blue-700">
								A Payment Reference Number (PRN) has been
								automatically generated for your eTIMS
								obligation.
							</p>
						</div>
					</div>
				</div>

				<Card className="divide-y divide-gray-100 p-0">
					<div className="px-4 py-3 bg-gray-50 rounded-t-xl">
						<span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
							eTIMS Details
						</span>
					</div>

					{detailsLoading ? (
						<div className="flex items-center justify-center p-8">
							<Loader2 className="w-6 h-6 animate-spin text-(--kra-red)" />
						</div>
					) : (
						detailRows.map(row => (
							<div
								key={row.label}
								className="flex items-start justify-between px-4 py-3">
								<span className="text-xs text-gray-500 flex-1 pr-2">
									{row.label}
								</span>
								<span className="text-xs text-right text-gray-800">
									{row.value}
								</span>
							</div>
						))
					)}
				</Card>



				<Card className="p-6">
					<h2 className="text-lg font-semibold text-gray-800 mb-4">
						Payment Details
					</h2>

					<div className="space-y-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								Payment Reference Number (PRN)
							</label>
							{prnLoading ? (
								<div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
									<Loader2 className="w-4 h-4 animate-spin text-(--kra-red)" />
									<span className="text-sm text-gray-600">
										Generating PRN...
									</span>
								</div>
							) : prnError ? (
								<div className="p-3 bg-red-50 border border-red-200 rounded-lg">
									<p className="text-sm text-red-600">
										{prnError}
									</p>
								</div>
							) : prn ? (
								<div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
									<p className="text-sm font-medium text-gray-900">
										{prn}
									</p>
								</div>
							) : (
								<div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
									<p className="text-sm text-gray-500">
										Unable to generate PRN
									</p>
								</div>
							)}
						</div>

						<Input
							label={`Amount to Pay (Max: ${formatCurrency(totalAmount.toString())})`}
							type="number"
							value={amount}
							onChange={value => setAmount(value)}
							placeholder="Enter amount"
							required
						/>

						{amountValue > totalAmount && (
							<div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
								<p className="text-sm text-amber-700">
									Amount cannot exceed total due of{" "}
									{formatCurrency(totalAmount.toString())}
								</p>
							</div>
						)}

						{error && (
							<div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
								<AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
								<p className="text-sm text-red-600">{error}</p>
							</div>
						)}

						{paymentStatus && !error && (
							<div className="p-3 bg-green-50 border border-green-200 rounded-lg">
								<p className="text-sm text-green-700">
									{paymentStatus}
								</p>
							</div>
						)}

						{checkoutUrl && (
							<div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
								<p className="text-sm text-blue-700 mb-2">
									Or complete payment via:
								</p>
								<a
									href={checkoutUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="text-sm text-blue-600 underline break-all">
									{checkoutUrl}
								</a>
							</div>
						)}

						<Button
							onClick={handlePayment}
							disabled={
								!isPrnValid ||
								!isAmountValid ||
								loading ||
								detailsLoading ||
								prnLoading ||
								!!prnError ||
								!currentPhone
							}
							className="w-full mt-2">
							{loading ? (
								<>
									<Loader2 className="w-4 h-4 animate-spin inline mr-1" />{" "}
									{paymentStatus || "Processing..."}
								</>
							) : (
								"Pay Now"
							)}
						</Button>
					</div>
				</Card>
			</div>
		</Layout>
	);
}

export default function EtimsCampaignPaymentPage() {
	return (
		<Suspense
			fallback={
				<div className="min-h-screen bg-gray-50 flex items-center justify-center">
					<Loader2 className="w-8 h-8 animate-spin text-[var(--kra-red)]" />
				</div>
			}>
			<EtimsCampaignPaymentContent />
		</Suspense>
	);
}
