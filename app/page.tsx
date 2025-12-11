"use client";
import { createContext, useContext, useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { X, Upload } from 'lucide-react';
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
  sendWhatsappNotification
} from './actions/customs';

// Form Context
const FormContext = createContext<any>(null);

const useFormContext = () => {
  const context = useContext(FormContext);
  if (!context) throw new Error('useFormContext must be used within FormProvider');
  return context;
};

const FormProvider = ({ children }: { children: React.ReactNode }) => {
  const searchParams = useSearchParams();
  const refNo = searchParams.get('ref_no');
  const phone = searchParams.get('msisdn') || searchParams.get('phone');

  const [formData, setFormData] = useState<any>({
    ref_no: refNo,
    phoneNumber: phone,
    citizenship: '',
    surname: '',
    firstName: '',
    passportNo: '',
    nationality: '',
    dateOfBirth: '',
    kraPin: '',
    profession: '',
    gender: '',
    phone: phone || '',
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

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [countries, setCountries] = useState<any[]>([]);
  const [entryPoints, setEntryPoints] = useState<any[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);

  useEffect(() => {
    const init = async () => {
      if (refNo) {
        try {
          const data = await getDeclaration(refNo);
          if (data) {
             setFormData((prev: any) => ({ ...prev, ...data }));
          }
        } catch (e) {
          console.error("Failed to fetch declaration", e);
        }
      }
      
      try {
        const countriesData = await getCountries();
        if (countriesData) {
            setCountries(countriesData);
        }
      } catch (e) {
          console.error("Failed to fetch countries", e);
      }

      try {
        const entryPointsData = await getEntryPoints();
        if (entryPointsData) {
            setEntryPoints(entryPointsData);
        }
      } catch (e) {
          console.error("Failed to fetch entry points", e);
      }

      try {
        const currenciesData = await getCurrencies();
        if (currenciesData) {
            setCurrencies(currenciesData);
        }
      } catch (e) {
          console.error("Failed to fetch currencies", e);
      }
    };
    init();
  }, [refNo]);

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
      refNo
    }}>
      {children}
    </FormContext.Provider>
  );
};

