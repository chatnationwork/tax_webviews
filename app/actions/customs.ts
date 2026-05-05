'use server';

import logger from '@/lib/logger';

import axios from 'axios';

const BASE_URL = process.env.API_URL;

// Helper to handle API errors
const handleApiError = (error: any) => {
  const responseData = error.response?.data;
  logger.error('API Error:', {
    status: error.response?.status,
    url: error.config?.url,
    data: responseData,
  });

  let errorMessage = 'An error occurred while communicating with the server';

  const responseMessage = responseData?.message;
  if (responseMessage) {
    if (typeof responseMessage === 'string') {
      errorMessage = responseMessage;
    } else if (typeof responseMessage === 'object' && responseMessage.message) {
      errorMessage = responseMessage.message;
    }
  } else if (typeof responseData === 'string' && responseData.length < 200) {
    errorMessage = responseData;
  } else if (responseData?.error) {
    errorMessage = typeof responseData.error === 'string' ? responseData.error : JSON.stringify(responseData.error);
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

export async function getCertificateWithType(ref_no: string, type: string) {
  try {
    const response = await axios.get(`${BASE_URL}/customs/certificate/view`, {
      params: { ref_no, type },
    });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
}

export async function generateExtensionOtp(email: string, msisdn: string) {
  try {
    const response = await axios.post(`${BASE_URL}/otp/generate`, { email, msisdn });
    return { success: true, data: response.data };
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.message || error.message || 'Failed to send OTP',
    };
  }
}

export async function verifyExtensionOtp(ref_no: string, otp: string) {
  try {
    const response = await axios.post(`${BASE_URL}/customs/certificate/verify-otp`, { ref_no, otp });
    return { success: true, data: response.data };
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.message || error.message || 'Invalid OTP',
    };
  }
}

function buildExtensionXml(cert: any, newExitDate: string, periodOfStay: number): string {
  const v = cert.vehicle_details ?? {};
  const t = cert.traveler_details ?? {};
  const ref = cert.ref_no ?? '';

  const esc = (s: any) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const attachments = [
    v.log_book_attachment ? { desc: 'log_book_attachment', file: v.log_book_attachment } : null,
    v.insurance_attachment ? { desc: 'insurance_attachment', file: v.insurance_attachment } : null,
    v.inspection_certificate_attachment ? { desc: 'inspection_certificate_attachment', file: v.inspection_certificate_attachment } : null,
    v.road_safety_licence_attachment ? { desc: 'road_safety_licence_attachment', file: v.road_safety_licence_attachment } : null,
    t.owner_id_attachment ? { desc: 'owner_id_attachment', file: t.owner_id_attachment } : null,
    t.owner_driving_license ? { desc: 'owner_driving_license', file: t.owner_driving_license } : null,
  ]
    .filter(Boolean)
    .map((a: any) => {
      const baseUrl = process.env.API_URL ?? '';
      const docRef = `${baseUrl}/customs/certificate/view-attachment/${ref}/${esc(a.file.filename)}`;
      return `<attachment><doc_type>${esc(a.file.content_type)}</doc_type><mandatory>Y</mandatory><doc_ref>${docRef}</doc_ref><doc_desc>${esc(a.desc)}</doc_desc><attach_id>${esc(a.file.filename)}</attach_id></attachment>`;
    })
    .join('');

  const isOwner = t.is_owner === 'yes' ? 'Y' : 'N';

  return `<?xml version="1.0"?><message><header><module>MVs</module><action>MVs_TIMV_SV04</action><direction>in</direction><user_id>Portal</user_id><information>Create TIMV Extension</information></header><data><data_in><mvs_request><mvs_request_id></mvs_request_id><external_id>${esc(ref)}</external_id><business_entity_id></business_entity_id><cstd_request_reason></cstd_request_reason><detailed_reason>N</detailed_reason><is_completed>N</is_completed><receive_date></receive_date><create_user></create_user></mvs_request><mvs_timvs><axles>${esc(v.axles)}</axles><carnet_expiry_date>${esc(t.carnet_expiry_date)}</carnet_expiry_date><carnet_number>${esc(t.carnet_no)}</carnet_number><temv_caveat>N</temv_caveat><chassis_number>${esc(v.chassis_no)}</chassis_number><colour>${esc(v.color)}</colour><comments></comments><contry_of_registration>${esc(v.registration_country)}</contry_of_registration><cpc></cpc><date_of_entry>${esc(v.date_of_entry)}</date_of_entry><dest_country></dest_country><dest_town>${esc(v.destination_town)}</dest_town><driver_email>${esc(t.driver_email)}</driver_email><driver_mobile_number>${esc(t.driver_phone)}</driver_mobile_number><driver_name>${esc(t.driver_name)}</driver_name><driver_passport>${esc(t.driver_passport)}</driver_passport><engine_capacity>${esc(v.engine_capacity)}</engine_capacity><engine_number>${esc(v.engine_no)}</engine_number><entry_port>${esc(v.entry_port)}</entry_port><expected_exit_date>${esc(newExitDate)}</expected_exit_date><expected_port_of_exit>${esc(v.exit_port)}</expected_port_of_exit><external_id>${esc(ref)}</external_id><ex_source>PORTAL</ex_source><fees_paid></fees_paid><fuel_type>${esc(v.fuel_type)}</fuel_type><is_carnet>${t.is_carnet === 'yes' ? 'Y' : 'N'}</is_carnet><logbook_number>${esc(v.logbook_no)}</logbook_number><make>${esc(v.make)}</make><offense_eslip_num></offense_eslip_num><offense_paid_amount></offense_paid_amount><offense_name_num></offense_name_num><payment_amount></payment_amount><payment_date></payment_date><penalty></penalty><period_of_stay>${periodOfStay}</period_of_stay><pin></pin><rotation_number></rotation_number><seating_capacity>${esc(v.seating_capacity)}</seating_capacity><status></status><tare_weight>${esc(v.tare_weight)}</tare_weight><timv_id></timv_id><timv_issuing_associations>${esc(t.issuing_associations)}</timv_issuing_associations><timv_issuing_associations_email>${esc(t.issuing_association_email)}</timv_issuing_associations_email><timv_issuing_associations_fax>${esc(t.issuing_association_fax)}</timv_issuing_associations_fax><timv_issuing_associations_phone>${esc(t.issuing_association_phone)}</timv_issuing_associations_phone><timv_issuing_country>${esc(t.issuing_country)}</timv_issuing_country><timv_model>${esc(v.model)}</timv_model><timv_other_accessories>${t.has_accessories === 'yes' ? 'Y' : 'N'}</timv_other_accessories><timv_version></timv_version><trailer_registration_number>${esc(v.trailer_reg_no)}</trailer_registration_number><type_of_vehicle>${esc(v.vehicle_type)}</type_of_vehicle><value_of_vehicle>${esc(v.value_of_vehicle)}</value_of_vehicle><vehicle_registration_number>${esc(v.vehicle_reg_no)}</vehicle_registration_number><vehide_usage_class>${esc(v.vehicle_class)}</vehide_usage_class><with_trailer>${v.with_trailer === 'yes' ? 'Y' : 'N'}</with_trailer><year_of_manufacture>${esc(v.year_of_manufacture)}</year_of_manufacture>${attachments}<owner><owner_id>${esc(t.owner_passport)}</owner_id><owner_email>${esc(t.owner_email)}</owner_email><owner_name>${esc(t.owner_name)}</owner_name><is_driver>${isOwner}</is_driver><owner_mobile_number>${esc((t.owner_phone ?? '').replace(/^\+/, ''))}</owner_mobile_number><owner_passport>${esc(t.owner_passport)}</owner_passport></owner></mvs_timvs></data_in></data></message>`;
}

export async function applyTimvExtension(cert: any, extensionDays: number, newExitDate: string) {
  try {
    const xml = buildExtensionXml(cert, newExitDate, extensionDays);
    const timestamp = new Date().toISOString();

    const existingLog: any[] = cert.change_log ?? [];
    const payload = {
      ref_no: cert.ref_no,
      change_log: [...existingLog, { message: xml, timestamp }],
      extensions: [
        ...(cert.extensions ?? []),
        {
          extension_days: extensionDays,
          commencement_date: cert.vehicle_details?.date_of_exit ?? '',
          expiry_date: newExitDate,
        },
      ],
    };

    const response = await axios.put(`${BASE_URL}/customs/certificate/update`, payload, {
      headers: { 'Content-Type': 'application/json' },
    });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
}

export async function getAttachmentUrl(ref_no: string, filename: string): Promise<string> {
  return `${BASE_URL}/customs/certificate/view-attachment/${encodeURIComponent(ref_no)}/${encodeURIComponent(filename)}`;
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

export async function getVehicleMakes() {
  try {
    const response = await axios.get(`${BASE_URL}/customs/vehicles`, {
      params: { group: 'vehicle_make', page_size: 500 },
    });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
}

export async function getVehicleModels(parentCode?: string) {
  try {
    const params: Record<string, any> = { group: 'vehicle_model', page_size: 500 };
    if (parentCode) params.parent_code = parentCode;
    const response = await axios.get(`${BASE_URL}/customs/vehicles`, { params });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
}

export async function getTowns() {
  try {
    const response = await axios.get(`${BASE_URL}/towns`);
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