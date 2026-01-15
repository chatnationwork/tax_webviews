'use server';

import axios from 'axios';

const BASE_URL = 'https://kratest.pesaflow.com';

// Helper to handle API errors
const handleApiError = (error: any) => {
  console.error('API Error:', error.response?.data || error.message);
  
  // Extract error message - handle both string and object formats
  let errorMessage = 'An error occurred while communicating with the server';
  
  const responseMessage = error.response?.data?.message;
  if (responseMessage) {
    if (typeof responseMessage === 'string') {
      errorMessage = responseMessage;
    } else if (typeof responseMessage === 'object' && responseMessage.message) {
      // Handle { code: '...', message: '...' } format
      errorMessage = responseMessage.message;
    }
  } else if (error.message && typeof error.message === 'string') {
    errorMessage = error.message;
  }
  
  throw new Error(errorMessage);
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
  // 
  console.log('Submitting items:', JSON.stringify(data, null, 2));
  console.log(`${BASE_URL}/api/customs/passenger-declaration`);

  try {
    const response = await axios.post(`${BASE_URL}/api/customs/passenger-declaration`, data);

    console.log(response.data);
    
    // Check for error in response body explicitly
    if (response.data && (response.data.errorCode || response.data.errorMessage)) {
        throw new Error(response.data.errorMessage || `API Error ${response.data.errorCode}`);
    }
    
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
    const response = await axios.post(`${BASE_URL}/api/customs/passenger-declaration/send-otp`, { pin });

    console.log(response.data);
    
    return { success: true, data: response.data };
  } catch (error: any) {
    console.error('Send OTP Error:', error.response?.data || error.message);
    return { 
      success: false, 
      error: error.response?.data?.message || error.message || 'Failed to send OTP' 
    };
  }
}

export async function verifyOtp(otp: string) {
  try {
    const response = await axios.post(`${BASE_URL}/api/customs/passenger-declaration/verify-otp`, { otp });

    console.log(response.data);
    
    return { success: true, data: response.data };
  } catch (error: any) {
    console.error('Verify OTP Error:', error.response?.data || error.message);
    return { 
      success: false, 
      error: error.response?.data?.message || error.message || 'Failed to verify OTP' 
    };
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


// actions/customs.ts

export async function initializeDeclaration() {
  try {
    const res = await fetch('https://kratest.pesaflow.com/api/customs/passenger-declaration', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        uid: 308 // Hardcoded as per your requirement
      }),
    });

    if (!res.ok) {
      throw new Error('Failed to initialize declaration');
    }

    const data = await res.json();
    // Assuming the API returns { ref_no: "..." } or similar structure
    return data.ref_no; 
  } catch (error) {
    console.error('Error initializing declaration:', error);
    return null;
  }
}