// Progress Steps Component
const ProgressSteps = ({ currentStep }: { currentStep: number }) => {
  const steps = [
    { num: 1, label: 'Passenger Info', shortLabel: 'Passenger' },
    { num: 2, label: 'Travel Info', shortLabel: 'Travel' },
    { num: 3, label: 'Declarations', shortLabel: 'Declare' },
    { num: 4, label: 'Tax Computation', shortLabel: 'Tax' }
  ];

  return (
    <div className="mb-6 sm:mb-8">
      <div className="flex items-center justify-between sm:justify-center sm:gap-4">
        {steps.map((step, idx) => (
          <div key={step.num} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium transition-colors ${
                currentStep === step.num 
                  ? 'bg-[#CC0000] text-[#CC0000] ring-2 ring-[#CC0000] ring-offset-2' 
                  : currentStep > step.num
                  ? 'bg-[#CC0000] text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}>
                {currentStep > step.num ? '✓' : step.num}
              </div>
              <span className={`text-[10px] sm:text-xs mt-1.5 sm:mt-2 text-center ${
                currentStep === step.num ? 'text-[#CC0000] font-semibold' : 'text-gray-500'
              }`}>
                <span className="hidden sm:inline">{step.label}</span>
                <span className="sm:hidden">{step.shortLabel}</span>
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div className={`h-0.5 w-6 sm:w-12 mx-1 sm:mx-2 transition-colors ${
                currentStep > step.num ? 'bg-[#CC0000]' : 'bg-gray-200'
              }`} />
            )}
          </div>
        ))}
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

  const handleSave = () => {
    onSave(formData);
    setFormData({});
    setFile(null);
    setHsCodeResults([]);
  };

  const handleFileChange = (e: any) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setFormData((prev: any) => ({ ...prev, file: e.target.files[0].name }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-xl font-semibold">{config.title}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            {config.fields.includes('hsCode') && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  HS Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Type To Search..."
                  value={formData.hsCode || ''}
                  onChange={(e) => {
                      setFormData((prev: any) => ({ ...prev, hsCode: e.target.value }));
                      handleHsCodeSearch(e.target.value);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
                {searching && <p className="text-xs text-gray-500">Searching...</p>}
                {hsCodeResults.length > 0 && (
                    <ul className="border border-gray-200 rounded-md mt-1 max-h-40 overflow-y-auto">
                        {hsCodeResults.map((hs: any) => (
                            <li 
                                key={hs.id} 
                                className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
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

            {config.fields.includes('description') && (
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                />
              </div>
            )}

            {config.fields.includes('packages') && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  Number Of Packages <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.packages || ''}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, packages: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            )}

            {config.fields.includes('currency') && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  Currency <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.currency || ''}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, currency: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Select Currency...</option>
                  {currencies?.map((curr: any) => (
                    <option key={curr.code} value={curr.code}>
                      {curr.code} - {curr.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {config.fields.includes('value') && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  Value Of Item <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.value || '0'}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, value: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            )}

            {config.fields.includes('valueOfFund') && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  Value Of Fund <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.valueOfFund || ''}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, valueOfFund: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            )}

            {config.fields.includes('sourceOfFund') && (
              <div>
                <label className="block text-sm font-medium mb-1">Source Of Fund</label>
                <select
                  value={formData.sourceOfFund || ''}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, sourceOfFund: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
                <label className="block text-sm font-medium mb-1">Purpose Of Fund</label>
                <select
                  value={formData.purposeOfFund || ''}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, purposeOfFund: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Select...</option>
                  <option value="Travel">Travel</option>
                  <option value="Business">Business</option>
                  <option value="Investment">Investment</option>
                </select>
              </div>
            )}

            {config.fields.includes('make') && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  Make <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.make || ''}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, make: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            )}

            {config.fields.includes('model') && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  Model <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.model || ''}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, model: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            )}

            {config.fields.includes('imei') && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  IMEI Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.imei || ''}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, imei: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            )}

            {config.fields.includes('certificateNo') && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  Re-Importation Certificate No. <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.certificateNo || ''}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, certificateNo: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            )}

            {config.fields.includes('file') && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  Attach relevant documents (e.g., invoices, permits) <span className="text-red-500">*</span>
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-md p-8 text-center">
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    onChange={handleFileChange}
                    accept=".pdf,.jpg,.jpeg,.png"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm">
                      <span className="text-orange-500">Click to upload</span> or Drag and drop files here
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Max file size: 10MB</p>
                    {file && <p className="text-sm text-green-600 mt-2">Selected: {file.name}</p>}
                  </label>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-gray-300 text-gray-600 rounded-md"
            >
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
    
    // Date validation (DD/MM/YYYY)
    const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = 'Required';
    } else if (!dateRegex.test(formData.dateOfBirth)) {
      newErrors.dateOfBirth = 'Format must be DD/MM/YYYY';
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
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-[#CC0000]">Passenger Information</h1>
        <div className="flex gap-2">
          <button className="px-3 sm:px-4 py-2 border border-gray-300 rounded-md text-xs sm:text-sm hover:bg-gray-50 transition-colors">
            Save Draft
          </button>
          <button className="px-3 sm:px-4 py-2 border border-gray-300 rounded-md text-xs sm:text-sm flex items-center gap-2 hover:bg-gray-50 transition-colors">
            🇬🇧 <span className="hidden sm:inline">English</span>
          </button>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-[#CC0000]">Citizenship</h2>
          <label className="block text-sm font-medium mb-2 text-gray-700">
            Select Citizenship <span className="text-[#C8102E]">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            {['Foreigner', 'Kenyan Citizens', 'Other East African Citizens', 'Diplomats'].map(option => (
              <label 
                key={option} 
                className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all touch-target ${
                  formData.citizenship === option 
                    ? 'border-[#CC0000] bg-[#CC0000]/10' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="citizenship"
                  value={option}
                  checked={formData.citizenship === option}
                  onChange={(e) => updateFormData({ citizenship: e.target.value })}
                  className="w-4 h-4 sm:w-5 sm:h-5"
                />
                <span className="text-xs sm:text-sm font-medium text-gray-700">{option}</span>
              </label>
            ))}
          </div>
          {errors.citizenship && <p className="text-[#C8102E] text-xs mt-2">{errors.citizenship}</p>}
        </div>

        <div>
          <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-[#CC0000]">Basic Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Surname <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.surname || ''}
                onChange={(e) => updateFormData({ surname: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
              {errors.surname && <p className="text-red-500 text-xs mt-1">{errors.surname}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => updateFormData({ firstName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
              {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium mb-1">
              Passport/ID No. <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.passportNo}
              onChange={(e) => updateFormData({ passportNo: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            {errors.passportNo && <p className="text-red-500 text-xs mt-1">{errors.passportNo}</p>}
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium mb-1">
              Nationality <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.nationality || ''}
              onChange={(e) => updateFormData({ nationality: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              {countries.map((country: any) => (
                <option key={country.id} value={country.id}>
                  {country.name}
                </option>
              ))}
            </select>
            {errors.nationality && <p className="text-red-500 text-xs mt-1">{errors.nationality}</p>}
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium mb-1">
              Date Of Birth <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="DD/MM/YYYY"
              value={formData.dateOfBirth}
              onChange={(e) => {
                // Allow only numbers and slashes
                const val = e.target.value;
                if (/^[\d/]*$/.test(val) && val.length <= 10) {
                   updateFormData({ dateOfBirth: val });
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            {errors.dateOfBirth && <p className="text-red-500 text-xs mt-1">{errors.dateOfBirth}</p>}
          </div>

          {formData.citizenship === 'Kenyan Citizens' && (
            <div className="mt-4">
              <label className="block text-sm font-medium mb-1">KRA PIN</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.kraPin}
                  onChange={(e) => updateFormData({ kraPin: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                />
                <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md">
                  Send OTP
                </button>
              </div>
              <p className="text-orange-500 text-xs mt-1">Omitting PIN will result in assignment of a generic PIN</p>
            </div>
          )}

          <div className="mt-4">
            <label className="block text-sm font-medium mb-1">Profession (Optional)</label>
            <input
              type="text"
              value={formData.profession || ''}
              onChange={(e) => updateFormData({ profession: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium mb-2 text-gray-700">
              Gender <span className="text-[#C8102E]">*</span>
            </label>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {['Female', 'Male'].map(option => (
                <label 
                  key={option} 
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 cursor-pointer transition-all touch-target ${
                    formData.gender === option 
                      ? 'border-[#CC0000] bg-[#CC0000]/10' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="gender"
                    value={option}
                    checked={formData.gender === option}
                    onChange={(e) => updateFormData({ gender: e.target.value })}
                    className="w-4 h-4 sm:w-5 sm:h-5"
                  />
                  <span className="text-sm font-medium text-gray-700">{option}</span>
                </label>
              ))}
            </div>
            {errors.gender && <p className="text-[#C8102E] text-xs mt-2">{errors.gender}</p>}
          </div>
        </div>

        <div>
          <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-[#CC0000]">Contact Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <select className="px-3 py-2 border border-gray-300 rounded-md">
                  <option>🇰🇪 +254</option>
                </select>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => updateFormData({ phone: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => updateFormData({ email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium mb-1">Hotel/Residence</label>
            <input
              type="text"
              value={formData.hotelResidence}
              onChange={(e) => updateFormData({ hotelResidence: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium mb-1">
              Physical Address In Kenya <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.physicalAddress}
              onChange={(e) => updateFormData({ physicalAddress: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={3}
              maxLength={40}
            />
            <p className="text-sm text-gray-500 text-right">{40 - (formData.physicalAddress?.length || 0)} Characters left</p>
            {errors.physicalAddress && <p className="text-red-500 text-xs mt-1">{errors.physicalAddress}</p>}
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 mt-6 sm:mt-8">
        <button className="w-full sm:w-auto px-6 py-2.5 sm:py-2 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors">
          Back
        </button>
        <button 
          onClick={handleNext}
          className="w-full sm:w-auto px-6 py-2.5 sm:py-2 bg-[#CC0000] text-white rounded-md text-sm font-medium hover:bg-[#990000] transition-colors"
        >
          {useFormContext().loading ? 'Saving...' : 'Next'}
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
    
    // Date validation (DD/MM/YYYY)
    const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!formData.arrivalDate) {
      newErrors.arrivalDate = 'Required';
    } else if (!dateRegex.test(formData.arrivalDate)) {
      newErrors.arrivalDate = 'Format must be DD/MM/YYYY';
    }

    if (!formData.arrivingFrom) newErrors.arrivingFrom = 'Required';
    if (!formData.conveyanceMode) newErrors.conveyanceMode = 'Required';
    
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Travel Information</h1>
        <div className="flex gap-2">
          <button className="px-4 py-2 border border-gray-300 rounded-md text-sm">
            Save Draft
          </button>
          <button className="px-4 py-2 border border-gray-300 rounded-md text-sm flex items-center gap-2">
            🇬🇧 English
          </button>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-1">
            Arrival Date <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="DD/MM/YYYY"
            value={formData.arrivalDate}
            onChange={(e) => {
                const val = e.target.value;
                if (/^[\d/]*$/.test(val) && val.length <= 10) {
                   updateFormData({ arrivalDate: val });
                }
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
          {errors.arrivalDate && <p className="text-red-500 text-xs mt-1">{errors.arrivalDate}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Arriving From <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.arrivingFrom}
            onChange={(e) => updateFormData({ arrivingFrom: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
         {countries.map((country: any) => (
            <option key={country.id} value={country.id}>
              {country.name}
            </option>
          ))}
          </select>
          {errors.arrivingFrom && <p className="text-red-500 text-xs mt-1">{errors.arrivingFrom}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Conveyance Mode <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-4">
            {['Air', 'Sea', 'Land'].map(option => (
              <label key={option} className="flex items-center">
                <input
                  type="radio"
                  name="conveyanceMode"
                  value={option}
                  checked={formData.conveyanceMode === option}
                  onChange={(e) => updateFormData({ conveyanceMode: e.target.value })}
                  className="w-4 h-4 text-orange-500"
                />
                <span className="ml-2 text-sm">{option}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            {getVehicleLabel()} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.flightNumber}
            onChange={(e) => updateFormData({ flightNumber: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Point Of Entry <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.pointOfEntry}
            onChange={(e) => updateFormData({ pointOfEntry: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="">Select...</option>
            {entryPoints?.map((ep: any) => (
              <option key={ep.code} value={ep.code}>
                {ep.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Countries Visited In The Last 3 Months
          </label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            onChange={(e) => {
              if (e.target.value && !formData.countriesVisited.includes(e.target.value)) {
                updateFormData({
                  countriesVisited: [...formData.countriesVisited, e.target.value]
                });
              }
            }}
          >
           {countries?.map((country: any) => (
            <option key={country.code} value={country.code}>
              {country.name}
            </option>
          ))}
          </select>
          <div className="flex flex-wrap gap-2 mt-2">
            {formData.countriesVisited.map((country: string, idx: number) => (
              <span key={idx} className="bg-gray-100 px-2 py-1 rounded-md text-sm flex items-center gap-1">
                {country}
                <button
                  onClick={() => updateFormData({
                    countriesVisited: formData.countriesVisited.filter((_: string, i: number) => i !== idx)
                  })}
                  className="text-gray-500 hover:text-red-500"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-8">
        <button 
          onClick={() => setCurrentStep(1)}
          className="px-6 py-2 border border-gray-300 rounded-md"
        >
          Back
        </button>
        <button 
          onClick={handleNext}
          className="px-6 py-2 bg-black text-white rounded-md"
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

  const handleNext = async () => {
    setLoading(true);
    try {
        // Construct items payload
        const items = [];
        
        if (formData.restrictedItemsList) {
            items.push(...formData.restrictedItemsList.map((i: any) => ({
                type: "Restricted Items",
                hscode: i.hsCode,
                description: i.description,
                quantity: i.packages,
                value: i.value,
                currency: i.currency
            })));
        }
        // Add other lists similarly...
        
        if (items.length > 0) {
            const payload = {
                ref_no: refNo,
                items: items,
                compute_assessments: true
            };
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Declarations</h1>
        <div className="flex gap-2">
          <button className="px-4 py-2 border border-gray-300 rounded-md text-sm">
            Save Draft
          </button>
          <button className="px-4 py-2 border border-gray-300 rounded-md text-sm flex items-center gap-2">
            🇬🇧 English
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {declarationTypes.map((type) => (
          <div key={type.id} className="border-b border-gray-200 pb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">{type.label}</span>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name={type.id}
                    value="Yes"
                    checked={formData[type.id] === 'Yes'}
                    onChange={(e) => updateFormData({ [type.id]: e.target.value })}
                    className="w-4 h-4 text-orange-500"
                  />
                  <span className="ml-2 text-sm">Yes</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name={type.id}
                    value="No"
                    checked={formData[type.id] === 'No'}
                    onChange={(e) => updateFormData({ [type.id]: e.target.value })}
                    className="w-4 h-4 text-orange-500"
                  />
                  <span className="ml-2 text-sm">No</span>
                </label>
              </div>
            </div>

            {formData[type.id] === 'Yes' && (
              <div className="mt-4 pl-4">
                {type.id === 'prohibitedItems' ? (
                   <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
                      All prohibited items will be seized by KRA customs officer
                   </div>
                ) : (
                  <>
                    {formData[`${type.id}List`]?.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center bg-gray-50 p-3 rounded-md mb-2">
                        <span className="text-sm">{item.description || item.hsCode}</span>
                        <button
                          onClick={() => removeDeclarationItem(type.id, idx)}
                          className="text-red-500 text-sm hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => setActiveModal(type.id)}
                      className="text-orange-500 text-sm font-medium hover:underline"
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

      <div className="flex justify-end gap-3 mt-8">
        <button 
          onClick={() => setCurrentStep(2)}
          className="px-6 py-2 border border-gray-300 rounded-md"
        >
          Back
        </button>
        <button 
          onClick={handleNext}
          className="px-6 py-2 bg-black text-white rounded-md"
        >
          {useFormContext().loading ? 'Calculating...' : 'Next'}
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
                  alert("Invoice sent to your WhatsApp!");
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Tax Computation</h1>
        <div className="flex gap-2">
          <button className="px-4 py-2 border border-gray-300 rounded-md text-sm">
            Save Draft
          </button>
          <button className="px-4 py-2 border border-gray-300 rounded-md text-sm flex items-center gap-2">
            🇬🇧 English
          </button>
        </div>
      </div>

      <div className="bg-gray-50 p-6 rounded-lg mb-6">
        <h2 className="text-lg font-semibold mb-4">Assessment Summary</h2>
        <div className="space-y-6">
          {groupedAssessments && Object.entries(groupedAssessments).map(([itemId, assessments]: [string, any]) => (
              <div key={itemId} className="border-b border-gray-200 pb-4">
                  <h3 className="font-medium mb-2">Item #{itemId}</h3>
                  {assessments.map((assessment: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-sm text-gray-600 mb-1">
                          <span>{assessment.tax_type}</span>
                          <span>KES {assessment.tax_amount}</span>
                      </div>
                  ))}
              </div>
          ))}
          
          <div className="flex justify-between pt-2 border-t border-gray-300">
            <span className="font-bold">Total Tax Payable</span>
            <span className="font-bold text-lg">KES {totalTax}</span>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-8">
        <button 
          onClick={() => setCurrentStep(3)}
          className="px-6 py-2 border border-gray-300 rounded-md"
        >
          Back
        </button>
        <button 
          onClick={() => handlePayment(false)}
          className="px-6 py-2 border border-black text-black rounded-md hover:bg-gray-100"
        >
          {useFormContext().loading ? 'Processing...' : 'Pay Later'}
        </button>
        <button 
          onClick={() => handlePayment(true)}
          className="px-6 py-2 bg-black text-white rounded-md hover:bg-gray-800"
        >
          {useFormContext().loading ? 'Processing...' : 'Pay Now'}
        </button>
      </div>
    </div>
  );
};

export default function Home() {
  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      {/* Header */}
      <div className="bg-[#CC0000] shadow-lg sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#CC0000] rounded-lg flex items-center justify-center text-[#CC0000] font-bold text-sm sm:text-base">
              KRA
            </div>
            <div>
              <span className="font-bold text-sm sm:text-lg text-white">F88 Declaration</span>
              <p className="text-[10px] sm:text-xs text-white/70 hidden sm:block">Customs Declaration Form</p>
            </div>
          </div>
          <div className="flex gap-1.5 sm:gap-2">
            <button className="px-2 sm:px-3 py-1.5 bg-[#CC0000] text-[#CC0000] rounded-md text-xs sm:text-sm font-medium hover:bg-[#990000] transition-colors">
              <span className="hidden sm:inline">Save Draft</span>
              <span className="sm:hidden">Save</span>
            </button>
            <button className="px-2 sm:px-3 py-1.5 border border-white/30 text-white rounded-md text-xs sm:text-sm font-medium flex items-center gap-1.5 hover:bg-white/10 transition-colors">
              🇬🇧 <span className="hidden sm:inline">English</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto py-4 sm:py-8 px-3 sm:px-6 lg:px-8">
        <Suspense fallback={
          <div className="bg-white rounded-xl shadow-sm p-8 flex items-center justify-center">
            <div className="animate-spin w-8 h-8 border-4 border-[#CC0000] border-t-transparent rounded-full"></div>
          </div>
        }>
          <FormProvider>
            <MainContent />
          </FormProvider>
        </Suspense>
      </div>

      {/* Footer */}
      <div className="bg-[#CC0000] py-4 mt-8">
        <div className="max-w-4xl mx-auto px-3 sm:px-6 text-center">
          <p className="text-white/70 text-xs sm:text-sm">
            © {new Date().getFullYear()} Kenya Revenue Authority. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

const MainContent = () => {
  const { currentStep } = useFormContext();

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 md:p-8 border-t-4 border-[#CC0000]">
      <ProgressSteps currentStep={currentStep} />
      
      {currentStep === 1 && <PassengerInformation />}
      {currentStep === 2 && <TravelInformation />}
      {currentStep === 3 && <Declarations />}
      {currentStep === 4 && <TaxComputation />}
    </div>
  );
};