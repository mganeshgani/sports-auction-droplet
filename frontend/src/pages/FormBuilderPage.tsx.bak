import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

interface FormField {
  fieldName: string;
  fieldLabel: string;
  fieldType: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
  order: number;
}

interface Template {
  id: string;
  name: string;
  description: string;
  icon: string;
}

const FIELD_TYPES = [
  { value: 'text', label: 'Text', icon: '📝' },
  { value: 'number', label: 'Number', icon: '🔢' },
  { value: 'email', label: 'Email', icon: '📧' },
  { value: 'tel', label: 'Phone', icon: '📱' },
  { value: 'date', label: 'Date', icon: '📅' },
  { value: 'select', label: 'Dropdown', icon: '📋' },
  { value: 'textarea', label: 'Long Text', icon: '📄' },
  { value: 'file', label: 'File Upload', icon: '📎' },
];

const FormBuilderPage: React.FC = () => {
  const { isAuctioneer } = useAuth();
  const navigate = useNavigate();
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

  const [formTitle, setFormTitle] = useState('Player Registration');
  const [formDescription, setFormDescription] = useState('Fill in your details to register');
  const [fields, setFields] = useState<FormField[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [showAddField, setShowAddField] = useState(false);

  const templates: Template[] = [
    { id: 'custom', name: 'Custom', description: 'Start from scratch', icon: '✨' },
    { id: 'cricket', name: 'Cricket', description: 'Cricket tournament registration', icon: '🏏' },
    { id: 'football', name: 'Football', description: 'Football league registration', icon: '⚽' },
    { id: 'basketball', name: 'Basketball', description: 'Basketball team registration', icon: '🏀' },
  ];

  const fetchFormConfig = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/form-config`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFormTitle(response.data.formTitle);
      setFormDescription(response.data.formDescription);
      
      // Auto-fix regNo to be optional
      const updatedFields = response.data.fields.map((field: FormField) => 
        field.fieldName === 'regNo' ? { ...field, required: false } : field
      );
      setFields(updatedFields);
    } catch (error) {
      console.error('Error fetching form config:', error);
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [API_URL]);

  useEffect(() => {
    if (!isAuctioneer) {
      navigate('/login');
      return;
    }
    fetchFormConfig();
  }, [isAuctioneer, navigate, fetchFormConfig]);

  const addField = (type: string) => {
    // Smart defaults based on field type
    const fieldDefaults: Record<string, { name: string; label: string; placeholder: string }> = {
      text: { name: 'customText', label: 'Text Field', placeholder: 'Enter text here...' },
      number: { name: 'age', label: 'Age', placeholder: 'Enter age...' },
      email: { name: 'email', label: 'Email Address', placeholder: 'example@email.com' },
      tel: { name: 'phone', label: 'Phone Number', placeholder: '+1 (555) 000-0000' },
      date: { name: 'dateField', label: 'Date', placeholder: 'Select date...' },
      select: { name: 'category', label: 'Category', placeholder: 'Select an option...' },
      textarea: { name: 'notes', label: 'Additional Notes', placeholder: 'Enter additional information...' },
      file: { name: 'document', label: 'Upload Document', placeholder: 'Choose file...' },
    };

    const defaults = fieldDefaults[type] || { name: 'field', label: 'New Field', placeholder: 'Enter value...' };
    const timestamp = Date.now();

    const newField: FormField = {
      fieldName: `${defaults.name}_${timestamp}`,
      fieldLabel: defaults.label,
      fieldType: type,
      required: false,
      placeholder: defaults.placeholder,
      options: type === 'select' ? ['Option 1', 'Option 2', 'Option 3'] : [],
      order: fields.length + 1
    };
    setFields([...fields, newField]);
    setShowAddField(false);
  };

  const updateField = (index: number, updates: Partial<FormField>) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], ...updates };
    setFields(newFields);
  };

  const removeField = (index: number) => {
    const field = fields[index];
    if (['name', 'photo'].includes(field.fieldName)) {
      return;
    }
    setFields(fields.filter((_, i) => i !== index));
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
    const newFields = [...fields];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newFields.length) return;
    [newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]];
    setFields(newFields);
  };

  const handleSave = async () => {
    if (fields.length === 0) {
      return;
    }
    setSaving(true);
    
    // Navigate immediately for better UX
    navigate('/players');
    
    // Save in background
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/form-config`,
        { formTitle, formDescription, fields: fields.map((f, i) => ({ ...f, order: i + 1 })) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error: any) {
      console.error('Error saving form:', error);
      alert('Failed to save form configuration');
    } finally {
      setSaving(false);
    }
  };

  const loadTemplate = async (templateId: string) => {
    // Handle custom template - reset to default fields (instant)
    if (templateId === 'custom') {
      setFormTitle('Player Registration');
      setFormDescription('Fill in your details to register');
      setFields([
        { fieldName: 'photo', fieldLabel: 'Player Photo', fieldType: 'file', required: true, order: 1 },
        { fieldName: 'name', fieldLabel: 'Player Name', fieldType: 'text', required: true, placeholder: 'Enter full name', order: 2 },
        { fieldName: 'regNo', fieldLabel: 'Registration Number', fieldType: 'text', required: false, placeholder: 'Optional ID', order: 3 }
      ]);
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/form-config/load-template/${templateId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setFormTitle(response.data.formConfig.formTitle);
      setFormDescription(response.data.formConfig.formDescription);
      
      // Ensure regNo is always optional
      const updatedFields = response.data.formConfig.fields.map((field: FormField) => 
        field.fieldName === 'regNo' ? { ...field, required: false } : field
      );
      setFields(updatedFields);
    } catch (error: any) {
      console.error('Error loading template:', error);
      alert('Failed to load template');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
          <p className="text-slate-400">Loading form builder...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      
      {/* Header - Premium Rose-Gold & Black */}
      <div className="flex-shrink-0 bg-gradient-to-r from-rose-950 via-black to-rose-950 border-b border-rose-500/20 shadow-2xl shadow-rose-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 sm:py-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-1 h-6 sm:h-8 bg-gradient-to-b from-rose-400 via-pink-500 to-rose-600 rounded-full shadow-lg shadow-rose-500/50"></div>
              <div>
                <h1 className="text-base sm:text-lg lg:text-xl font-bold bg-gradient-to-r from-rose-300 via-pink-400 to-rose-400 bg-clip-text text-transparent tracking-wide">REGISTRATION DESIGNER</h1>
                <p className="text-[10px] sm:text-xs text-rose-400/50 tracking-wider mt-0.5 font-light hidden sm:block">Craft Your Elite Form</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <button
                onClick={() => navigate(-1)}
                className="flex-1 sm:flex-none px-3 sm:px-5 py-1.5 sm:py-2 bg-black/60 border border-rose-900/40 text-rose-200/70 hover:text-rose-300 hover:border-rose-600/50 hover:bg-rose-950/30 rounded-lg transition-all duration-300 font-medium text-xs sm:text-sm backdrop-blur-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 sm:flex-none px-4 sm:px-6 py-1.5 sm:py-2 bg-gradient-to-r from-rose-600 via-pink-500 to-rose-600 hover:from-rose-500 hover:via-pink-400 hover:to-rose-500 text-white font-bold rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-rose-900/60 hover:shadow-xl hover:shadow-rose-800/70 border border-rose-400/40 text-xs sm:text-sm"
              >
                {saving ? '⏳ Saving...' : '💾 Save'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto scrollbar-custom">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
            
            {/* Left Sidebar */}
            <div className="lg:col-span-3 space-y-3 sm:space-y-4 order-2 lg:order-1">
              
              {/* Form Settings */}
              <div className="bg-gradient-to-br from-slate-950 to-black rounded-xl border border-amber-800/30 p-3 sm:p-5 shadow-2xl shadow-amber-900/10">
                <h2 className="text-base sm:text-lg font-bold bg-gradient-to-r from-amber-300 via-orange-400 to-amber-400 bg-clip-text text-transparent mb-3 sm:mb-4 flex items-center gap-2">
                  <span className="text-lg sm:text-xl">⚙️</span>
                  Settings
                </h2>
                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-slate-400 mb-1.5 sm:mb-2">Form Title</label>
                    <input
                      type="text"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 bg-black/50 border border-amber-800/40 rounded-lg text-amber-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-amber-600/50 transition-all placeholder:text-slate-600"
                      placeholder="e.g., Player Registration"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-slate-400 mb-1.5 sm:mb-2">Description</label>
                    <textarea
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      rows={3}
                      className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 bg-black/50 border border-amber-800/40 rounded-lg text-amber-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-amber-600/50 resize-none transition-all placeholder:text-slate-600"
                      placeholder="Brief description..."
                    />
                  </div>
                </div>
              </div>

              {/* Templates */}
              <div className="bg-gradient-to-br from-slate-950 to-black rounded-xl border border-amber-800/30 p-3 sm:p-5 shadow-2xl shadow-amber-900/10">
                <h2 className="text-base sm:text-lg font-bold bg-gradient-to-r from-amber-300 via-orange-400 to-amber-400 bg-clip-text text-transparent mb-3 sm:mb-4 flex items-center gap-2">
                  <span className="text-lg sm:text-xl">📋</span>
                  Templates
                </h2>
                <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => loadTemplate(template.id)}
                      className="w-full text-left px-2 sm:px-3 py-2 sm:py-3 bg-black/50 hover:bg-amber-950/30 border border-amber-900/30 hover:border-amber-600/60 rounded-lg transition-all duration-300 group backdrop-blur-sm"
                    >
                      <div className="flex items-center gap-2 sm:gap-3">
                        <span className="text-xl sm:text-2xl">{template.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-amber-200 text-xs sm:text-sm group-hover:text-amber-300 transition-colors truncate">{template.name}</p>
                          <p className="text-[10px] sm:text-xs text-slate-500 truncate hidden sm:block">{template.description}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Tip */}
              <div className="bg-gradient-to-br from-orange-500/10 via-amber-500/10 to-orange-600/10 border border-orange-500/40 rounded-xl p-3 sm:p-4 shadow-lg shadow-orange-900/20 hidden sm:block">
                <div className="flex items-start gap-2 sm:gap-3">
                  <span className="text-xl sm:text-2xl">💡</span>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold bg-gradient-to-r from-orange-300 to-amber-400 bg-clip-text text-transparent mb-1">Pro Tip</h3>
                    <p className="text-[10px] sm:text-xs text-orange-100/70">Click "Add Field" to craft your form. Protected fields maintain form integrity.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="lg:col-span-9 space-y-3 sm:space-y-4 order-1 lg:order-2">
              
              {/* Header */}
              <div className="bg-gradient-to-br from-slate-950 to-black rounded-xl border border-yellow-600/40 p-3 sm:p-5 shadow-2xl shadow-yellow-900/20">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-yellow-200 via-amber-300 to-yellow-400 bg-clip-text text-transparent flex items-center gap-2">
                      <span className="text-xl sm:text-2xl">🎨</span>
                      Form Fields
                      <span className="ml-1 sm:ml-2 px-2 sm:px-2.5 py-0.5 bg-gradient-to-r from-yellow-500/30 to-amber-400/30 border border-yellow-500/50 text-yellow-300 rounded-lg text-xs sm:text-sm font-bold shadow-lg shadow-yellow-900/30">
                        {fields.length}
                      </span>
                    </h2>
                    <p className="text-xs sm:text-sm text-yellow-200/60 mt-0.5 sm:mt-1 hidden sm:block">Craft your elite registration</p>
                  </div>
                  <button
                    onClick={() => setShowAddField(!showAddField)}
                    className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-500 hover:from-yellow-400 hover:via-amber-300 hover:to-yellow-400 text-black font-extrabold rounded-lg shadow-lg shadow-yellow-900/60 hover:shadow-xl hover:shadow-yellow-800/70 transition-all duration-300 transform hover:scale-105 border border-yellow-400/50 text-sm"
                  >
                    ✨ Add Field
                  </button>
                </div>

                {/* Field Type Selector */}
                {showAddField && (
                  <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-yellow-700/40">
                    <p className="text-xs sm:text-sm font-medium text-yellow-300/80 mb-2 sm:mb-3">Select field type:</p>
                    <div className="grid grid-cols-4 sm:grid-cols-4 gap-2 sm:gap-3">
                      {FIELD_TYPES.map((type) => (
                        <button
                          key={type.value}
                          onClick={() => addField(type.value)}
                          className="flex flex-col items-center gap-1 sm:gap-2 p-2 sm:p-4 bg-black/50 hover:bg-yellow-900/20 border border-yellow-900/40 hover:border-yellow-500/70 rounded-lg transition-all duration-300 group backdrop-blur-sm shadow-lg hover:shadow-yellow-900/40"
                        >
                          <span className="text-xl sm:text-3xl group-hover:scale-110 transition-transform duration-300">{type.icon}</span>
                          <span className="text-[10px] sm:text-xs font-semibold text-yellow-100/70 group-hover:text-yellow-300 transition-colors">{type.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Fields List */}
              <div className="space-y-2 sm:space-y-3">
                {fields.length === 0 ? (
                  <div className="bg-gradient-to-br from-slate-950 to-black border-2 border-dashed border-yellow-700/50 rounded-xl p-10 sm:p-20 text-center shadow-2xl shadow-yellow-900/20">
                    <div className="text-4xl sm:text-6xl mb-3 sm:mb-4">📝</div>
                    <h3 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-yellow-200 to-amber-400 bg-clip-text text-transparent mb-2">No Fields Yet</h3>
                    <p className="text-yellow-200/60 mb-4 sm:mb-6 text-sm">Click "Add Field" above to craft your elite form</p>
                    <button
                      onClick={() => setShowAddField(true)}
                      className="px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-500 hover:from-yellow-400 hover:via-amber-300 hover:to-yellow-400 text-black font-extrabold rounded-lg shadow-lg shadow-yellow-900/60 hover:shadow-xl hover:shadow-yellow-800/70 transition-all duration-300 border border-yellow-400/50 text-sm"
                    >
                      ✨ Add First Field
                    </button>
                  </div>
                ) : (
                  fields.map((field, index) => {
                    const isProtected = ['name', 'photo'].includes(field.fieldName);
                    const isEditing = editingIndex === index;
                    const fieldType = FIELD_TYPES.find(t => t.value === field.fieldType);
                    
                    return (
                      <div
                        key={index}
                        className={`bg-gradient-to-br from-slate-950 to-black border rounded-xl overflow-hidden shadow-xl transition-all duration-300 ${
                          isEditing ? 'border-yellow-500 ring-2 ring-yellow-500/50 shadow-yellow-900/40' : 'border-yellow-900/30 hover:border-yellow-700/60 shadow-yellow-900/10'
                        }`}
                      >
                      {/* Field Header */}
                        <div className="p-3 sm:p-4 flex items-center justify-between bg-black/40 backdrop-blur-sm">
                          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                            <span className="text-lg sm:text-2xl">{fieldType?.icon}</span>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-xs sm:text-sm font-bold text-yellow-100 truncate">{field.fieldLabel}</h3>
                              <div className="flex items-center gap-1 sm:gap-2 mt-0.5 sm:mt-1 flex-wrap">
                                <span className="text-[10px] sm:text-xs text-yellow-500/70 font-mono truncate max-w-[80px] sm:max-w-none">{field.fieldName}</span>
                                {field.required && <span className="px-1.5 sm:px-2 py-0.5 bg-yellow-500/25 text-yellow-300 rounded text-[10px] sm:text-xs font-medium border border-yellow-500/40 shadow-sm">Required</span>}
                                {isProtected && <span className="px-1.5 sm:px-2 py-0.5 bg-cyan-400/20 text-cyan-300 rounded text-[10px] sm:text-xs font-medium border border-cyan-400/30 shadow-sm">System</span>}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setEditingIndex(isEditing ? null : index)}
                              className="p-2 hover:bg-yellow-900/30 rounded-lg text-yellow-400/70 hover:text-yellow-300 transition-all duration-300"
                              title="Edit"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => moveField(index, 'up')}
                              disabled={index === 0}
                              className="p-2 hover:bg-yellow-900/30 rounded-lg text-yellow-400/70 hover:text-yellow-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300"
                              title="Move up"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                              </svg>
                            </button>
                            <button
                              onClick={() => moveField(index, 'down')}
                              disabled={index === fields.length - 1}
                              className="p-2 hover:bg-yellow-900/30 rounded-lg text-yellow-400/70 hover:text-yellow-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300"
                              title="Move down"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                            <button
                              onClick={() => removeField(index)}
                              disabled={isProtected}
                              className="p-2 hover:bg-red-900/30 rounded-lg text-red-400/70 hover:text-red-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300"
                              title={isProtected ? 'Cannot remove system field' : 'Delete'}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        {/* Edit Panel - Simplified */}
                        {isEditing && (
                          <div className="p-3 sm:p-4 bg-black/40 border-t border-yellow-800/40 space-y-2 sm:space-y-3 backdrop-blur-sm">
                            <div>
                              <label className="block text-[10px] sm:text-xs font-medium text-yellow-300/80 mb-1 sm:mb-1.5">Field Label</label>
                              <input
                                type="text"
                                value={field.fieldLabel}
                                onChange={(e) => updateField(index, { fieldLabel: e.target.value })}
                                className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm bg-black/50 border border-yellow-700/50 rounded-lg text-yellow-100 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500/60 transition-all placeholder:text-slate-600"
                                placeholder="What should this field be called?"
                              />
                            </div>

                            {field.fieldType === 'select' && (
                              <div>
                                <label className="block text-[10px] sm:text-xs font-medium text-yellow-300/80 mb-1 sm:mb-1.5">Options (comma-separated)</label>
                                <input
                                  type="text"
                                  defaultValue={(field.options || []).join(', ')}
                                  onBlur={(e) => {
                                    const options = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                                    updateField(index, { options });
                                  }}
                                  className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm bg-black/50 border border-yellow-700/50 rounded-lg text-yellow-100 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500/60 transition-all placeholder:text-slate-600"
                                  placeholder="Option 1, Option 2, Option 3"
                                />
                              </div>
                            )}

                            <label className="flex items-center gap-2 p-2 sm:p-3 bg-yellow-900/15 border border-yellow-800/40 rounded-lg cursor-pointer hover:bg-yellow-900/25 hover:border-yellow-600/60 transition-all duration-300">
                              <input
                                type="checkbox"
                                checked={field.required}
                                onChange={(e) => updateField(index, { required: e.target.checked })}
                                disabled={isProtected}
                                className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded border-yellow-600 text-yellow-500 focus:ring-2 focus:ring-yellow-500 disabled:opacity-50 cursor-pointer bg-black/50"
                              />
                              <span className="text-xs sm:text-sm font-medium text-yellow-100/90">Make this field required</span>
                            </label>

                            <button
                              onClick={() => setEditingIndex(null)}
                              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-500 hover:from-yellow-400 hover:via-amber-300 hover:to-yellow-400 text-black font-extrabold rounded-lg transition-all duration-300 shadow-lg shadow-yellow-900/60 hover:shadow-xl hover:shadow-yellow-800/70 border border-yellow-400/50 text-xs sm:text-sm"
                            >
                              ✓ Done Editing
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormBuilderPage;