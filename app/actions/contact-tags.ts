"use server";

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

export async function getContactTags(
	phone: string,
): Promise<ContactTagsResponse> {
	if (!phone) {
		throw new Error("Phone number is required");
	}

	const apiKey = process.env.NEXT_PUBLIC_ANALYTICS_WRITE_KEY;

	if (!apiKey) {
		throw new Error("Analytics API key not configured");
	}

	const params = new URLSearchParams({ phone });
	const url = `https://analytics.chatnationbot.com/api/dashboard/contact-tags?${params.toString()}`;

	const response = await fetch(url, {
		headers: {
			"x-api-key": apiKey,
		},
		cache: "no-store",
	});

	if (!response.ok) {
		const errorText = await response.text().catch(() => "Unknown error");
		throw new Error(
			`Failed to load eTIMS details: ${response.status} ${errorText}`,
		);
	}

	const data = (await response.json()) as ContactTagsResponse;

	if (!data.data) {
		throw new Error("No eTIMS details were returned for this phone number.");
	}

	return data;
}
