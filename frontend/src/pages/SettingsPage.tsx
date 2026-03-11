import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useDisplaySettings, MAX_SELECTABLE_ITEMS, getFieldIcon } from '../hooks/useDisplaySettings';
import ConfirmModal from '../components/ConfirmModal';

interface AppConfig {
  branding: {
    title: string;
    subtitle: string;
    logoUrl: string;
  };
}

const SettingsPage: React.FC = () => {
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
  const [, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [formData, setFormData] = useState({
    title: '',
    subtitle: ''
  });

  // Display settings hook - now dynamic with high priority support
  const { 
    displaySettings, 
    toggleSetting, 
    getSelectedCount, 
    getSelectableFields, 
    highPriorityField,
    setHighPriority,
    loading: displayLoading 
  } = useDisplaySettings();

  const fetchConfig = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/config`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConfig(response.data.data);
      setFormData({
        title: response.data.data.branding.title,
        subtitle: response.data.data.branding.subtitle
      });
      setLogoPreview(response.data.data.branding.logoUrl);
    } catch (error) {
      console.error('Error fetching config:', error);
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const token = localStorage.getItem('token');
      const submitData = new FormData();
      submitData.append('title', formData.title);
      submitData.append('subtitle', formData.subtitle);
      if (logoFile) {
        submitData.append('logo', logoFile);
      }

      const response = await axios.put(`${API_URL}/config`, submitData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Update branding cache so Layout picks it up instantly
      if (response.data?.data?.branding) {
        const b = response.data.data.branding;
        localStorage.setItem('brandingConfig', JSON.stringify({
          title: b.title || 'SPORTS AUCTION',
          subtitle: b.subtitle || '',
          logoUrl: b.logoUrl || '/logo.png'
        }));
        sessionStorage.removeItem('brandingFetched');
        window.dispatchEvent(new Event('brandingUpdated'));
      }

      toast.success('Settings saved successfully!');
      fetchConfig();
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleReset = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(`${API_URL}/config`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Update branding cache with reset defaults
      if (response.data?.data?.branding) {
        const b = response.data.data.branding;
        localStorage.setItem('brandingConfig', JSON.stringify({
          title: b.title || 'SPORTS AUCTION',
          subtitle: b.subtitle || '',
          logoUrl: b.logoUrl || '/logo.png'
        }));
        sessionStorage.removeItem('brandingFetched');
        window.dispatchEvent(new Event('brandingUpdated'));
      }

      toast.success('Settings reset to defaults!');
      fetchConfig();
    } catch (error) {
      console.error('Error resetting config:', error);
      toast.error('Error resetting settings');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto"></div>
          <p className="mt-4 text-slate-400">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-3 sm:p-4">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* ─── SECTION 1: BRANDING ─── */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-7 rounded-full" style={{ background: 'linear-gradient(to bottom, #D4AF37, #a08520)' }}></div>
            <h1 className="text-lg sm:text-xl font-bold text-white">Branding</h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full text-slate-400" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>Appearance</span>
          </div>

          <form onSubmit={handleSubmit} className="rounded-2xl overflow-hidden" style={{
            background: 'rgba(15, 18, 28, 0.85)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
          }}>
            <div className="p-4 sm:p-6 space-y-5">

              {/* Logo Upload — Click-to-upload zone */}
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-2 block">Logo</label>
                <div className="flex items-center gap-4">
                  <label className="cursor-pointer group relative flex-shrink-0">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setLogoFile(file);
                          const reader = new FileReader();
                          reader.onloadend = () => setLogoPreview(reader.result as string);
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden flex items-center justify-center transition-all duration-200 group-hover:border-amber-400/60" style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '2px dashed rgba(212, 175, 55, 0.3)',
                      padding: '4px'
                    }}>
                      {logoPreview ? (
                        <img src={logoPreview} alt="Logo" className="w-full h-full object-contain rounded-lg" />
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-slate-500">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                          </svg>
                        </div>
                      )}
                    </div>
                    {/* Hover overlay */}
                    <div className="absolute inset-0 rounded-xl bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                  </label>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-400">Click the box to upload</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Square image recommended. PNG, JPG, or SVG up to 5 MB.</p>
                    {logoPreview && (
                      <button
                        type="button"
                        onClick={() => { setLogoPreview(''); setLogoFile(null); }}
                        className="text-[10px] text-red-400 hover:text-red-300 mt-1.5 transition-colors"
                      >Remove logo</button>
                    )}
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}></div>

              {/* Title & Subtitle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="title" className="text-xs font-semibold text-slate-300 mb-1.5 block">Title <span className="text-red-400">*</span></label>
                  <input
                    id="title"
                    type="text"
                    required
                    maxLength={50}
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm rounded-lg text-white placeholder-slate-500 transition-all focus:outline-none"
                    placeholder="e.g., SPORTS AUCTION"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.1)'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.5)';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(212, 175, 55, 0.08)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                  <p className="text-[10px] text-slate-500 mt-1 text-right">
                    <span className={formData.title.length > 40 ? 'text-amber-500' : ''}>{formData.title.length}</span>/50
                  </p>
                </div>

                <div>
                  <label htmlFor="subtitle" className="text-xs font-semibold text-slate-300 mb-1.5 block">Organisation <span className="text-red-400">*</span></label>
                  <input
                    id="subtitle"
                    type="text"
                    required
                    maxLength={100}
                    value={formData.subtitle}
                    onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm rounded-lg text-white placeholder-slate-500 transition-all focus:outline-none"
                    placeholder="e.g., Your Organisation Name"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.1)'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.5)';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(212, 175, 55, 0.08)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                  <p className="text-[10px] text-slate-500 mt-1 text-right">
                    <span className={formData.subtitle.length > 80 ? 'text-amber-500' : ''}>{formData.subtitle.length}</span>/100
                  </p>
                </div>
              </div>

              {/* Live Preview */}
              <div className="rounded-xl p-3.5" style={{
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.06)'
              }}>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-2.5">Header Preview</p>
                <div className="flex items-center gap-3">
                  {logoPreview && (
                    <div className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 p-0.5" style={{
                      border: '1.5px solid rgba(212, 175, 55, 0.3)',
                    }}>
                      <img src={logoPreview} alt="Preview" className="w-full h-full object-contain rounded-md" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <h2 className="text-sm sm:text-base font-bold truncate" style={{ color: '#D4AF37' }}>
                      {formData.title || 'SPORTS AUCTION'}
                    </h2>
                    <p className="text-[10px] text-slate-400 truncate">
                      {formData.subtitle || 'Your Organisation Name'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(true)}
                  disabled={saving}
                  className="px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 flex items-center gap-1.5"
                  style={{
                    background: 'rgba(239, 68, 68, 0.08)',
                    color: '#f87171',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    backdropFilter: 'blur(8px)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.16)';
                    e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                    e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)';
                  }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Reset
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 text-xs font-bold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{
                    background: 'rgba(212, 175, 55, 0.15)',
                    color: '#fcd34d',
                    border: '1px solid rgba(212, 175, 55, 0.3)',
                    backdropFilter: 'blur(8px)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(212, 175, 55, 0.25)';
                    e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.5)';
                    e.currentTarget.style.boxShadow = '0 0 20px rgba(212, 175, 55, 0.12)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(212, 175, 55, 0.15)';
                    e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.3)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {saving ? (
                    <>
                      <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </section>

        {/* ─── SECTION 2: PLAYER CARD DISPLAY ─── */}
        <section className="rounded-2xl overflow-hidden" style={{
          background: 'rgba(15, 18, 28, 0.85)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
        }}>
          {/* Section Header */}
          <div className="px-4 sm:px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{
                background: 'rgba(212, 175, 55, 0.1)',
                border: '1px solid rgba(212, 175, 55, 0.2)'
              }}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="#D4AF37" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Player Card Display</h2>
                <p className="text-[10px] text-slate-500">Choose which fields appear on player cards</p>
              </div>
            </div>
            {!displayLoading && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{
                background: getSelectedCount() >= MAX_SELECTABLE_ITEMS ? 'rgba(212, 175, 55, 0.12)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${getSelectedCount() >= MAX_SELECTABLE_ITEMS ? 'rgba(212, 175, 55, 0.3)' : 'rgba(255,255,255,0.08)'}`
              }}>
                <span className="text-xs font-bold" style={{ color: getSelectedCount() >= MAX_SELECTABLE_ITEMS ? '#D4AF37' : '#94a3b8' }}>
                  {getSelectedCount()}/{MAX_SELECTABLE_ITEMS}
                </span>
              </div>
            )}
          </div>

          <div className="p-4 sm:p-6">
            {displayLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Always-visible fields */}
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-2 px-0.5">Always shown</p>
                  <div className="space-y-1.5">
                    {[{ icon: '📷', label: 'Player Photo' }, { icon: '👤', label: 'Player Name' }].map((f) => (
                      <div key={f.label} className="flex items-center justify-between px-3 py-2.5 rounded-lg" style={{
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.04)'
                      }}>
                        <div className="flex items-center gap-2.5">
                          <span className="text-base">{f.icon}</span>
                          <span className="text-sm text-slate-400">{f.label}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.04)' }}>Fixed</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Selectable fields */}
                {getSelectableFields().length > 0 && (
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-2 px-0.5">
                      Optional fields <span className="normal-case text-slate-600">(select up to {MAX_SELECTABLE_ITEMS})</span>
                    </p>
                    <div className="space-y-1.5">
                      {getSelectableFields().map((field) => {
                        const isSelected = displaySettings[field.fieldName] === true;
                        const canSelect = isSelected || getSelectedCount() < MAX_SELECTABLE_ITEMS;
                        const isPrimary = highPriorityField === field.fieldName;
                        
                        return (
                          <div
                            key={field.fieldName}
                            className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200 ${!canSelect && !isSelected ? 'opacity-40' : ''}`}
                            style={{
                              background: isSelected ? 'rgba(212, 175, 55, 0.06)' : 'rgba(255,255,255,0.02)',
                              border: `1px solid ${isSelected ? 'rgba(212, 175, 55, 0.2)' : 'rgba(255,255,255,0.04)'}`
                            }}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="text-base flex-shrink-0">{getFieldIcon(field.fieldName, field.fieldType)}</span>
                              <span className={`text-sm truncate ${isSelected ? 'text-white font-medium' : 'text-slate-400'}`}>{field.fieldLabel}</span>
                              {/* Inline primary star — only show for enabled fields */}
                              {isSelected && (
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); setHighPriority(isPrimary ? null : field.fieldName); }}
                                  className="flex-shrink-0 transition-all duration-200"
                                  title={isPrimary ? 'Remove primary highlight' : 'Set as primary field (gold accent on cards)'}
                                >
                                  {isPrimary ? (
                                    <svg className="w-4 h-4 text-amber-400 drop-shadow-[0_0_4px_rgba(212,175,55,0.6)]" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                    </svg>
                                  ) : (
                                    <svg className="w-4 h-4 text-slate-600 hover:text-amber-400/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                    </svg>
                                  )}
                                </button>
                              )}
                            </div>
                            {/* Toggle */}
                            <button
                              type="button"
                              onClick={() => toggleSetting(field.fieldName)}
                              disabled={!canSelect && !isSelected}
                              className={`w-11 h-6 rounded-full relative transition-all duration-300 flex-shrink-0 ml-3 ${
                                !canSelect && !isSelected ? 'cursor-not-allowed' : 'cursor-pointer'
                              }`}
                              style={{
                                background: isSelected
                                  ? 'linear-gradient(135deg, #d4af37, #f0d770)'
                                  : 'rgba(255,255,255,0.08)'
                              }}
                            >
                              <span
                                className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-300"
                                style={{ left: isSelected ? '22px' : '2px' }}
                              />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Tip */}
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg" style={{
                  background: 'rgba(59, 130, 246, 0.05)',
                  border: '1px solid rgba(59, 130, 246, 0.12)'
                }}>
                  <svg className="w-3.5 h-3.5 text-blue-400/70 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-[11px] text-slate-500">
                    Click the <span className="text-amber-400">★</span> star next to an enabled field to highlight it with a gold accent on cards. Fields are loaded from Form Builder. Changes save automatically.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
      <ConfirmModal
        open={showResetConfirm}
        title="Reset Settings?"
        message="This will reset all settings to their defaults. Are you sure?"
        confirmLabel="Reset"
        variant="warning"
        onConfirm={() => {
          setShowResetConfirm(false);
          handleReset();
        }}
        onCancel={() => setShowResetConfirm(false)}
      />
    </div>
  );
};

export default SettingsPage;
