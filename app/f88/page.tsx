"use client";
import { createContext, useContext, useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { X, Upload, AlertCircle} from 'lucide-react';
import { 
  getDeclaration, 
  submitPassengerInfo, 
  submitTravelInfo, 
  submitDeclarationItems, 
  finalizeDeclaration,
  getCountries,
  searchHsCodes,
  getEntryPoints,
  getCurrencies,
  sendWhatsappNotification,
  initializeDeclaration
} from '../actions/customs';
import { Layout } from '../_components/Layout';
import { PINInput } from '../_components/KRAInputs';

// Form Context
const FormContext = createContext<any>(null);

const useFormContext = () => {
  const context = useContext(FormContext);
  if (!context) throw new Error('useFormContext must be used within FormProvider');
  return context;
};

const FormProvider = ({ children }: { children: React.ReactNode }) => {
  const searchParams = useSearchParams();
  // Get phone from URL params (?phone=254... or ?msisdn=254...)
  const phoneFromUrl = searchParams.get('phone') || searchParams.get('msisdn') || '';

  // Always start at Step 0 (Landing page) - ref_no is generated when user clicks "Start Application"
  const [formData, setFormData] = useState<any>({
    ref_no: '',
    phoneNumber: phoneFromUrl,
    citizenship: '',
    surname: '',
    firstName: '',
    passportNo: '',
    nationality: '',
    dateOfBirth: '',
    kraPin: '',
    profession: '',
    gender: '',
    phone: phoneFromUrl,
    email: '',
    hotelResidence: '',
    physicalAddress: '',
    arrivalDate: '',
    arrivingFrom: '',
    conveyanceMode: 'Air',
    flightNumber: '',
    pointOfEntry: '',
    countriesVisited: [],
    prohibitedItems: 'No',
    restrictedItems: 'No',
    restrictedItemsList: [],
    dutyFreeExceeding: 'No',
    dutyFreeExceedingList: [],
    commercialGoods: 'No',
    commercialGoodsList: [],
    dutiableGoods: 'No',
    dutiableGoodsList: [],
    gifts: 'No',
    giftsList: [],
    exceeding10000: 'No',
    exceeding10000List: [],
    exceeding2000: 'No',
    exceeding2000List: [],
    mobileDevices: 'No',
    mobileDevicesList: [],
    filmingEquipment: 'No',
    filmingEquipmentList: [],
    reImportationGoods: 'No',
    reImportationGoodsList: [],
    assessments: []
  });

  const [currentStep, setCurrentStep] = useState(0); // Always start at landing page
  const [loading, setLoading] = useState(false);
  const [countries, setCountries] = useState<any[]>([]);
  const [entryPoints, setEntryPoints] = useState<any[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);

  // NEW: Function to handle the "Start Application" click
  const startApplication = async () => {
    setLoading(true);
    try {
      const newRefNo = await initializeDeclaration();
      
      if (newRefNo) {
        setFormData((prev: any) => ({ ...prev, ref_no: newRefNo }));
        setCurrentStep(1); // Move to Step 1
      } else {
        alert("Could not generate a reference number. Please try again.");
      }
    } catch (e) {
      console.error("Failed to start application", e);
      alert("System error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      // Only fetch existing declaration if we actually have a Ref No
      if (formData.ref_no) {
        try {
          const data = await getDeclaration(formData.ref_no);
          if (data) {
             setFormData((prev: any) => ({ ...prev, ...data }));
          }
        } catch (e) {
          console.error("Failed to fetch declaration", e);
        }
      }
      
      // Fetch static data (Countries, etc)
      // Note: You might want to move these out of this specific useEffect 
      // so they load even on the landing page
      try {
        const countriesData = await getCountries();
        if (countriesData) setCountries(countriesData);
        
        const entryPointsData = await getEntryPoints();
        if (entryPointsData) setEntryPoints(entryPointsData);

        const currenciesData = await getCurrencies();
        if (currenciesData) setCurrencies(currenciesData);
      } catch (e) {
          console.error("Failed to fetch static data", e);
      }
    };
    init();
  }, [formData.ref_no]); // Depend on formData.ref_no so it triggers after startApplication

  const updateFormData = (updates: any) => {
    setFormData((prev: any) => ({ ...prev, ...updates }));
  };

  const addDeclarationItem = (declarationType: string, item: any) => {
    const listKey = `${declarationType}List`;
    setFormData((prev: any) => ({
      ...prev,
      [listKey]: [...(prev[listKey] || []), item]
    }));
  };

  const removeDeclarationItem = (declarationType: string, index: number) => {
    const listKey = `${declarationType}List`;
    setFormData((prev: any) => ({
      ...prev,
      [listKey]: prev[listKey].filter((_: any, i: number) => i !== index)
    }));
  };

  return (
    <FormContext.Provider value={{ 
      formData, 
      updateFormData, 
      currentStep, 
      setCurrentStep,
      addDeclarationItem,
      removeDeclarationItem,
      loading,
      setLoading,
      countries,
      entryPoints,
      currencies,
      refNo: formData.ref_no,
      startApplication // Expose the new function
    }}>
      {children}
    </FormContext.Provider>
  );
};



// Reusable Date Input Component (DD/MM/YYYY format)
interface DateInputProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  required?: boolean;
  error?: string;
  minDate?: Date;
  maxDate?: Date;
  placeholder?: string;
}

