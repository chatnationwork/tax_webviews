'use server';

import logger from '@/lib/logger';

import axios from 'axios';

const BASE_URL = process.env.API_URL;

// Helper to handle API errors
const handleApiError = (error: any) => {
  logger.error('API Error:', error.response?.data || error.message);
  
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
    const response = await axios.post(`${BASE_URL}/customs/passenger-declaration`, data);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
}

export async function submitTravelInfo(data: any) {
  try {
    const response = await axios.post(`${BASE_URL}/customs/passenger-declaration`, data);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
}

export async function submitDeclarationItems(data: any) {
  // 
  logger.info('Submitting items:', JSON.stringify(data, null, 2));
  logger.info(`${BASE_URL}/customs/passenger-declaration`);

  try {
    const response = await axios.post(`${BASE_URL}/customs/passenger-declaration`, data);

    logger.info(response.data);
    
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
    const response = await axios.post(`${BASE_URL}/customs/passenger-declaration/${ref_no}`, {
      checkout: true
    });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
}

export async function getDeclaration(ref_no: string) {
  try {
    const response = await axios.get(`${BASE_URL}/customs/passenger-declaration/${ref_no}`);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
}

export async function getStaticData(type: string, code?: string) {
  try {
    const params: any = { type };
    if (code) params.code = code;
    
    const response = await axios.get(`${BASE_URL}/static/custom/f88`, { params });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
}

export async function getCountries() {
  try {
    const response = await axios.get(`${BASE_URL}/static/custom/countries`);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
}

export async function getCurrencies() {
  try {
    const response = await axios.get(`${BASE_URL}/static/custom/currencies`);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
}

export async function searchHsCodes(search: string, pageSize: number = 50) {
  try {
    const response = await axios.get(`${BASE_URL}/customs/hs-codes`, {
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

    logger.info(response.data);
    
    return { success: true, data: response.data };
  } catch (error: any) {
    logger.error('Send OTP Error:', error.response?.data || error.message);
    return { 
      success: false, 
      error: error.response?.data?.message || error.message || 'Failed to send OTP' 
    };
  }
}

export async function verifyOtp(otp: string) {
  try {
    const response = await axios.post(`${BASE_URL}/customs/passenger-declaration/verify-otp`, { otp });

    logger.info(response.data);
    
    return { success: true, data: response.data };
  } catch (error: any) {
    logger.error('Verify OTP Error:', error.response?.data || error.message);
    return { 
      success: false, 
      error: error.response?.data?.message || error.message || 'Failed to verify OTP' 
    };
  }
}

export async function getEntryPoints() {
  try {
    const response = await axios.get(`${BASE_URL}/entry_points`);
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
  const { whatsappNumber, paymentCallbackUrl, invoiceNumber, payNow } = payload;

  if (!whatsappNumber) {
    return { success: false, error: 'Phone number is required' };
  }

  // Clean phone number (ensure 254 prefix without +)
  let finalNumber = whatsappNumber.replace(/\D/g, '');
  if (finalNumber.startsWith('0')) {
    finalNumber = '254' + finalNumber.substring(1);
  } else if (!finalNumber.startsWith('254')) {
    finalNumber = '254' + finalNumber;
  }

  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  
  if (!token || !phoneNumberId) {
    logger.error('WhatsApp API credentials not configured');
    // Don't break the flow if notification fails
    return { success: false, error: 'WhatsApp sending not configured' };
  }

  const url = `https://crm.chatnation.co.ke/api/meta/v21.0/${phoneNumberId}/messages`;
  
  const message = payNow 
    ? `🧾 *F88 Declaration Invoice*\n\nInvoice Number: ${invoiceNumber}\n\nClick the link below to complete your payment:\n${paymentCallbackUrl}`
    : `🧾 *F88 Declaration Invoice*\n\nInvoice Number: ${invoiceNumber}\n\nYour declaration has been submitted. You can pay later using this link:\n${paymentCallbackUrl}`;

  const requestPayload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: finalNumber,
    type: "text",
    text: {
      preview_url: true,
      body: message
    }
  };

  try {
    logger.info('Sending WhatsApp notification:', JSON.stringify(requestPayload, null, 2));
    
    const response = await axios.post(url, requestPayload, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    return { 
      success: true, 
      messageId: response.data.messages?.[0]?.id 
    };
  } catch (error: any) {
    logger.error('Error sending WhatsApp notification:', error.response?.data || error.message);
    // Don't break the flow if notification fails
    return { 
      success: false, 
      error: error.response?.data?.error?.message || 'Failed to send notification' 
    };
  }
}


// actions/customs.ts

export async function initializeDeclaration() {
  try {
    const res = await fetch(`${process.env.API_URL}/customs/passenger-declaration`, {
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
    logger.error('Error initializing declaration:', error);
    return null;
  }
}

// Get payment slip download URL
export async function getPaymentSlipUrl(refNo: string) {
  return `${BASE_URL}/customs/passenger-declaration/${refNo}/download-payment-slip`;
}

// Get F88 form download URL
export async function getF88FormUrl(refNo: string) {
  return `${BASE_URL}/customs/passenger-declaration/${refNo}/download-form`;
}

// ─── TIMV / TEMV Certificate Actions ────────────────────────────────────────

export async function createCertificate(type: 'TIMV' | 'TEMV') {
  try {
    const response = await axios.post(`${BASE_URL}/customs/certificate`, { type });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
}

export async function updateCertificate(formData: FormData) {
  try {
    const response = await axios.put(`${BASE_URL}/customs/certificate/update`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
}

export async function getCertificate(ref_no: string) {
  try {
    const response = await axios.get(`${BASE_URL}/customs/certificate/view`, {
      params: { ref_no },
    });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
}

export async function submitCertificate(ref_no: string) {
  try {
    const response = await axios.post(`${BASE_URL}/customs/certificate/submit`, { ref_no });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
}

export async function validateVehicle(regno: string) {
  try {
    const response = await axios.get(`${BASE_URL}/customs/certificate/validate-vehicle`, {
      params: { regno },
    });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
}

export async function verifyOwner(code: string, reg_no: string) {
  try {
    const response = await axios.post(`${BASE_URL}/customs/certificate/verify-owner`, { code, reg_no });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
}

export async function getCertCounties() {
  try {
    const response = await axios.get(`${BASE_URL}/counties`);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
}

export async function getVehicleTypes() {
  try {
    const response = await axios.get(`${BASE_URL}/customs/vehicles`, {
      params: { group: 'vehicle_type', page_size: 100 },
    });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────

// Send document via WhatsApp (using same pattern as auth.ts)
export async function sendDocumentViaWhatsapp(payload: {
  whatsappNumber: string;
  documentUrl: string;
  documentType: 'payment_slip' | 'f88_form';
  refNo: string;
}) {
  const { whatsappNumber, documentUrl, documentType, refNo } = payload;

  if (!whatsappNumber || !documentUrl) {
    return { success: false, error: 'Phone number and document URL are required' };
  }

  // Clean phone number (ensure 254 prefix without +)
  let finalNumber = whatsappNumber.replace(/\D/g, '');
  if (finalNumber.startsWith('0')) {
    finalNumber = '254' + finalNumber.substring(1);
  } else if (!finalNumber.startsWith('254')) {
    finalNumber = '254' + finalNumber;
  }

  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  
  if (!token || !phoneNumberId) {
    logger.error('WhatsApp API credentials not configured');
    return { success: false, error: 'WhatsApp sending not configured' };
  }

  const url = `https://crm.chatnation.co.ke/api/meta/v21.0/${phoneNumberId}/messages`;
  
  const caption = documentType === 'f88_form' 
    ? `Your F88 Passenger Declaration Form (Ref: ${refNo})`
    : `Your Payment Slip (Ref: ${refNo})`;
  
  const filename = documentType === 'f88_form'
    ? `F88_Form_${refNo}.pdf`
    : `Payment_Slip_${refNo}.pdf`;

  const requestPayload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: finalNumber,
    type: "document",
    document: {
      link: documentUrl,
      caption: caption,
      filename: filename
    }
  };

  try {
    logger.info('Sending WhatsApp document:', JSON.stringify(requestPayload, null, 2));
    
    const response = await axios.post(url, requestPayload, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000 // Longer timeout for documents
    });

    // Track analytics
    // Assuming trackMessageSent is defined elsewhere and imported
    // await trackMessageSent({
    //   message_id: response.data.messages?.[0]?.id,
    //   recipient_phone: finalNumber,
    //   message_type: 'document',
    //   document_url: documentUrl,
    //   document_filename: filename
    // });

    return { 
      success: true, 
      messageId: response.data.messages?.[0]?.id 
    };
  } catch (error: any) {
    logger.error('Error sending WhatsApp document:', error.response?.data || error.message);
    return { 
      success: false, 
      error: error.response?.data?.error?.message || 'Failed to send document via WhatsApp' 
    };
  }
}