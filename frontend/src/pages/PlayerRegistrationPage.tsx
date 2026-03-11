import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

interface FormField {
  fieldName: string;
  fieldLabel: string;
  fieldType: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
  order: number;
  validation?: {
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: string;
  };
}

interface FormConfig {
  formTitle: string;
  formDescription: string;
  sportType: string;
  fields: FormField[];
}

const PlayerRegistrationPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [formData, setFormData] = useState<{ [key: string]: any }>({
    name: '',
    regNo: ''
  });
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoUploadedUrl, setPhotoUploadedUrl] = useState<string>('');
  const [, setPhotoUploadError] = useState<string>('');
  const photoAbortRef = useRef<AbortController | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [validating, setValidating] = useState(true);
  const [linkValid, setLinkValid] = useState(false);
  const [auctioneerInfo, setAuctioneerInfo] = useState<{ name: string; email: string } | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [formConfig, setFormConfig] = useState<FormConfig | null>(null);
  const [loadingForm, setLoadingForm] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

  useEffect(() => {
    const validateLink = async () => {
      if (!token) {
        setMessage({
          type: 'error',
          text: 'Invalid registration link. Please contact the organizer for a valid link.'
        });
        setValidating(false);
        setLoadingForm(false);
        return;
      }

      try {
        const authResponse = await axios.get(`${API_URL}/auth/registration-link/${token}`);
        if (authResponse.data.success) {
          setLinkValid(true);
          setAuctioneerInfo({
            name: authResponse.data.data.auctioneerName,
            email: authResponse.data.data.auctioneerEmail
          });

          try {
            const formResponse = await axios.get(`${API_URL}/form-config/public/${token}`);
            if (formResponse.data.success) {
              const config = formResponse.data.data as FormConfig;
              setFormConfig(config);

              const initialData: { [key: string]: any } = { name: '', regNo: '' };
              config.fields.forEach((field: FormField) => {
                if (field.fieldName !== 'name' && field.fieldName !== 'regNo' && field.fieldName !== 'photo') {
                  initialData[field.fieldName] = '';
                }
              });
              setFormData(initialData);
            }
          } catch (formError) {
            console.error('Error fetching form config:', formError);
            setFormConfig({
              formTitle: 'Player Registration',
              formDescription: '',
              sportType: 'general',
              fields: [
                { fieldName: 'name', fieldLabel: 'Full Name', fieldType: 'text', required: true, order: 0 },
                { fieldName: 'regNo', fieldLabel: 'Reg Number', fieldType: 'text', required: false, order: 1 },
                { fieldName: 'class', fieldLabel: 'Class', fieldType: 'text', required: true, placeholder: '10th, 11th, 12th', order: 2 },
                { fieldName: 'position', fieldLabel: 'Position', fieldType: 'text', required: true, order: 3 },
                { fieldName: 'photo', fieldLabel: 'Photo', fieldType: 'file', required: true, order: 4 }
              ]
            });
          }
        }
      } catch (error: any) {
        setMessage({
          type: 'error',
          text: error.response?.data?.error || 'Invalid or expired registration link'
        });
        setLinkValid(false);
      } finally {
        setValidating(false);
        setLoadingForm(false);
      }
    };

    validateLink();
  }, [token, API_URL]);

  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => {
        setShowSuccess(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showSuccess]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? '' : Number(value)) : value
    }));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhoto(file);
      setPhotoUploadError('');
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);

      // Eagerly upload photo
      const uploadData = new FormData();
      uploadData.append('photo', file);

      if (photoAbortRef.current) photoAbortRef.current.abort();
      const abortController = new AbortController();
      photoAbortRef.current = abortController;

      setPhotoUploading(true);
      setPhotoUploadedUrl('');

      axios.post(`${API_URL}/players/upload-photo-public`, uploadData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        signal: abortController.signal
      })
        .then(res => {
          setPhotoUploadedUrl(res.data.url);
          setPhotoUploading(false);
        })
        .catch(err => {
          if (axios.isCancel(err)) return;
          console.error('Eager photo upload failed:', err);
          setPhotoUploadError('Photo upload failed — will retry on submit');
          setPhotoUploading(false);
        });
    }
  };

  const handleClearForm = () => {
    if (!formConfig) return;
    const resetData: { [key: string]: any } = { name: '', regNo: '' };
    formConfig.fields.forEach(field => {
      if (field.fieldName !== 'name' && field.fieldName !== 'regNo' && field.fieldName !== 'photo') {
        resetData[field.fieldName] = '';
      }
    });
    setFormData(resetData);
    setPhoto(null);
    setPhotoPreview('');
    setPhotoUploadedUrl('');
    setPhotoUploadError('');
    setMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      if (!formConfig) {
        setMessage({ type: 'error', text: 'Form configuration not loaded' });
        setLoading(false);
        return;
      }

      const photoField = formConfig.fields.find(f => f.fieldName === 'photo');
      if (photoField?.required && !photo) {
        setMessage({ type: 'error', text: 'Please upload a photo' });
        setLoading(false);
        return;
      }

      for (const field of formConfig.fields) {
        if (field.required && field.fieldName !== 'photo') {
          if (!formData[field.fieldName] || formData[field.fieldName] === '') {
            setMessage({ type: 'error', text: `${field.fieldLabel} is required` });
            setLoading(false);
            return;
          }
        }
      }

      const submitData = new FormData();
      submitData.append('name', formData.name);
      submitData.append('regNo', formData.regNo);
      submitData.append('token', token || '');

      // Use pre-uploaded URL if available, otherwise send file as fallback
      if (photoUploadedUrl) {
        submitData.append('photoUrl', photoUploadedUrl);
      } else if (photo) {
        submitData.append('photo', photo);
      }

      Object.keys(formData).forEach(key => {
        if (key !== 'name' && key !== 'regNo' && formData[key] !== '') {
          submitData.append(key, formData[key]);
        }
      });

      setUploadProgress(0);
      await axios.post(`${API_URL}/players/register`, submitData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            setUploadProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
          }
        }
      });

      // Show success immediately (optimistic)
      setShowSuccess(true);
      setLoading(false);
      handleClearForm();
    } catch (error: any) {
      console.error('Registration error:', error);
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to register. Please try again.' });
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-amber-500 mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Validating registration link...</p>
        </div>
      </div>
    );
  }

  if (!linkValid) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-red-600 via-red-500 to-red-600 rounded-3xl blur opacity-15" />
            <div className="relative bg-slate-900/90 backdrop-blur-xl rounded-3xl border border-red-500/30 p-8 text-center shadow-2xl">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/15 mb-4">
                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-red-300 mb-3">Invalid Link</h2>
              <p className="text-sm text-gray-300 mb-6">{message?.text}</p>
              <button
                onClick={() => navigate('/')}
                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm font-medium text-white transition-colors"
              >
                Go back home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-start justify-center p-2 sm:p-3 lg:p-4">
      <div className="w-full max-w-2xl my-2">
        <div className="relative">
          {/* Premium Glow Effect */}
          <div className="absolute -inset-2 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 rounded-[2rem] blur-xl opacity-20 animate-pulse" />

          {/* Main Card */}
          <div className="relative bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-2xl border border-amber-500/20 rounded-3xl shadow-[0_32px_128px_rgba(251,191,36,0.15)] overflow-hidden flex flex-col max-h-[calc(100vh-60px)]">
            
            {/* Decorative Top Border */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent z-10" />

            {/* Ultra-Compact Header - Fixed at top */}
            <div className="relative flex-shrink-0 px-4 sm:px-6 pt-3 pb-2 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700/50">
              <div className="text-center space-y-1">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 via-amber-600 to-yellow-600 shadow-lg shadow-amber-500/40">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-base sm:text-lg lg:text-xl font-bold text-white">
                    {formConfig?.formTitle || 'Player Registration'}
                  </h1>
                  {auctioneerInfo && (
                    <p className="text-[10px] sm:text-xs text-slate-300">
                      For <span className="text-amber-400 font-bold">{auctioneerInfo.name}</span>'s Auction
                    </p>
                  )}
                  {formConfig?.formDescription && (
                    <p className="text-[9px] sm:text-[10px] text-slate-400 mt-0.5 max-w-xl mx-auto">
                      {formConfig.formDescription}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Form Body - Scrollable middle section */}
            <div className="relative flex-1 overflow-hidden flex flex-col min-h-0">
              {/* Error Message - Fixed position in the scrollable area */}
              {message && (
                <div className="flex-shrink-0 mx-4 sm:mx-6 mt-2.5 mb-1">
                  <div className="p-2.5 rounded-lg flex items-start gap-2 text-xs bg-red-500/10 border border-red-500/30 text-red-200">
                    <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <p className="font-semibold text-[11px] sm:text-xs">{message.text}</p>
                  </div>
                </div>
              )}

              {/* Scrollable Content */}
              <div className="flex-1 px-4 sm:px-6 py-3 overflow-y-auto luxury-scrollbar">
                <form onSubmit={handleSubmit} className="space-y-4 pb-2">
                  {loadingForm ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-amber-500 mx-auto mb-3" />
                      <p className="text-slate-400 text-sm">Loading form...</p>
                    </div>
                  ) : (
                    formConfig && (
                      <>
                        {/* Photo Upload - First */}
                        {formConfig.fields.find(f => f.fieldName === 'photo') && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 mb-2.5">
                              <div className="h-[1px] flex-grow bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
                              <h3 className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">
                                Player Photo
                              </h3>
                              <div className="h-[1px] flex-grow bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
                            </div>

                            <div className="space-y-2.5">
                              <label className="block text-xs font-semibold text-slate-200">
                                Upload Photo
                                {formConfig.fields.find(f => f.fieldName === 'photo')?.required && (
                                  <span className="text-red-400 ml-1">*</span>
                                )}
                              </label>
                              <div className="flex items-start gap-3">
                                <label className="relative flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-xl border-2 border-dashed border-slate-600/50 hover:border-amber-500/50 transition-all cursor-pointer overflow-hidden bg-slate-900/40 group">
                                  {photoPreview ? (
                                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 group-hover:text-amber-400 transition-colors">
                                      <svg className="w-6 h-6 sm:w-7 sm:h-7 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                      </svg>
                                      <span className="text-[9px] font-medium">Upload</span>
                                    </div>
                                  )}
                                  {photoUploading && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-xl">
                                      <div className="w-7 h-7 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                  )}
                                  {photoUploadedUrl && !photoUploading && (
                                    <div className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center border-2 border-gray-900">
                                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                    </div>
                                  )}
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handlePhotoChange}
                                    required={formConfig.fields.find(f => f.fieldName === 'photo')?.required}
                                    className="hidden"
                                  />
                                </label>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[10px] text-slate-400 mb-1.5">Upload a clear photo of the player</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 text-[9px] font-medium">
                                      JPG, PNG
                                    </span>
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 text-[9px] font-medium">
                                      Max 5MB
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Player Details Section */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 mb-2.5">
                            <div className="h-[1px] flex-grow bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
                            <h3 className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">
                              Player Details
                            </h3>
                            <div className="h-[1px] flex-grow bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {formConfig.fields
                              .filter(f => f.fieldName === 'name' || f.fieldName === 'regNo')
                              .sort((a, b) => a.order - b.order)
                              .map(field => (
                                <div key={field.fieldName} className="space-y-1.5">
                                  <label className="block text-xs font-semibold text-slate-200">
                                    {field.fieldLabel}
                                    {field.required && <span className="text-red-400 ml-1">*</span>}
                                  </label>
                                  <input
                                    type={field.fieldType}
                                    name={field.fieldName}
                                    value={formData[field.fieldName] || ''}
                                    onChange={handleInputChange}
                                    required={field.required}
                                    placeholder={field.placeholder}
                                    className="w-full px-3 py-2.5 bg-slate-900/60 border border-slate-600/50 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/60 focus:border-amber-500/60 transition-all hover:border-slate-500"
                                  />
                                </div>
                              ))}
                          </div>
                        </div>

                        {/* Additional Information */}
                        {formConfig.fields.filter(f => f.fieldName !== 'name' && f.fieldName !== 'regNo' && f.fieldName !== 'photo').length > 0 && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 mb-2.5">
                              <div className="h-[1px] flex-grow bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
                              <h3 className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">
                                Additional Information
                              </h3>
                              <div className="h-[1px] flex-grow bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                              {formConfig.fields
                                .filter(f => f.fieldName !== 'name' && f.fieldName !== 'regNo' && f.fieldName !== 'photo')
                                .sort((a, b) => a.order - b.order)
                                .map(field => {
                                  if (field.fieldType === 'select') {
                                    return (
                                      <div key={field.fieldName} className="space-y-1.5">
                                        <label className="block text-xs font-semibold text-slate-200">
                                          {field.fieldLabel}
                                          {field.required && <span className="text-red-400 ml-1">*</span>}
                                        </label>
                                        <div className="relative">
                                          <select
                                            name={field.fieldName}
                                            value={formData[field.fieldName] || ''}
                                            onChange={handleInputChange}
                                            required={field.required}
                                            className="w-full px-3 py-2.5 bg-slate-900/60 border border-slate-600/50 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/60 focus:border-amber-500/60 transition-all appearance-none hover:border-slate-500"
                                          >
                                            <option value="">Select {field.fieldLabel}</option>
                                            {field.options?.map(opt => (
                                              <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                          </select>
                                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  }

                                  if (field.fieldType === 'textarea') {
                                    return (
                                      <div key={field.fieldName} className="space-y-1.5">
                                        <label className="block text-xs font-semibold text-slate-200">
                                          {field.fieldLabel}
                                          {field.required && <span className="text-red-400 ml-1">*</span>}
                                        </label>
                                        <textarea
                                          name={field.fieldName}
                                          value={formData[field.fieldName] || ''}
                                          onChange={handleInputChange}
                                          required={field.required}
                                          placeholder={field.placeholder}
                                          rows={3}
                                          className="w-full px-3 py-2.5 bg-slate-900/60 border border-slate-600/50 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/60 focus:border-amber-500/60 transition-all hover:border-slate-500"
                                        />
                                      </div>
                                    );
                                  }

                                  return (
                                    <div key={field.fieldName} className="space-y-1.5">
                                      <label className="block text-xs font-semibold text-slate-200">
                                        {field.fieldLabel}
                                        {field.required && <span className="text-red-400 ml-1">*</span>}
                                      </label>
                                      <input
                                        type={field.fieldType}
                                        name={field.fieldName}
                                        value={formData[field.fieldName] || ''}
                                        onChange={handleInputChange}
                                        required={field.required}
                                        placeholder={field.placeholder}
                                        min={field.validation?.min}
                                        max={field.validation?.max}
                                        minLength={field.validation?.minLength}
                                        maxLength={field.validation?.maxLength}
                                        pattern={field.validation?.pattern}
                                        className="w-full px-3 py-2.5 bg-slate-900/60 border border-slate-600/50 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/60 focus:border-amber-500/60 transition-all hover:border-slate-500"
                                      />
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        )}
                      </>
                    )
                  )}
                </form>
              </div>
            </div>

            {/* Action Bar - Fixed at bottom */}
            <div className="flex-shrink-0 px-4 sm:px-6 py-2.5 bg-gradient-to-t from-slate-900 via-slate-900 to-slate-900/95 backdrop-blur-xl border-t border-amber-500/20 shadow-[0_-6px_24px_rgba(0,0,0,0.5)]">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={handleClearForm}
                    className="w-full sm:w-auto px-4 py-2 text-[11px] sm:text-xs font-semibold text-slate-300 border border-slate-700/80 rounded-lg hover:bg-slate-800/70 hover:text-white hover:border-slate-600 transition-all"
                  >
                    Clear form
                  </button>
                  <button
                    type="submit"
                    disabled={loading || photoUploading}
                    onClick={handleSubmit}
                    className="w-full sm:w-auto px-5 py-2 bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 hover:from-amber-500 hover:via-amber-400 hover:to-yellow-400 text-xs sm:text-sm font-bold text-white rounded-lg shadow-lg shadow-amber-500/40 transform transition-all hover:scale-[1.02] hover:shadow-amber-500/60 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Registering...
                      </span>
                    ) : (
                      'Register for auction'
                    )}
                  </button>
                </div>

                {/* Upload Progress Bar */}
                {loading && uploadProgress > 0 && (
                  <div className="mt-3">
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                      <span>Uploading...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-200"
                        style={{
                          width: `${uploadProgress}%`,
                          background: 'linear-gradient(90deg, #d97706, #f59e0b)'
                        }}
                      />
                    </div>
                  </div>
                )}
            </div>

            {/* Footer */}
            <div className="px-4 py-1.5 bg-slate-950/80 border-t border-slate-800/50">
              <p className="text-[8px] sm:text-[9px] text-center text-slate-500">
                🔒 Secure registration
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* OPTIMAL UX: TOP-CENTER SUCCESS NOTIFICATION */}
      {showSuccess && (
        <div className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 pt-6 pointer-events-none">
          <div className="pointer-events-auto animate-slideDown w-full max-w-md">
            {/* Outer Glow Container */}
            <div className="relative">
              {/* Premium Ambient Glow - Matching Registration Card */}
              <div className="absolute -inset-3 bg-gradient-to-r from-amber-500/40 via-yellow-500/40 to-amber-600/40 rounded-2xl blur-2xl animate-pulse" 
                   style={{ animationDuration: '3s' }} />
              
              {/* Main Notification Card */}
              <div className="relative bg-gradient-to-br from-slate-900/98 via-slate-800/98 to-slate-900/98 backdrop-blur-3xl rounded-2xl border border-amber-500/30 shadow-[0_24px_96px_rgba(251,191,36,0.25)] overflow-hidden">
                
                {/* Top Golden Accent Line */}
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
                
                {/* Content Container */}
                <div className="px-5 py-4">
                  <div className="flex items-start gap-4">
                    {/* Icon with Golden Accent */}
                    <div className="flex-shrink-0 pt-0.5">
                      <div className="relative">
                        {/* Icon Background Glow */}
                        <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-xl blur opacity-40" />
                        
                        {/* Icon Container - Matching Registration Page */}
                        <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 via-amber-600 to-yellow-600 flex items-center justify-center shadow-lg shadow-amber-500/40 ring-2 ring-amber-500/20 ring-offset-2 ring-offset-slate-900">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    
                    {/* Text Content */}
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <h3 className="text-base font-bold text-white tracking-tight mb-1.5 leading-tight">
                            Registration Successful!
                          </h3>
                          <p className="text-sm text-slate-300 leading-relaxed">
                            You're all set for the auction. Good luck!
                          </p>
                        </div>
                        
                        {/* Close Button */}
                        <button
                          onClick={() => setShowSuccess(false)}
                          className="flex-shrink-0 w-8 h-8 rounded-lg hover:bg-slate-700/50 flex items-center justify-center transition-all duration-200 group -mt-0.5"
                        >
                          <svg className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      
                      {/* Auto-Dismiss Progress Bar */}
                      <div className="mt-3 h-1 bg-slate-700/50 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 rounded-full animate-progressBar" 
                             style={{ animationDuration: '5s' }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Golden Accent Line */}
                <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Premium Styling */}
      <style>{`
        .luxury-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .luxury-scrollbar::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.6);
          border-radius: 100px;
        }
        .luxury-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #f59e0b 0%, #d97706 50%, #f59e0b 100%);
          border-radius: 100px;
        }
        .luxury-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #fbbf24 0%, #f59e0b 50%, #fbbf24 100%);
          box-shadow: 0 0 6px rgba(251, 191, 36, 0.5);
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-100%);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes progressBar {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }

        .animate-slideDown {
          animation: slideDown 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .animate-progressBar {
          animation: progressBar linear;
        }
      `}</style>
    </div>
  );
};

export default PlayerRegistrationPage;