const DateInput = ({ 
  value, 
  onChange, 
  label, 
  required = false, 
  error, 
  minDate, 
  maxDate,
  placeholder = "DD/MM/YYYY" 
}: DateInputProps) => {
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    
    // Remove any non-digit/non-slash characters
    val = val.replace(/[^\d/]/g, '');
    
    // Auto-add slashes for better UX
    if (val.length === 2 && !val.includes('/')) {
      val = val + '/';
    } else if (val.length === 5 && val.split('/').length === 2) {
      val = val + '/';
    }
    
    // Limit to 10 characters (DD/MM/YYYY)
    if (val.length <= 10) {
      onChange(val);
    }
  };

  // Validate date is within min/max range
  const validateDate = (dateStr: string): string | null => {
    if (!dateStr) return null;
    
    // Accept flexible format: D/M/YYYY, DD/M/YYYY, D/MM/YYYY, DD/MM/YYYY
    const datePattern = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
    const match = dateStr.match(datePattern);
    
    if (!match) return null; // Don't show error while user is still typing
    
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);
    
    // Basic validation
    if (month < 1 || month > 12) return 'Invalid month';
    if (day < 1 || day > 31) return 'Invalid day';
    
    const date = new Date(year, month - 1, day);
    
    // Check if date is valid (handles things like Feb 30)
    if (isNaN(date.getTime()) || date.getDate() !== day) return 'Invalid date';
    
    if (minDate && date < minDate) {
      return `Date must be after ${minDate.toLocaleDateString('en-GB')}`;
    }
    
    if (maxDate && date > maxDate) {
      return `Date must be before ${maxDate.toLocaleDateString('en-GB')}`;
    }
    
    return null;
  };

  const dateError = validateDate(value);
  const displayError = error || dateError;

  return (
    <div>
      <label className="block text-xs font-medium mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        className={`w-full px-3 py-2 border rounded-md ${
          displayError ? 'border-red-300' : 'border-gray-300'
        }`}
      />
      {displayError && <p className="text-red-500 text-xs mt-1">{displayError}</p>}
    </div>
  );
};

const LandingPage = () => {
  const { startApplication, loading } = useFormContext();

  return (
    <div className="bg-white rounded-xl shadow-sm border-t-4 border-[#CC0000] overflow-hidden">
      <div className="p-4 sm:p-6">
        {/* Header with language selector */}
        <div className="flex justify-between items-start mb-3">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Passenger Declaration Form - Kenya
          </h1>
        </div>

        <p className="text-gray-600 text-sm mb-4">
          This form MUST be completed by ALL passengers prior to arrival in Kenya.
          Please read the <span className="text-orange-500 font-medium">restrictions and prohibitions</span> notes before applying.
        </p>

        <h2 className="text-base font-semibold mb-3 text-gray-800">What you need to know...</h2>

        {/* Info Cards - Grid layout for compactness */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          {/* Info Card 1 */}
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm mb-1">Free for all travelers</h3>
            <p className="text-gray-600 text-xs">
              This service is <span className="font-bold">free to all travelers</span> entering Kenya.
            </p>
          </div>

          {/* Info Card 2 */}
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm mb-1">Who should fill this form?</h3>
            <p className="text-gray-600 text-xs">
              This applies to <span className="font-bold">all travelers entering Kenya</span>.
            </p>
          </div>

          {/* Info Card 3 */}
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm mb-1">What you will need</h3>
            <p className="text-gray-600 text-xs">
              Passport, travel history, contact details & items to declare.
            </p>
          </div>
        </div>

        {/* Warning Box - Compact */}
        <div className="bg-red-50 border border-red-100 rounded-lg p-3 mb-4 flex gap-2">
          <AlertCircle className="w-5 h-5 text-[#CC0000] flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-[#CC0000] font-bold text-sm">Attention!</h3>
            <p className="text-[#CC0000] text-xs">
              Providing false information may result in fines up to KES 50,000, confiscation of goods, prosecution, or deportation.
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end pt-3 border-t border-gray-100">
          <button 
            onClick={startApplication}
            disabled={loading}
            className="px-6 py-2.5 bg-black text-white rounded-full font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {loading ? 'Initializing...' : 'Start Application'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Declaration Modal Component
const DeclarationModal = ({ isOpen, onClose, declarationType, onSave }: any) => {
  const { currencies } = useFormContext();
  const [formData, setFormData] = useState<any>({});
  const [file, setFile] = useState<File | null>(null);
  const [hsCodeResults, setHsCodeResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [errors, setErrors] = useState<any>({});

  if (!isOpen) return null;

  const handleHsCodeSearch = async (query: string) => {
      if (query.length < 3) return;
      setSearching(true);
      try {
          const results = await searchHsCodes(query, 5);
          if (results && results.entries) {
              setHsCodeResults(results.entries);
          }
      } catch (e) {
          console.error(e);
      } finally {
          setSearching(false);
      }
  }

  const getModalConfig = () => {
    switch (declarationType) {
      case 'restrictedItems':
        return {
          title: 'Item Declaration (Restricted Items)',
          fields: ['hsCode', 'description', 'packages', 'currency', 'value', 'file']
        };
      case 'exceeding10000':
        return {
          title: 'Item Declaration (Exceeding $10,000)',
          fields: ['currency', 'valueOfFund', 'sourceOfFund', 'purposeOfFund', 'file']
        };
      case 'mobileDevices':
        return {
          title: 'Item Declaration (Mobile Devices)',
          fields: ['hsCode', 'description', 'packages', 'currency', 'value', 'make', 'model', 'imei', 'file']
        };
      case 'reImportationGoods':
        return {
          title: 'Item Declaration (Re-importation Goods)',
          fields: ['certificateNo', 'file']
        };
      case 'dutyFreeExceeding':
      case 'commercialGoods':
      case 'dutiableGoods':
      case 'gifts':
      case 'exceeding2000':
      case 'filmingEquipment':
        return {
          title: `Item Declaration (${declarationType})`,
          fields: ['hsCode', 'description', 'packages', 'currency', 'value', 'file']
        };
      default:
        return { title: 'Item Declaration', fields: [] };
    }
  };

  const config = getModalConfig();

  // Define required fields per declaration type (excluding 'file' and 'description' as optional)
  const getRequiredFields = () => {
    switch (declarationType) {
      case 'exceeding10000':
        return ['currency', 'valueOfFund', 'sourceOfFund', 'purposeOfFund'];
      case 'reImportationGoods':
        return ['certificateNo'];
      case 'mobileDevices':
        return ['hsCode', 'packages', 'currency', 'value', 'make', 'model', 'imei'];
      default:
        return ['hsCode', 'packages', 'currency', 'value'];
    }
  };

  const validate = () => {
    const required = getRequiredFields();
    const newErrors: any = {};
    
    required.forEach(field => {
      if (!formData[field] || formData[field].toString().trim() === '') {
        newErrors[field] = 'Required';
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    
    onSave(formData);
    setFormData({});
    setFile(null);
    setHsCodeResults([]);
    setErrors({});
  };

  const handleFileChange = (e: any) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setFormData((prev: any) => ({ ...prev, file: e.target.files[0].name }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white rounded-t-xl sm:rounded-xl w-full sm:max-w-md max-h-[85vh] overflow-y-auto">
        <div className="p-4">
          {/* Compact header */}
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-base font-semibold">{config.title}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            {/* HS Code with search */}
            {config.fields.includes('hsCode') && (
              <div>
                <label className="block text-xs font-medium mb-1">HS Code <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="Search HS Code..."
                  value={formData.hsCode || ''}
                  onChange={(e) => {
                    setFormData((prev: any) => ({ ...prev, hsCode: e.target.value }));
                    handleHsCodeSearch(e.target.value);
                  }}
                  className={`w-full px-2 py-1.5 border rounded text-sm ${errors.hsCode ? 'border-red-300' : 'border-gray-300'}`}
                />
                {searching && <p className="text-xs text-gray-500 mt-0.5">Searching...</p>}
                {hsCodeResults.length > 0 && (
                  <ul className="border border-gray-200 rounded mt-1 max-h-32 overflow-y-auto">
                    {hsCodeResults.map((hs: any) => (
                      <li 
                        key={hs.id} 
                        className="px-2 py-1.5 hover:bg-gray-100 cursor-pointer text-xs"
                        onClick={() => {
                          setFormData((prev: any) => ({ ...prev, hsCode: hs.hs_code, description: hs.description }));
                          setHsCodeResults([]);
                        }}
                      >
                        {hs.hs_code} - {hs.description}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Description */}
            {config.fields.includes('description') && (
              <div>
                <label className="block text-xs font-medium mb-1">Description</label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, description: e.target.value }))}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                  rows={2}
                />
              </div>
            )}

            {/* Packages, Currency, Value - 3-column grid */}
            {(config.fields.includes('packages') || config.fields.includes('currency') || config.fields.includes('value')) && (
              <div className="grid grid-cols-3 gap-2">
                {config.fields.includes('packages') && (
                  <div>
                    <label className="block text-xs font-medium mb-1">Qty <span className="text-red-500">*</span></label>
                    <input
                      type="number"
                      value={formData.packages || ''}
                      onChange={(e) => setFormData((prev: any) => ({ ...prev, packages: e.target.value }))}
                      className={`w-full px-2 py-1.5 border rounded text-sm ${errors.packages ? 'border-red-300' : 'border-gray-300'}`}
                    />
                    {errors.packages && <p className="text-red-500 text-xs">Required</p>}
                  </div>
                )}
                {config.fields.includes('currency') && (
                  <div>
                    <label className="block text-xs font-medium mb-1">Currency <span className="text-red-500">*</span></label>
                    <select
                      value={formData.currency || ''}
                      onChange={(e) => setFormData((prev: any) => ({ ...prev, currency: e.target.value }))}
                      className={`w-full px-2 py-1.5 border rounded text-sm ${errors.currency ? 'border-red-300' : 'border-gray-300'}`}
                    >
                      <option value="">...</option>
                      {currencies?.map((curr: any) => (
                        <option key={curr.code} value={curr.code}>{curr.description}</option>
                      ))}
                    </select>
                  </div>
                )}
                {config.fields.includes('value') && (
                  <div>
                    <label className="block text-xs font-medium mb-1">Value <span className="text-red-500">*</span></label>
                    <input
                      type="number"
                      value={formData.value || ''}
                      onChange={(e) => setFormData((prev: any) => ({ ...prev, value: e.target.value }))}
                      className={`w-full px-2 py-1.5 border rounded text-sm ${errors.value ? 'border-red-300' : 'border-gray-300'}`}
                    />
                    {errors.value && <p className="text-red-500 text-xs">Required</p>}
                  </div>
                )}
              </div>
            )}

            {/* Currency declaration fields - 2-column grid */}
            {config.fields.includes('valueOfFund') && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium mb-1">Value of Fund <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    value={formData.valueOfFund || ''}
                    onChange={(e) => setFormData((prev: any) => ({ ...prev, valueOfFund: e.target.value }))}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                  />
                </div>
                {config.fields.includes('currency') && (
                  <div>
                    <label className="block text-xs font-medium mb-1">Currency</label>
                    <select
                      value={formData.currency || ''}
                      onChange={(e) => setFormData((prev: any) => ({ ...prev, currency: e.target.value }))}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                    >
                      <option value="">Select...</option>
                      {currencies?.map((curr: any) => (
                        <option key={curr.code} value={curr.code}>{curr.description}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Source and Purpose of Fund */}
            {(config.fields.includes('sourceOfFund') || config.fields.includes('purposeOfFund')) && (
              <div className="grid grid-cols-2 gap-2">
                {config.fields.includes('sourceOfFund') && (
                  <div>
                    <label className="block text-xs font-medium mb-1">Source</label>
                    <select
                      value={formData.sourceOfFund || ''}
                      onChange={(e) => setFormData((prev: any) => ({ ...prev, sourceOfFund: e.target.value }))}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                    >
                      <option value="">Select...</option>
                      <option value="Employment">Employment</option>
                      <option value="Business">Business</option>
                      <option value="Investment">Investment</option>
                    </select>
                  </div>
                )}
                {config.fields.includes('purposeOfFund') && (
                  <div>
                    <label className="block text-xs font-medium mb-1">Purpose</label>
                    <select
                      value={formData.purposeOfFund || ''}
                      onChange={(e) => setFormData((prev: any) => ({ ...prev, purposeOfFund: e.target.value }))}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                    >
                      <option value="">Select...</option>
                      <option value="Travel">Travel</option>
                      <option value="Business">Business</option>
                      <option value="Investment">Investment</option>
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Mobile device fields - 3-column grid */}
            {config.fields.includes('make') && (
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-medium mb-1">Make <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formData.make || ''}
                    onChange={(e) => setFormData((prev: any) => ({ ...prev, make: e.target.value }))}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Model <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formData.model || ''}
                    onChange={(e) => setFormData((prev: any) => ({ ...prev, model: e.target.value }))}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">IMEI <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formData.imei || ''}
                    onChange={(e) => setFormData((prev: any) => ({ ...prev, imei: e.target.value }))}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                  />
                </div>
              </div>
            )}

            {/* Certificate No */}
            {config.fields.includes('certificateNo') && (
              <div>
                <label className="block text-xs font-medium mb-1">Certificate No. <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.certificateNo || ''}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, certificateNo: e.target.value }))}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                />
              </div>
            )}

            {/* Compact file upload */}
            {config.fields.includes('file') && (
              <div>
                <label className="block text-xs font-medium mb-1">Attachment</label>
                <div className="border border-dashed border-gray-300 rounded p-3 text-center">
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    onChange={handleFileChange}
                    accept=".pdf,.jpg,.jpeg,.png"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="w-6 h-6 mx-auto text-gray-400 mb-1" />
                    <p className="text-xs text-gray-500">
                      {file ? <span className="text-green-600">{file.name}</span> : 'Click to upload'}
                    </p>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Compact buttons */}
          <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-gray-100">
            <button onClick={onClose} className="px-4 py-1.5 border border-gray-300 rounded text-sm">
              Cancel
            </button>
            <button onClick={handleSave} className="px-4 py-1.5 bg-[#CC0000] text-white rounded text-sm font-medium">
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Page 1: Passenger Information
const PassengerInformation = () => {
  const { formData, updateFormData, setCurrentStep, setLoading, refNo, countries } = useFormContext();
  const [errors, setErrors] = useState<any>({});


  const validate = () => {
    const newErrors: any = {};
    if (!formData.citizenship) newErrors.citizenship = 'Required';
    if (!formData.surname) newErrors.surname = 'Required';
    if (!formData.firstName) newErrors.firstName = 'Required';
    if (!formData.passportNo) newErrors.passportNo = 'Required';
    if (!formData.nationality) newErrors.nationality = 'Required';
    if (!formData.nationality) newErrors.nationality = 'Required';
    
    // Date validation (flexible: D/M/YYYY or DD/MM/YYYY)
    const dateRegex = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = 'Required';
    } else if (!dateRegex.test(formData.dateOfBirth)) {
      newErrors.dateOfBirth = 'Invalid date format';
    }

    if (!formData.gender) newErrors.gender = 'Required';
    if (!formData.phone) newErrors.phone = 'Required';
    if (!formData.email) newErrors.email = 'Required';
    if (!formData.physicalAddress) newErrors.physicalAddress = 'Required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async () => {
    if (validate()) {
      setLoading(true);
      try {
        // Convert DD/MM/YYYY to ISO Date
        const [day, month, year] = formData.dateOfBirth.split('/');
        const isoDate = new Date(`${year}-${month}-${day}`).toISOString();

        const payload = {
            ref_no: refNo,
            firstname: formData.firstName,
            surname: formData.surname,
            passport_number: formData.passportNo,
            nationality: formData.nationality === 'Kenya' ? 'KE' : 'UG', // Simplified mapping
            dob: isoDate,
            profession: formData.profession,
            gender: formData.gender === 'Male' ? 'M' : 'F',
            language: 'en',
            type: '01', // Assuming foreigner or regular passenger for now
            contact_information: {
                msisdn: formData.phone,
                email: formData.email,
                address: formData.physicalAddress,
                residence: formData.hotelResidence
            }
        };
        await submitPassengerInfo(payload);
        setCurrentStep(2);
      } catch (e) {
        console.error("Failed to submit passenger info", e);
        alert("Failed to submit passenger info. Please try again.");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div>
      {/* Compact header */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-lg font-bold text-[#CC0000]">Passenger Information</h1>
        
      </div>

      <div className="space-y-4">
        {/* Passenger Information Section Title */}
        <h2 className="text-sm font-semibold text-gray-700 border-b border-gray-200 pb-2">Passenger Information</h2>

        {/* Citizenship - compact 2x2 grid */}
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700">
            Citizenship <span className="text-[#C8102E]">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {['Kenyan', 'Foreigner', 'East African', 'Diplomat'].map(option => (
              <label 
                key={option} 
                className={`flex items-center gap-1.5 p-2 rounded-lg border cursor-pointer text-xs ${
                  formData.citizenship === option 
                    ? 'border-[#CC0000] bg-[#CC0000]/10' 
                    : 'border-gray-200'
                }`}
              >
                <input
                  type="radio"
                  name="citizenship"
                  value={option}
                  checked={formData.citizenship === option}
                  onChange={(e) => {
                    const val = e.target.value;
                    const updates: any = { citizenship: val };
                    if (val === 'Kenyan') {
                      updates.nationality = 'KE';
                    }
                    updateFormData(updates);
                  }}
                  className="w-3.5 h-3.5"
                />
                <span className="font-medium text-gray-700">{option}</span>
              </label>
            ))}
          </div>
          {errors.citizenship && <p className="text-[#C8102E] text-xs mt-1">{errors.citizenship}</p>}
        </div>

        {/* Basic Information - compact grid layout */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1">Surname <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={formData.surname || ''}
              onChange={(e) => updateFormData({ surname: e.target.value })}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
            />
            {errors.surname && <p className="text-red-500 text-xs mt-0.5">{errors.surname}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">First Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => updateFormData({ firstName: e.target.value })}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
            />
            {errors.firstName && <p className="text-red-500 text-xs mt-0.5">{errors.firstName}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Passport/ID <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={formData.passportNo}
              onChange={(e) => updateFormData({ passportNo: e.target.value })}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
            />
            {errors.passportNo && <p className="text-red-500 text-xs mt-0.5">{errors.passportNo}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Nationality <span className="text-red-500">*</span></label>
            <select
              value={formData.nationality || ''}
              onChange={(e) => updateFormData({ nationality: e.target.value })}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
            >
              {countries.map((country: any) => (
                <option key={country.code} value={country.code}>{country.name}</option>
              ))}
            </select>
            {errors.nationality && <p className="text-red-500 text-xs mt-0.5">{errors.nationality}</p>}
          </div>
        </div>

        {/* DOB and Gender row */}
        <div className="grid grid-cols-2 gap-3">
          {/* TEMPORARILY REPLACED for testing - original DateInput below */}
          {/* <DateInput
            label="Date of Birth"
            required
            value={formData.dateOfBirth}
            onChange={(val) => updateFormData({ dateOfBirth: val })}
            error={errors.dateOfBirth}
            maxDate={new Date()}
          /> */}
          <div>
            <label className="block text-xs font-medium mb-1">Date of Birth <span className="text-red-500">*</span></label>
            <input
              type="date"
              value={formData.dateOfBirthNative || ''}
              onChange={(e) => {
                const dateVal = e.target.value;
                // Convert YYYY-MM-DD to DD/MM/YYYY for consistency
                if (dateVal) {
                  const [year, month, day] = dateVal.split('-');
                  updateFormData({ 
                    dateOfBirthNative: dateVal,
                    dateOfBirth: `${day}/${month}/${year}`
                  });
                }
              }}
              max={new Date().toISOString().split('T')[0]}
              className={`w-full px-2 py-1.5 border rounded text-sm ${errors.dateOfBirth ? 'border-red-300' : 'border-gray-300'}`}
            />
            {errors.dateOfBirth && <p className="text-red-500 text-xs mt-0.5">{errors.dateOfBirth}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Gender <span className="text-red-500">*</span></label>
            <div className="flex gap-2">
              {['Male', 'Female'].map(option => (
                <label 
                  key={option} 
                  className={`flex-1 text-center py-3 rounded border cursor-pointer text-xs font-medium ${
                    formData.gender === option
                      ? 'border-[#CC0000] bg-[#CC0000]/10 text-[#CC0000]' 
                      : 'border-gray-200 text-gray-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="gender"
                    value={option}
                    checked={formData.gender === option}
                    onChange={(e) => updateFormData({ gender: e.target.value })}
                    className="sr-only"
                  />
                  {option}
                </label>
              ))}
            </div>
            {errors.gender && <p className="text-red-500 text-xs mt-0.5">{errors.gender}</p>}
          </div>
        </div>

        {/* Profession - own row */}
        <div>
          <label className="block text-xs font-medium mb-1">Profession</label>
          <input
            type="text"
            value={formData.profession || ''}
            onChange={(e) => updateFormData({ profession: e.target.value })}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
          />
        </div>

        {formData.citizenship === 'Kenyan' && (
          <div className="flex gap-2">
            <PINInput
              required={false}
              value={formData.kraPin}
               onChange={(pin) => updateFormData({ kraPin: pin})}
            />
            <button className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded text-xs">OTP</button>
          </div>
        )}

        {/* Contact Information Section Title */}
        <h2 className="text-sm font-semibold text-gray-700 border-b border-gray-200 pb-2 mt-4">Contact Information</h2>

        {/* Contact Information - compact */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1">Phone <span className="text-red-500">*</span></label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => updateFormData({ phone: e.target.value })}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
              placeholder="254..."
            />
            {errors.phone && <p className="text-red-500 text-xs mt-0.5">{errors.phone}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Email <span className="text-red-500">*</span></label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => updateFormData({ email: e.target.value })}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
            />
            {errors.email && <p className="text-red-500 text-xs mt-0.5">{errors.email}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Hotel/Residence</label>
            <input
              type="text"
              value={formData.hotelResidence}
              onChange={(e) => updateFormData({ hotelResidence: e.target.value })}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Address in Kenya <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={formData.physicalAddress}
              onChange={(e) => updateFormData({ physicalAddress: e.target.value })}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
              maxLength={40}
            />
            {errors.physicalAddress && <p className="text-red-500 text-xs mt-0.5">{errors.physicalAddress}</p>}
          </div>
        </div>
      </div>

      {/* Compact navigation */}
      <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-gray-100">
        <button 
          onClick={handleNext}
          className="px-6 py-2 bg-[#CC0000] text-white rounded text-sm font-medium"
        >
          {useFormContext().loading ? 'Saving...' : 'Next →'}
        </button>
      </div>
    </div>
  );
};

// Page 2: Travel Information
const TravelInformation = () => {
  const { formData, updateFormData, setCurrentStep, setLoading, refNo, countries, entryPoints } = useFormContext();
  const [errors, setErrors] = useState<any>({});

  const validate = () => {
    const newErrors: any = {};
    
    // Date validation (flexible: D/M/YYYY or DD/MM/YYYY)
    const dateRegex = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
    if (!formData.arrivalDate) {
      newErrors.arrivalDate = 'Required';
    } else if (!dateRegex.test(formData.arrivalDate)) {
      newErrors.arrivalDate = 'Invalid date format';
    }

    if (!formData.arrivingFrom) newErrors.arrivingFrom = 'Required';
    if (!formData.conveyanceMode) newErrors.conveyanceMode = 'Required';
    if (!formData.pointOfEntry) newErrors.pointOfEntry = 'Required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async () => {
    if (validate()) {
      setLoading(true);
      try {
        // Convert DD/MM/YYYY to ISO Date
        const [day, month, year] = formData.arrivalDate.split('/');
        const isoDate = new Date(`${year}-${month}-${day}`).toISOString();

        const payload = {
            ref_no: refNo,
            travel_information: {
                arrival_date: isoDate,
                arrival_from: formData.arrivingFrom === 'Uganda' ? 'UG' : 'TZ', // Simplified
                mode_of_conveyance: formData.conveyanceMode === 'Air' ? 'A' : (formData.conveyanceMode === 'Sea' ? 'S' : 'L'),
                point_of_boarding: 'NBO', // Default or add field
                ticket_number: formData.flightNumber,
                recently_visited_countries: formData.countriesVisited
            }
        };
        await submitTravelInfo(payload);
        setCurrentStep(3);
      } catch (e) {
        console.error("Failed to submit travel info", e);
        alert("Failed to submit travel info. Please try again.");
      } finally {
        setLoading(false);
      }
    }
  };

  const getVehicleLabel = () => {
    switch (formData.conveyanceMode) {
      case 'Air': return 'Flight Number';
      case 'Sea': return 'Vessel Number';
      case 'Land': return 'Vehicle Number';
      default: return 'Flight Number';
    }
  };

  return (
    <div>
      {/* Compact header */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-lg font-bold text-[#CC0000]">Travel Information</h1>
        
      </div>

      <div className="space-y-3">
        {/* Arrival Date and From - side by side */}
        <div className="grid grid-cols-2 gap-3">
          <DateInput
            label="Arrival Date"
            required
            value={formData.arrivalDate}
            onChange={(val) => updateFormData({ arrivalDate: val })}
            error={errors.arrivalDate}
            minDate={new Date()}
          />
          <div>
            <label className="block text-xs font-medium mb-1">From <span className="text-red-500">*</span></label>
            <select
              value={formData.arrivingFrom}
              onChange={(e) => updateFormData({ arrivingFrom: e.target.value })}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
            >
              {countries.map((country: any) => (
                <option key={country.code} value={country.code}>{country.name}</option>
              ))}
            </select>
            {errors.arrivingFrom && <p className="text-red-500 text-xs mt-0.5">{errors.arrivingFrom}</p>}
          </div>
        </div>

        {/* Conveyance Mode - inline buttons */}
        <div>
          <label className="block text-xs font-medium mb-1">Mode <span className="text-red-500">*</span></label>
          <div className="flex gap-2">
            {['Air', 'Sea', 'Land'].map(option => (
              <label 
                key={option} 
                className={`flex-1 text-center py-1.5 rounded border cursor-pointer text-xs font-medium ${
                  formData.conveyanceMode === option
                    ? 'border-[#CC0000] bg-[#CC0000]/10 text-[#CC0000]' 
                    : 'border-gray-200 text-gray-600'
                }`}
              >
                <input
                  type="radio"
                  name="conveyanceMode"
                  value={option}
                  checked={formData.conveyanceMode === option}
                  onChange={(e) => updateFormData({ conveyanceMode: e.target.value })}
                  className="sr-only"
                />
                {option}
              </label>
            ))}
          </div>
        </div>

        {/* Flight/Vessel and Entry Point - side by side */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1">{getVehicleLabel()}</label>
            <input
              type="text"
              value={formData.flightNumber}
              onChange={(e) => updateFormData({ flightNumber: e.target.value })}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Entry Point <span className="text-red-500">*</span></label>
            <select
              value={formData.pointOfEntry}
              onChange={(e) => updateFormData({ pointOfEntry: e.target.value })}
              className={`w-full px-2 py-1.5 border rounded text-sm ${errors.pointOfEntry ? 'border-red-300' : 'border-gray-300'}`}
            >
              <option value="">Select...</option>
              {entryPoints?.map((ep: any) => (
                <option key={ep.code} value={ep.code}>{ep.name}</option>
              ))}
            </select>
            {errors.pointOfEntry && <p className="text-red-500 text-xs mt-0.5">{errors.pointOfEntry}</p>}
          </div>
        </div>

        {/* Countries visited - compact */}
        <div>
          <label className="block text-xs font-medium mb-1">
            Countries Visited (last 3 months) 
            {formData.countriesVisited.length > 0 && (
              <span className="text-gray-400 font-normal ml-1">({formData.countriesVisited.length}/6)</span>
            )}
          </label>
          <select
            className={`w-full px-2 py-1.5 border border-gray-300 rounded text-sm ${formData.countriesVisited.length >= 6 ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            disabled={formData.countriesVisited.length >= 6}
            onChange={(e) => {
              if (e.target.value && !formData.countriesVisited.includes(e.target.value) && formData.countriesVisited.length < 6) {
                updateFormData({ countriesVisited: [...formData.countriesVisited, e.target.value] });
                e.target.value = ''; // Reset select
              }
            }}
          >
            <option value="">Select a country...</option>
            {countries?.map((country: any) => (
              <option key={country.code} value={country.code}>{country.name}</option>
            ))}
          </select>
          {formData.countriesVisited.length >= 6 && (
            <p className="text-xs text-amber-600 mt-1">Maximum 6 countries reached</p>
          )}
          {formData.countriesVisited.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {formData.countriesVisited.map((countryCode: string, idx: number) => {
                const countryName = countries?.find((c: any) => c.code === countryCode)?.name || countryCode;
                return (
                  <span key={idx} className="bg-gray-100 px-2 py-0.5 rounded text-xs flex items-center gap-1">
                    {countryName}
                    <button
                      onClick={() => updateFormData({
                        countriesVisited: formData.countriesVisited.filter((_: string, i: number) => i !== idx)
                      })}
                      className="text-gray-400 hover:text-red-500"
                    >×</button>
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Compact navigation */}
      <div className="flex justify-between gap-2 mt-4 pt-3 border-t border-gray-100">
        <button 
          onClick={() => setCurrentStep(1)}
          className="px-4 py-2 border border-gray-300 rounded text-sm"
        >
          ← Back
        </button>
        <button 
          onClick={handleNext}
          className="px-6 py-2 bg-[#CC0000] text-white rounded text-sm font-medium"
        >
          {useFormContext().loading ? 'Saving...' : 'Next'}
        </button>
      </div>
    </div>
  );
};

// Page 3: Declarations
const Declarations = () => {
  const { formData, updateFormData, setCurrentStep, addDeclarationItem, removeDeclarationItem, setLoading, refNo } = useFormContext();
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [error, setError] = useState('');

  const declarationTypes = [
    { id: 'prohibitedItems', label: 'Prohibited Items' },
    { id: 'restrictedItems', label: 'Restricted Items' },
    { id: 'dutyFreeExceeding', label: 'Duty Free Exceeding' },
    { id: 'commercialGoods', label: 'Commercial Goods' },
    { id: 'dutiableGoods', label: 'Dutiable Goods' },
    { id: 'gifts', label: 'Gifts' },
    { id: 'exceeding10000', label: 'Currency Exceeding $10,000' },
    { id: 'exceeding2000', label: 'Currency Exceeding $2,000' },
    { id: 'mobileDevices', label: 'Mobile Devices' },
    { id: 'filmingEquipment', label: 'Filming Equipment' },
    { id: 'reImportationGoods', label: 'Re-Importation Goods' }
  ];

  const validate = () => {
    if (!formData.hasItemsToDeclare) {
      setError('Please indicate whether you have items to declare');
      return false;
    }
    setError('');
    return true;
  };

  const handleNext = async () => {
    if (!validate()) return;
    
    console.log(formData);
    setLoading(true);
    try {
        // Construct items payload
        const items: any[] = [];
        
        // Helper function to map common item structure (keys in snake_case, except hscode)
        const mapItem = (item: any, itemType: string, classificationCode: string) => ({
            type: itemType,
            classification_code: classificationCode,
            hscode: item.hsCode,
            description: item.description,
            quantity: Number(item.packages) || 0,
            value: Number(item.value) || 0,
            currency: item.currency
        });

        // Restricted Items (Code 2)
        if (formData.restrictedItemsList?.length > 0) {
            items.push(...formData.restrictedItemsList.map((i: any) => mapItem(i, "restricted_items", "2")));
        }

        // Duty Free Exceeding (Code 3)
        if (formData.dutyFreeExceedingList?.length > 0) {
            items.push(...formData.dutyFreeExceedingList.map((i: any) => mapItem(i, "items_exceeding_duty", "3")));
        }

        // Commercial Goods (Code 4)
        if (formData.commercialGoodsList?.length > 0) {
            items.push(...formData.commercialGoodsList.map((i: any) => mapItem(i, "commercial_goods", "4")));
        }

        // Dutiable Goods (Code 5)
        if (formData.dutiableGoodsList?.length > 0) {
            items.push(...formData.dutiableGoodsList.map((i: any) => mapItem(i, "dutiable_goods", "5")));
        }

        // Gifts (Code 6)
        if (formData.giftsList?.length > 0) {
            items.push(...formData.giftsList.map((i: any) => mapItem(i, "gifts", "6")));
        }

        // Exceeding $10,000 (Code 7)
        if (formData.exceeding10000List?.length > 0) {
            items.push(...formData.exceeding10000List.map((i: any) => ({
                type: "exceeding_10k",
                classification_code: "7",
                currency: i.currency,
                value_of_fund: Number(i.valueOfFund) || 0,
                source_of_fund: i.sourceOfFund,
                purpose_of_fund: i.purposeOfFund
            })));
        }

        // Exceeding $2,000 (Code 8)
        if (formData.exceeding2000List?.length > 0) {
            items.push(...formData.exceeding2000List.map((i: any) => mapItem(i, "exceeding_2k", "8")));
        }

        // Mobile Devices (Code 9)
        if (formData.mobileDevicesList?.length > 0) {
            items.push(...formData.mobileDevicesList.map((i: any) => ({
                type: "mobile_devices",
                classification_code: "9",
                hscode: i.hsCode,
                description: i.description,
                quantity: Number(i.packages) || 0,
                value: Number(i.value) || 0,
                currency: i.currency,
                make: i.make,
                model: i.model,
                imei: i.imei
            })));
        }

        // Filming Equipment (Code 10)
        if (formData.filmingEquipmentList?.length > 0) {
            items.push(...formData.filmingEquipmentList.map((i: any) => mapItem(i, "filming_equipment", "10")));
        }

        // Re-Importation Goods (Code 11)
        if (formData.reImportationGoodsList?.length > 0) {
            items.push(...formData.reImportationGoodsList.map((i: any) => ({
                type: "reimportation_goods",
                classification_code: "11",
                certificate_no: i.certificateNo
            })));
        }

        console.log("Items to submit:", items);
        
        if (items.length > 0 || formData.prohibitedItems === 'Yes') {
            const payload = {
                ref_no: refNo,
                items: items,
                has_prohibited_items: formData.prohibitedItems === 'Yes',
                compute_assessments: true
            };
            console.log(payload);
            const response = await submitDeclarationItems(payload);
            if (response && response.assesments) {
                updateFormData({ assessments: response.assesments });
            }
        }
        setCurrentStep(4);
    } catch (e) {
        console.error("Failed to submit declarations", e);
        alert("Failed to submit declarations. Please try again.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div>
      {/* Compact header */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-lg font-bold text-[#CC0000]">Declarations</h1>
        
      </div>

      {/* Main Question */}
      <div className={`bg-gray-50 border rounded-lg p-4 mb-4 ${error ? 'border-red-300' : 'border-gray-200'}`}>
        <p className="text-sm font-medium text-gray-800 mb-3">Do you have any items to declare? <span className="text-red-500">*</span></p>
        <div className="flex gap-3">
          {['Yes', 'No'].map((option) => (
            <label 
              key={option}
              className={`flex-1 text-center py-3 rounded-lg border cursor-pointer text-sm font-medium transition-colors ${
                formData.hasItemsToDeclare === option
                  ? option === 'Yes' 
                    ? 'bg-[#CC0000]/10 text-[#CC0000] border-[#CC0000]'
                    : 'bg-green-50 text-green-700 border-green-500'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="hasItemsToDeclare"
                value={option}
                checked={formData.hasItemsToDeclare === option}
                onChange={(e) => {
                  updateFormData({ hasItemsToDeclare: e.target.value });
                  setError('');
                }}
                className="sr-only"
              />
              {option}
            </label>
          ))}
        </div>
        {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
      </div>

      {/* Show declaration categories only if Yes */}
      {formData.hasItemsToDeclare === 'Yes' && (
        <div className="space-y-2">
          {declarationTypes.map((type) => (
            <div key={type.id} className="border-b border-gray-100 pb-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">{type.label}</span>
                <div className="flex gap-1">
                  {['Yes', 'No'].map((option) => (
                    <label 
                      key={option}
                      className={`px-3 py-1 rounded text-xs font-medium cursor-pointer ${
                        formData[type.id] === option
                          ? option === 'Yes' 
                            ? 'bg-[#CC0000]/10 text-[#CC0000] border border-[#CC0000]'
                            : 'bg-gray-100 text-gray-600 border border-gray-300'
                          : 'bg-white text-gray-500 border border-gray-200'
                      }`}
                    >
                      <input
                        type="radio"
                        name={type.id}
                        value={option}
                        checked={formData[type.id] === option}
                        onChange={(e) => updateFormData({ [type.id]: e.target.value })}
                        className="sr-only"
                      />
                      {option}
                    </label>
                  ))}
                </div>
              </div>

              {formData[type.id] === 'Yes' && (
                <div className="mt-2 ml-2">
                  {type.id === 'prohibitedItems' ? (
                    <div className="p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
                      All prohibited items will be seized
                    </div>
                  ) : (
                    <>
                      {formData[`${type.id}List`]?.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center bg-gray-50 p-2 rounded text-xs mb-1">
                          <span className="truncate flex-1">{item.description || item.hsCode || 'Item'}</span>
                          <button
                            onClick={() => removeDeclarationItem(type.id, idx)}
                            className="text-red-500 ml-2"
                          >×</button>
                        </div>
                      ))}
                      <button
                        onClick={() => setActiveModal(type.id)}
                        className="text-[#CC0000] text-xs font-medium"
                      >
                        + Add Item
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Nothing to declare message */}
      {formData.hasItemsToDeclare === 'No' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <p className="text-sm text-green-700 font-medium">Nothing to declare</p>
          <p className="text-xs text-green-600 mt-1">You can proceed to the next step</p>
        </div>
      )}

      {/* Compact navigation */}
      <div className="flex justify-between gap-2 mt-4 pt-3 border-t border-gray-100">
        <button 
          onClick={() => setCurrentStep(2)}
          className="px-4 py-2 border border-gray-300 rounded text-sm"
        >
          ← Back
        </button>
        <button 
          onClick={handleNext}
          className="px-6 py-2 bg-[#CC0000] text-white rounded text-sm font-medium"
        >
          {useFormContext().loading ? 'Calculating...' : 'Next →'}
        </button>
      </div>

      <DeclarationModal
        isOpen={!!activeModal}
        onClose={() => setActiveModal(null)}
        declarationType={activeModal}
        onSave={(item: any) => {
          if (activeModal) {
            addDeclarationItem(activeModal, item);
            setActiveModal(null);
          }
        }}
      />
    </div>
  );
};

// Page 4: Tax Computation
const TaxComputation = () => {
  const { formData, setCurrentStep, setLoading, refNo, phone } = useFormContext();

  const totalTax = formData.assessments?.reduce((sum: number, a: any) => sum + (parseFloat(a.tax_amount) || 0), 0) || 0;

  const handlePayment = async (payNow: boolean) => {
      setLoading(true);
      try {
          const response = await finalizeDeclaration(refNo);
          if (response && response.checkout_url) {
              await sendWhatsappNotification({
                  whatsappNumber: phone,
                  paymentCallbackUrl: response.checkout_url,
                  invoiceNumber: response.invoice_number,
                  payNow: payNow
              });
              if (payNow) {
                  window.location.href = response.checkout_url;
              } else {
                  alert(`Invoice ${response.invoice_number} sent to your whatsapp`);
              }
          } else {
              alert("Payment initiated successfully!");
          }
      } catch (e) {
          console.error("Payment failed", e);
          alert("Payment initiation failed.");
      } finally {
          setLoading(false);
      }
  };

  const groupedAssessments = formData.assessments?.reduce((acc: any, curr: any) => {
      const itemId = curr.metadata?.f88ItemId || 'General';
      if (!acc[itemId]) acc[itemId] = [];
      acc[itemId].push(curr);
      return acc;
  }, {});

  return (
    <div>
      {/* Compact header */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-lg font-bold text-[#CC0000]">Tax Computation</h1>
        
      </div>

      {/* Compact assessment summary */}
      <div className="bg-gray-50 p-4 rounded-lg mb-4">
        <h2 className="text-sm font-semibold mb-3">Assessment Summary</h2>
        <div className="space-y-3">
          {groupedAssessments && Object.entries(groupedAssessments).map(([itemId, assessments]: [string, any]) => (
            <div key={itemId} className="border-b border-gray-200 pb-2">
              <h3 className="text-xs font-medium mb-1 text-gray-700">Item #{itemId}</h3>
              {assessments.map((assessment: any, idx: number) => (
                <div key={idx} className="flex justify-between text-xs text-gray-600 mb-0.5">
                  <span>{assessment.tax_type}</span>
                  <span>KES {assessment.tax_amount}</span>
                </div>
              ))}
            </div>
          ))}
          
          <div className="flex justify-between pt-2 border-t border-gray-300">
            <span className="font-bold text-sm">Total Tax</span>
            <span className="font-bold text-base text-[#CC0000]">KES {totalTax.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Compact navigation with payment options */}
      <div className="flex justify-between items-center gap-2 pt-3 border-t border-gray-100">
        <button 
          onClick={() => setCurrentStep(3)}
          className="px-4 py-2 border border-gray-300 rounded text-sm"
        >
          ← Back
        </button>
        <div className="flex gap-2">
          <button 
            onClick={() => handlePayment(false)}
            className="px-4 py-2 border border-gray-400 text-gray-700 rounded text-sm"
          >
            Pay Later
          </button>
          <button 
            onClick={() => handlePayment(true)}
            className="px-4 py-2 bg-[#CC0000] text-white rounded text-sm font-medium"
          >
            {useFormContext().loading ? 'Processing...' : 'Pay Now'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Suspense fallback={
        <div className="flex h-screen items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-[#CC0000] border-t-transparent rounded-full"></div>
        </div>
      }>
        <FormProvider>
          <MainContent />
        </FormProvider>
      </Suspense>
    </div>
  );
}

// Main Content
const MainContent = () => {
  const { currentStep, setCurrentStep, formData } = useFormContext();

  const getStepTitle = () => {
    switch(currentStep) {
      case 0: return "F88 Declaration";
      case 1: return "Passenger Information";
      case 2: return "Travel Information";
      case 3: return "Declarations";
      case 4: return "Tax Computation";
      default: return "F88 Declaration";
    }
  };

  const getStepIndicator = () => {
    if (currentStep === 0) return undefined;
    if (currentStep > 4) return undefined; // Success/Payment
    return `Step ${currentStep} of 4`;
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
       // Allow going back to home from step 1
       setCurrentStep(0);
    }
  };

  return (
    <Layout
      title={getStepTitle()}
      step={getStepIndicator()}
      onBack={currentStep > 0 ? handleBack : undefined}
      phone={formData?.phone}
      showMenu={true}
      showHeader={true}
      showFooter={true}
    >
      {currentStep === 0 ? (
        <LandingPage />
      ) : (
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 md:p-8 border-t-4 border-[#CC0000]">
        
          {currentStep === 1 && <PassengerInformation />}
          {currentStep === 2 && <TravelInformation />}
          {currentStep === 3 && <Declarations />}
          {currentStep === 4 && <TaxComputation />}
        </div>
      )}
    </Layout>
  );
};