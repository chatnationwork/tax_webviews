export interface CertSession {
  ref_no: string;
  type: 'TIMV' | 'TEMV';
  vehicle_data?: Record<string, any>;
}

const KEY = 'cert_session';

export const saveCertSession = (data: Partial<CertSession>) => {
  if (typeof window === 'undefined') return;
  const existing = getCertSession() || {};
  sessionStorage.setItem(KEY, JSON.stringify({ ...existing, ...data }));
};

export const getCertSession = (): CertSession | null => {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : null;
};

export const clearCertSession = () => {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(KEY);
};

export function flattenToFormData(
  obj: Record<string, any>,
  formData: FormData,
  prefix: string,
) {
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) continue;
    const fieldKey = `${prefix}[${key}]`;
    if (Array.isArray(value)) {
      value.forEach((item, i) => {
        if (item !== null && typeof item === 'object') {
          flattenToFormData(item, formData, `${fieldKey}[${i}]`);
        } else {
          formData.append(`${fieldKey}[${i}]`, String(item));
        }
      });
    } else if (typeof value === 'object' && !(value instanceof File) && !(value instanceof Blob)) {
      flattenToFormData(value, formData, fieldKey);
    } else if (value instanceof File || value instanceof Blob) {
      formData.append(fieldKey, value);
    } else {
      formData.append(fieldKey, String(value));
    }
  }
}

export function appendVehicleMetadata(
  fd: FormData,
  vehicleDetails: Record<string, any>,
) {
  for (const [key, value] of Object.entries(vehicleDetails)) {
    if (value === null || value === undefined) continue;
    if (typeof value === 'object' && !(value instanceof File) && !(value instanceof Blob)) {
      flattenToFormData(value, fd, `vehicle_details[${key}]`);
    } else if (value instanceof File || value instanceof Blob) {
      // Don't re-send file blobs; the server keeps them
    } else {
      fd.append(`vehicle_details[${key}]`, String(value));
    }
  }
}
