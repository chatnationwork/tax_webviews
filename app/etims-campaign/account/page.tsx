"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle, AlertTriangle, Loader2 } from "lucide-react";

import { getContactTags } from "../../actions/contact-tags";
import { sendEtimsZeroAmountMessage } from "@/app/actions/auth";
import { Layout, Card, Button } from "../../_components/Layout";
import { analytics } from "@/app/_lib/analytics";

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
		};
		updatedAt?: string;
		createdAt?: string;
	};
}

interface DetailRow {
	label: string;
	value: string;
	highlight?: boolean;
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

function EtimsCampaignAccountContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const phone = searchParams.get("phone") || "";
	const phoneParam = phone ? `?phone=${encodeURIComponent(phone)}` : "";

	const [data, setData] = useState<ContactTagsResponse["data"]>();
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [finishing, setFinishing] = useState(false);
	const [finishStatus, setFinishStatus] = useState("");

	useEffect(() => {
		const loadDetails = async () => {
			if (!phone) {
				setError("Phone number is missing. Please restart validation.");
				setLoading(false);
				return;
			}

			setLoading(true);
			setError("");

			try {
				const payload = await getContactTags(phone);
				setData(payload.data);
			} catch (err: unknown) {
				setError(
					err instanceof Error
						? err.message
						: "Unable to load eTIMS details right now.",
				);
			} finally {
				setLoading(false);
			}
		};

		loadDetails();
	}, [phone]);

	const detailRows = useMemo<DetailRow[]>(() => {
		return [
			{
				label: "Name",
				value: data?.name?.trim() || "Not available",
			},
			{
				label: "PIN",
				value: data?.tag_json?.pin_no || data?.pin || "Not available",
			},
			{
				label: "Obligation",
				value: data?.tag_json?.obligation_name || "Not available",
			},
			{
				label: "Amount",
				value: formatCurrency(data?.tag_json?.taxable_amount || ""),
				highlight: true,
			},
			{
				label: "Financial Year",
				value: deriveFinancialYear(data),
			},
		];
	}, [data]);
 
	const taxableAmount = Number(data?.tag_json?.taxable_amount || 0);
	const isZeroAmount = taxableAmount === 0;

	const handleFinish = async () => {
		if (!phone) return;
		
		setFinishing(true);
		setError("");
		
		try {
			// Send zero amount WhatsApp message
			const pin = data?.tag_json?.pin_no || data?.pin || "";
			await sendEtimsZeroAmountMessage({
				recipientPhone: phone,
				name: data?.name?.trim() || "Taxpayer",
				obligationName: data?.tag_json?.obligation_name || "eTIMS",
			});

			analytics.setUserId(phone);
			analytics.track(
				"etims_campaign_zero_amount_finished",
				{
					pin,
					obligation: data?.tag_json?.obligation_name,
				},
				{ journey_end: true }
			);

			setFinishStatus(
				"Confirmed! You have no pending amount to pay. A confirmation message has been sent to your WhatsApp."
			);

			// Redirect to main menu after a short delay
			setTimeout(() => {
				router.push(`/${phoneParam}`);
			}, 3000);
		} catch (err: unknown) {
			setError(
				err instanceof Error ? err.message : "Failed to finish process."
			);
		} finally {
			setFinishing(false);
		}
	};

	return (
		<Layout
			title="eTIMS Campaign"
			step="Step 2: Account"
			onBack={() => router.push(`/etims-campaign/validation${phoneParam}`)}
			showMenu>
			<div className="space-y-4">
				<div className="bg-[var(--kra-black)] rounded-xl p-4 text-white">
					<h1 className="text-base font-semibold">eTIMS Details</h1>
					<p className="text-gray-400 text-xs">
						Step 2/3 — Account Details
					</p>
				</div>

				<p className="text-sm font-semibold text-gray-700">
					Details Of eTIMS Account
				</p>

				{loading ? (
					<Card className="flex items-center justify-center p-8">
						<Loader2 className="w-6 h-6 animate-spin text-[var(--kra-red)]" />
					</Card>
				) : error && !data ? (
					<Card className="p-4 bg-red-50 border-red-200">
						<p className="text-xs text-red-600">{error}</p>
					</Card>
				) : !data ? (
					<div className="space-y-4">
						<div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
							<AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
							<div>
								<p className="text-sm font-semibold text-amber-900">
									No eTIMS Details Found
								</p>
								<p className="text-xs text-amber-800 mt-1 leading-relaxed">
									We could not find eTIMS account details for
									this phone number.
								</p>
							</div>
						</div>

						<Button
							onClick={() =>
								router.push(
									`/etims-campaign/validation${phoneParam}`,
								)
							}
							className="w-full">
							Back to Validation
						</Button>
					</div>
				) : (
					<Card className="divide-y divide-gray-100 p-0">
						{detailRows.map(row => (
							<div
								key={row.label}
								className="flex items-start justify-between px-4 py-3">
								<span className="text-xs text-gray-500 flex-1 pr-2">
									{row.label}
								</span>
								<span
									className={`text-xs text-right ${
										row.highlight
											? "font-semibold text-gray-900"
											: "text-gray-800"
									}`}>
									{row.value}
								</span>
							</div>
						))}
					</Card>
				)}

				{isZeroAmount && !loading && data && (
					<div className="bg-green-50 border border-green-200 rounded-xl p-4">
						<div className="flex items-start gap-3">
							<CheckCircle className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
							<div>
								<p className="text-sm font-semibold text-green-900">
									No Payment Due
								</p>
								<p className="text-xs text-green-800 mt-1 leading-relaxed">
									Your eTIMS account is currently up to date.
									No payment is required at this time.
								</p>
							</div>
						</div>
					</div>
				)}

				{finishStatus && (
					<div className="p-3 bg-green-50 border border-green-200 rounded-lg">
						<p className="text-xs text-green-700 font-medium">
							{finishStatus}
						</p>
					</div>
				)}

				<div className="flex gap-2 pt-2">
					<Button
						variant="secondary"
						onClick={() =>
							router.push(
								`/etims-campaign/validation${phoneParam}`,
							)
						}
						className="flex-1">
						Back
					</Button>
					{isZeroAmount ? (
						<Button
							onClick={handleFinish}
							disabled={loading || !data || finishing || !!finishStatus}
							className="flex-1"
						>
							{finishing ? (
								<>
									<Loader2 className="w-4 h-4 animate-spin inline mr-1" />
									Finishing...
								</>
							) : (
								"Finish"
							)}
						</Button>
					) : (
						<Button
							onClick={() =>
								router.push(`/etims-campaign/payment${phoneParam}`)
							}
							disabled={loading || !data}
							className="flex-1"
						>
							Pay
						</Button>
					)}
				</div>
			</div>
		</Layout>
	);
}

export default function EtimsCampaignAccountPage() {
	return (
		<Suspense
			fallback={
				<div className="min-h-screen bg-gray-50 flex items-center justify-center">
					<Loader2 className="w-8 h-8 animate-spin text-(--kra-red)" />
				</div>
			}>
			<EtimsCampaignAccountContent />
		</Suspense>
	);
}
