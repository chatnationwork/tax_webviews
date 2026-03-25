"use server";

import logger from "@/lib/logger";
import axios from "axios";
import { getAuthHeaders } from "./auth";

const BASE_URL = `${process.env.API_URL}/ussd`;

export interface TaxpayerObligation {
	obligationId: string;
	obligationCode: string;
	obligationName: string;
	obligationShortName: string;
}

export interface AllTaxpayerObligationsResult {
	success: boolean;
	obligations?: TaxpayerObligation[];
	message?: string;
}

async function getApiHeaders(requiresAuth: boolean = true) {
	if (!requiresAuth) {
		return {
			"Content-Type": "application/json",
			"x-source-for": "whatsapp",
			"x-forwarded-for": "whatsapp",
		};
	}
	return getAuthHeaders();
}

/**
 * Get ALL taxpayer obligations without filtering
 * Used for eTIMS campaign to match user's obligation from contact tags
 */
export async function getAllTaxpayerObligations(
	pin: string,
): Promise<AllTaxpayerObligationsResult> {
	try {
		const headers = await getApiHeaders(true);
		const response = await axios.get(
			`${BASE_URL}/tax-payer-obligations/${pin}`,
			{ headers },
		);

		const data = response.data;
		console.log(data);

		let obligations: TaxpayerObligation[] = [];

		if (Array.isArray(data)) {
			obligations = data.map((item: any) => ({
				obligationId: item.obligation_id || item.id,
				obligationCode: item.obligation_code,
				obligationName: item.obligation_name || item.name,
				obligationShortName:
					item.obligation_short_name ||
					item.obligation_name ||
					item.name,
			}));
		} else if (data.obligations && Array.isArray(data.obligations)) {
			obligations = data.obligations.map((item: any) => ({
				obligationId: item.obligation_id || item.id,
				obligationCode: item.obligation_code,
				obligationName: item.obligation_name || item.name,
				obligationShortName:
					item.obligation_short_name ||
					item.obligation_name ||
					item.name,
			}));
		}

		logger.info(
			`Retrieved ${obligations.length} obligations for PIN ${pin}`,
		);

		return {
			success: true,
			obligations: obligations,
		};
	} catch (error: any) {
		logger.error(
			"Get All Obligations Error:",
			error.response?.data || error.message,
		);

		return {
			success: false,
			obligations: [],
			message:
				error.response?.data?.message ||
				"Failed to retrieve obligations",
		};
	}
}
