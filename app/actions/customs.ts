'use server';

import axios from 'axios';

const BASE_URL = 'https://kratest.pesaflow.com';

// Helper to handle API errors
const handleApiError = (error: any) => {
  console.error('API Error:', error.response?.data || error.message);
  throw new Error(error.response?.data?.message || 'An error occurred while communicating with the server');
};

export async function submitPassengerInfo(data: any) {
  try {
    const response = await axios.post(`${BASE_URL}/api/customs/passenger-declaration`, data);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
}

export async function submitTravelInfo(data: any) {
  try {
    const response = await axios.post(`${BASE_URL}/api/customs/passenger-declaration`, data);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
}

export async function submitDeclarationItems(data: any) {
  try {
    const response = await axios.post(`${BASE_URL}/api/customs/passenger-declaration`, data);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
}

export async function finalizeDeclaration(ref_no: string) {
  try {
    const response = await axios.post(`${BASE_URL}/api/customs/passenger-declaration/${ref_no}`, {
      checkout: true
    });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
}

export async function getDeclaration(ref_no: string) {
  try {
    const response = await axios.get(`${BASE_URL}/api/customs/passenger-declaration/${ref_no}`);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
}

export async function getStaticData(type: string, code?: string) {
  try {
    const params: any = { type };
    if (code) params.code = code;
    
    const response = await axios.get(`${BASE_URL}/api/static/custom/f88`, { params });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
}

export async function getCountries() {
  try {
    const response = await axios.get(`${BASE_URL}/api/static/custom/countries`);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
}

export async function getCurrencies() {
  try {
    const response = await axios.get(`${BASE_URL}/api/static/custom/currencies`);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
}

export async function searchHsCodes(search: string, pageSize: number = 50) {
  try {
    const response = await axios.get(`${BASE_URL}/api/customs/hs-codes`, {
      params: { search, page_size: pageSize }
    });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
}

export async function sendOtp(pin: string) {
  try {
    const response = await axios.post(`${BASE_URL}/customs/passenger-declaration/send-otp`, { pin });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
}

export async function verifyOtp(otp: string) {
  try {
    const response = await axios.post(`${BASE_URL}/customs/passenger-declaration/verify-otp`, { otp });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
}

export async function getEntryPoints() {
  try {
    const response = await axios.get(`${BASE_URL}/api/entry_points`);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
}

export async function sendWhatsappNotification(payload: {
  whatsappNumber: string;
  paymentCallbackUrl: string;
  invoiceNumber: string;
  payNow: boolean;
}) {
  try {
    const webhookUrl = 'https://webhook.chatnation.co.ke/bot/inbound/6932a683d0e24cab6fb601be';
    console.log(`Sending WhatsApp notification payload to ${webhookUrl}:`, JSON.stringify(payload, null, 2));
    
    const response = await axios.post(webhookUrl, payload);
    return response.data;
  } catch (error) {
    console.error('Failed to send WhatsApp notification:', error);
    // We don't want to break the flow if notification fails, so just log it
    return { success: false, error: 'Failed to send notification' };
  }
}
