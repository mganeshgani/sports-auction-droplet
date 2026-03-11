import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { Player } from '../types';
import { toast } from 'react-toastify';
import { clearCache } from '../services/api';

// Upload status types for detailed progress tracking
type UploadStatus = 'idle' | 'validating' | 'uploading' | 'processing' | 'success' | 'error';

interface UploadProgress {
  status: UploadStatus;
  progress: number;
  message: string;
}

interface FormField {
  fieldName: string;
  fieldLabel: string;
  fieldType: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
  order: number;
}

interface EditPlayerModalProps {
  player: Player | null;
  onClose: () => void;
  onSuccess: () => void;
}

const EditPlayerModal: React.FC<EditPlayerModalProps> = ({ player, onClose, onSuccess }) => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [formFields, setFormFields] = useState<FormField[]>([
    { fieldName: 'name', fieldLabel: 'Player Name', fieldType: 'text', required: true, placeholder: 'Enter full name', order: 1 },
    { fieldName: 'regNo', fieldLabel: 'Registration Number', fieldType: 'text', required: false, placeholder: 'Auto-generated if empty', order: 2 },
    { fieldName: 'class', fieldLabel: 'Class', fieldType: 'text', required: true, placeholder: 'Enter class', order: 3 },
    { fieldName: 'position', fieldLabel: 'Position', fieldType: 'text', required: true, placeholder: 'Enter position', order: 4 },
    { fieldName: 'photo', fieldLabel: 'Player Photo', fieldType: 'file', required: true, order: 5 }
  ]);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>(player?.photoUrl || '');
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoUploadedUrl, setPhotoUploadedUrl] = useState<string>('');
  const [photoUploadError, setPhotoUploadError] = useState<string>('');
  const photoAbortRef = useRef<AbortController | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    status: 'idle',
    progress: 0,
    message: ''
  });

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
  const isAddMode = !player;

  const fetchFormConfig = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/form-config`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const fields = response.data.fields || [];
      if (fields.length > 0) {
        setFormFields(fields);
      }
    } catch (error) {
      console.error('Error fetching form config:', error);
      // Keep using default fields on error
    }
  }, [API_URL]);

  // Initialize form data immediately and fetch config in background
  useEffect(() => {
    const initialData: Record<string, any> = {
      name: player?.name || '',
      regNo: player?.regNo || '',
      class: player?.class || '',
      position: player?.position || ''
    };
    setFormData(initialData);
    
    // Fetch form config in background (non-blocking)
    fetchFormConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally empty - only run once on mount

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      setPhotoUploadError('');
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Eagerly upload photo immediately
      const token = localStorage.getItem('token');
      const uploadData = new FormData();
      uploadData.append('photo', file);

      // Cancel any previous upload
      if (photoAbortRef.current) photoAbortRef.current.abort();
      const abortController = new AbortController();
      photoAbortRef.current = abortController;

      setPhotoUploading(true);
      setPhotoUploadedUrl('');

      axios.post(`${API_URL}/players/upload-photo`, uploadData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
        signal: abortController.signal
      })
        .then(res => {
          setPhotoUploadedUrl(res.data.url);
          setPhotoUploading(false);
          toast.success('Photo uploaded!', { autoClose: 1500 });
        })
        .catch(err => {
          if (axios.isCancel(err)) return;
          console.error('Eager photo upload failed:', err);
          setPhotoUploadError('Photo upload failed — will retry on save');
          setPhotoUploading(false);
        });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setUploadProgress({ status: 'validating', progress: 10, message: 'Validating form...' });

    // Validate photo for add mode only if photo field is required
    const photoField = formFields.find(f => f.fieldName === 'photo');
    if (isAddMode && photoField?.required && !photo) {
      setError('Please upload a player photo');
      setLoading(false);
      setUploadProgress({ status: 'idle', progress: 0, message: '' });
      return;
    }

    try {
      const token = localStorage.getItem('token');
      
      // Prepare form data with all dynamic fields
      const submitData = new FormData();
      
      // Add all form fields except photo
      Object.keys(formData).forEach(key => {
        if (key !== 'photo' && formData[key]) {
          submitData.append(key, formData[key]);
        }
      });

      // If photo was pre-uploaded, send the URL; otherwise send the file as fallback
      if (photoUploadedUrl) {
        submitData.append('photoUrl', photoUploadedUrl);
        setUploadProgress({ status: 'uploading', progress: 50, message: 'Saving player...' });
      } else if (photo) {
        submitData.append('photo', photo);
        setUploadProgress({ status: 'uploading', progress: 20, message: 'Uploading photo...' });
      } else {
        setUploadProgress({ status: 'uploading', progress: 50, message: 'Saving player...' });
      }

      // Clear cache before making API calls
      clearCache();

      if (isAddMode) {
        // Show progress in modal - don't close yet
        setUploadProgress({ status: 'uploading', progress: 40, message: 'Creating player record...' });
        
        try {
          // Make the API call with progress tracking
          const response = await axios.post(`${API_URL}/players`, submitData, {
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data'
            },
            onUploadProgress: (progressEvent) => {
              if (progressEvent.total) {
                const percentCompleted = Math.round((progressEvent.loaded * 50) / progressEvent.total) + 30;
                setUploadProgress({ 
                  status: 'uploading', 
                  progress: Math.min(percentCompleted, 80), 
                  message: photo ? 'Uploading photo...' : 'Saving...' 
                });
              }
            }
          });
          
          setUploadProgress({ status: 'processing', progress: 90, message: 'Finalizing...' });
          
          // Success - show completion and close
          setUploadProgress({ status: 'success', progress: 100, message: 'Player added!' });
          toast.success(`✅ ${response.data.name} added successfully!`, { autoClose: 2000 });
          
          // Short delay to show success state, then close and refresh
          setTimeout(() => {
            onClose();
            onSuccess();
          }, 500);
        } catch (err: any) {
          console.error('Error adding player:', err);
          const errorMessage = err.response?.data?.error || 'Failed to add player. Please try again.';
          setError(errorMessage);
          setUploadProgress({ status: 'error', progress: 0, message: errorMessage });
          toast.error(errorMessage, { autoClose: 3000 });
          setLoading(false);
        }
      } else {
        // Edit mode - update existing player
        setUploadProgress({ status: 'uploading', progress: 40, message: 'Updating player...' });
        
        try {
          await axios.put(`${API_URL}/players/${player._id}`, submitData, {
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data'
            },
            onUploadProgress: (progressEvent) => {
              if (progressEvent.total) {
                const percentCompleted = Math.round((progressEvent.loaded * 50) / progressEvent.total) + 30;
                setUploadProgress({ 
                  status: 'uploading', 
                  progress: Math.min(percentCompleted, 80), 
                  message: 'Updating...' 
                });
              }
            }
          });
          
          setUploadProgress({ status: 'success', progress: 100, message: 'Player updated!' });
          toast.success('Player updated successfully!', { autoClose: 2000 });
          
          setTimeout(() => {
            onClose();
            onSuccess();
          }, 500);
        } catch (err: any) {
          console.error('Error updating player:', err);
          const errorMessage = err.response?.data?.error || 'Failed to update player. Please try again.';
          setError(errorMessage);
          setUploadProgress({ status: 'error', progress: 0, message: errorMessage });
          toast.error(errorMessage, { autoClose: 3000 });
          setLoading(false);
        }
      }
    } catch (err: any) {
      console.error('Submit error:', err);
      const errorMessage = err.response?.data?.error || 'Failed to prepare submission. Please try again.';
      setError(errorMessage);
      setUploadProgress({ status: 'error', progress: 0, message: errorMessage });
      toast.error(errorMessage);
      setLoading(false);
    }
  };

  const renderField = (field: FormField) => {
    // Skip photo field - it's handled separately
    if (field.fieldType === 'file') {
      return null;
    }

    const value = formData[field.fieldName] || '';

    switch (field.fieldType) {
      case 'select':
        return (
          <div key={field.fieldName}>
            <label className="block text-sm font-bold text-gray-300 mb-2">
              {field.fieldLabel} {field.required && <span className="text-red-400">*</span>}
            </label>
            <select
              name={field.fieldName}
              value={value}
              onChange={handleInputChange}
              required={field.required}
              className="w-full px-4 py-3 bg-slate-900/60 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-amber-500 transition-colors"
            >
              <option value="">Select {field.fieldLabel}</option>
              {field.options?.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
        );
      
      case 'textarea':
        return (
          <div key={field.fieldName}>
            <label className="block text-sm font-bold text-gray-300 mb-2">
              {field.fieldLabel} {field.required && <span className="text-red-400">*</span>}
            </label>
            <textarea
              name={field.fieldName}
              value={value}
              onChange={handleInputChange}
              required={field.required}
              placeholder={field.placeholder}
              rows={3}
              className="w-full px-4 py-3 bg-slate-900/60 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-amber-500 transition-colors resize-none"
            />
          </div>
        );
      
      default: // text, number, email, etc.
        return (
          <div key={field.fieldName}>
            <label className="block text-sm font-bold text-gray-300 mb-2">
              {field.fieldLabel} {field.required && <span className="text-red-400">*</span>}
            </label>
            <input
              type={field.fieldType}
              name={field.fieldName}
              value={value}
              onChange={handleInputChange}
              required={field.required}
              placeholder={field.placeholder || ''}
              className="w-full px-4 py-3 bg-slate-900/60 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl sm:rounded-2xl border border-amber-500/30 p-4 sm:p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-black" style={{
            background: 'linear-gradient(135deg, #FFFFFF 0%, #F0D770 50%, #D4AF37 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            {isAddMode ? 'Add Player' : 'Edit Player'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          {/* Photo Upload - Check if photo field exists in form config */}
          {formFields.some(f => f.fieldType === 'file') && (
            <div>
              <label className="block text-xs sm:text-sm font-bold text-gray-300 mb-1.5 sm:mb-2">
                Player Photo {formFields.find(f => f.fieldType === 'file')?.required && isAddMode && <span className="text-red-400">*</span>}
              </label>
              <div className="flex items-center gap-3 sm:gap-4">
                {photoPreview ? (
                  <div className="relative">
                    <img 
                      src={photoPreview} 
                      alt="Preview" 
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-4 border-amber-500/50"
                    />
                    {photoUploading && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60">
                        <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                    {photoUploadedUrl && !photoUploading && (
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center border-2 border-gray-900">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                      </div>
                    )}
                    {photoUploadError && !photoUploading && (
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center border-2 border-gray-900" title={photoUploadError}>
                        <span className="text-[10px] font-bold text-white">!</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gray-700 flex items-center justify-center text-2xl sm:text-3xl text-gray-400">
                    👤
                  </div>
                )}
                <label className="flex-1 cursor-pointer">
                  <div className="px-3 sm:px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-center text-xs sm:text-sm font-semibold text-white transition-colors">
                    {photo ? 'Change Photo' : isAddMode ? 'Upload Photo' : 'Update Photo'}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>
              </div>
              {formFields.find(f => f.fieldType === 'file')?.required && isAddMode && !photoPreview && (
                <p className="text-[10px] sm:text-xs text-gray-400 mt-1">Photo is required for new players</p>
              )}
            </div>
          )}

          {/* Render all dynamic fields */}
          {formFields.sort((a, b) => a.order - b.order).map(field => renderField(field))}

          {error && (
            <div className="bg-red-500/20 border border-red-500/40 rounded-lg p-2.5 sm:p-3 text-red-300 text-xs sm:text-sm">
              {error}
            </div>
          )}

          {/* Upload Progress Indicator */}
          {loading && uploadProgress.status !== 'idle' && (
            <div className="rounded-lg p-3 sm:p-4" style={{
              background: uploadProgress.status === 'error' 
                ? 'rgba(239, 68, 68, 0.15)' 
                : uploadProgress.status === 'success' 
                ? 'rgba(16, 185, 129, 0.15)' 
                : 'rgba(99, 102, 241, 0.15)',
              border: `1px solid ${uploadProgress.status === 'error' 
                ? 'rgba(239, 68, 68, 0.3)' 
                : uploadProgress.status === 'success' 
                ? 'rgba(16, 185, 129, 0.3)' 
                : 'rgba(99, 102, 241, 0.3)'}`
            }}>
              <div className="flex items-center gap-3 mb-2">
                {uploadProgress.status === 'success' ? (
                  <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                ) : uploadProgress.status === 'error' ? (
                  <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                ) : (
                  <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                )}
                <span className={`text-sm font-medium ${
                  uploadProgress.status === 'error' ? 'text-red-400' : 
                  uploadProgress.status === 'success' ? 'text-green-400' : 'text-indigo-400'
                }`}>
                  {uploadProgress.message}
                </span>
              </div>
              {uploadProgress.status !== 'error' && (
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-300 ease-out"
                    style={{
                      width: `${uploadProgress.progress}%`,
                      background: uploadProgress.status === 'success' 
                        ? 'linear-gradient(90deg, #10b981, #059669)'
                        : 'linear-gradient(90deg, #6366f1, #8b5cf6)'
                    }}
                  />
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 sm:gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold text-white text-sm sm:text-base transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || uploadProgress.status === 'success' || photoUploading}
              className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 disabled:from-gray-600 disabled:to-gray-700 rounded-lg font-bold text-white text-sm sm:text-base transition-all duration-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>
                    {uploadProgress.status === 'validating' && 'Validating...'}
                    {uploadProgress.status === 'uploading' && (photo ? 'Uploading...' : 'Saving...')}
                    {uploadProgress.status === 'processing' && 'Processing...'}
                    {uploadProgress.status === 'success' && 'Done!'}
                    {uploadProgress.status === 'error' && 'Failed'}
                  </span>
                </>
              ) : uploadProgress.status === 'success' ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Done!</span>
                </>
              ) : (
                isAddMode ? 'Add Player' : 'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditPlayerModal;
