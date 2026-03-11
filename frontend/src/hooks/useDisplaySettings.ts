import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

// Form field interface from form builder
export interface FormField {
  fieldName: string;
  fieldLabel: string;
  fieldType: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
  order: number;
}

// Enabled field with optional high priority flag
export interface EnabledField {
  fieldName: string;
  fieldLabel: string;
  isHighPriority?: boolean;
}

// Display settings - dynamic based on form fields
export interface DisplaySettings {
  [key: string]: boolean;
}

export const STORAGE_KEY = 'auctionDisplaySettings';
export const HIGH_PRIORITY_KEY = 'auctionHighPriorityField';
export const MAX_SELECTABLE_ITEMS = 3; // 3 selectable fields (name and photo are always shown)

// Core fields that are always shown (fixed, not configurable)
export const FIXED_FIELDS: (FormField & { fixed: boolean })[] = [
  { fieldName: 'photoUrl', fieldLabel: 'Player Photo', fieldType: 'file', required: false, order: -2, fixed: true },
  { fieldName: 'name', fieldLabel: 'Player Name', fieldType: 'text', required: true, order: -1, fixed: true },
];

// Get field icon based on field type or name
export const getFieldIcon = (fieldName: string, fieldType: string): string => {
  const iconMap: Record<string, string> = {
    photoUrl: '📷',
    name: '👤',
    regNo: '🔢',
    class: '📚',
    position: '🎯',
    email: '📧',
    phone: '📱',
    tel: '📱',
    age: '🎂',
    date: '📅',
    number: '🔢',
    text: '📝',
    select: '📋',
    textarea: '📄',
  };
  
  return iconMap[fieldName] || iconMap[fieldType] || '📋';
};

export const useDisplaySettings = () => {
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [displaySettings, setDisplaySettings] = useState<DisplaySettings>({ name: true });
  const [highPriorityField, setHighPriorityField] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const initialLoadComplete = useRef(false); // Track if initial load is done
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

  // Fetch form config to get all available fields
  const fetchFormConfig = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        initialLoadComplete.current = true;
        return;
      }
      
      const response = await axios.get(`${API_URL}/form-config`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const fields: FormField[] = response.data.fields || [];
      setFormFields(fields);
      
      // Load saved settings from localStorage
      const saved = localStorage.getItem(STORAGE_KEY);
      let savedSettings: DisplaySettings = {};
      
      if (saved) {
        try {
          savedSettings = JSON.parse(saved);
        } catch (e) {
          console.error('Error parsing saved display settings:', e);
        }
      }
      
      // Load high priority field from localStorage
      const savedHighPriority = localStorage.getItem(HIGH_PRIORITY_KEY);
      if (savedHighPriority) {
        setHighPriorityField(savedHighPriority);
      }
      
      // Build default settings - name and photo always true (fixed)
      const defaultSettings: DisplaySettings = { name: true, photoUrl: true };
      
      // Now build the settings - only auto-enable if NO saved settings exist for any field
      const hasSavedSettings = fields.some(f => 
        f.fieldName !== 'name' && f.fieldName !== 'photoUrl' && 
        savedSettings[f.fieldName] !== undefined
      );
      
      let autoEnableCount = 0;
      fields.forEach((field) => {
        if (field.fieldName !== 'name' && field.fieldName !== 'photoUrl' && field.fieldType !== 'file') {
          if (savedSettings[field.fieldName] !== undefined) {
            // Use saved value
            defaultSettings[field.fieldName] = savedSettings[field.fieldName];
          } else if (!hasSavedSettings) {
            // Only auto-enable if this is first time (no saved settings exist)
            const shouldEnable = autoEnableCount < MAX_SELECTABLE_ITEMS;
            defaultSettings[field.fieldName] = shouldEnable;
            if (shouldEnable) autoEnableCount++;
          } else {
            // New field added after initial setup - default to false
            defaultSettings[field.fieldName] = false;
          }
        }
      });
      
      setDisplaySettings({ ...defaultSettings, name: true, photoUrl: true });
      
      // Mark initial load as complete AFTER setting the display settings
      initialLoadComplete.current = true;
    } catch (error) {
      console.error('Error fetching form config for display settings:', error);
      // Set basic defaults if fetch fails (name and photo always true)
      setDisplaySettings({
        name: true,
        photoUrl: true
      });
      initialLoadComplete.current = true;
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  useEffect(() => {
    fetchFormConfig();
  }, [fetchFormConfig]);

  // Save to localStorage whenever settings change - BUT only after initial load
  useEffect(() => {
    // Don't save until initial load is complete to avoid overwriting saved settings
    if (!initialLoadComplete.current) {
      return;
    }
    
    if (Object.keys(displaySettings).length > 1) { // More than just { name: true }
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...displaySettings, name: true, photoUrl: true }));
    }
  }, [displaySettings]);

  // Save high priority field to localStorage
  useEffect(() => {
    if (!initialLoadComplete.current) {
      return;
    }
    
    if (highPriorityField) {
      localStorage.setItem(HIGH_PRIORITY_KEY, highPriorityField);
    } else {
      localStorage.removeItem(HIGH_PRIORITY_KEY);
    }
  }, [highPriorityField]);

  // Set high priority field (must be an enabled field)
  const setHighPriority = useCallback((fieldName: string | null) => {
    if (fieldName && displaySettings[fieldName]) {
      setHighPriorityField(fieldName);
    } else {
      setHighPriorityField(null);
    }
  }, [displaySettings]);

  // Count currently selected items (excluding fixed fields: name and photo)
  // Only count fields that are actually in the selectable fields list
  const getSelectedCount = useCallback((): number => {
    const selectableFieldNames = formFields
      .filter(f => f.fieldName !== 'name' && f.fieldName !== 'photoUrl' && f.fieldType !== 'file')
      .map(f => f.fieldName);
    
    return Object.entries(displaySettings)
      .filter(([key, value]) => selectableFieldNames.includes(key) && value === true)
      .length;
  }, [displaySettings, formFields]);

  // Toggle a setting (with max limit check)
  const toggleSetting = useCallback((fieldName: string): boolean => {
    // Cannot toggle fixed fields (name and photo)
    if (fieldName === 'name' || fieldName === 'photoUrl') return false;
    
    const currentValue = displaySettings[fieldName];
    const currentCount = getSelectedCount();
    
    // If trying to enable and already at max (3 selectable items), don't allow
    if (!currentValue && currentCount >= MAX_SELECTABLE_ITEMS) {
      return false;
    }
    
    // If disabling a field that is high priority, clear high priority
    if (currentValue && highPriorityField === fieldName) {
      setHighPriorityField(null);
    }
    
    setDisplaySettings(prev => ({ ...prev, [fieldName]: !prev[fieldName] }));
    return true;
  }, [displaySettings, getSelectedCount, highPriorityField]);

  // Get all displayable fields (fixed + form fields)
  const getAllFields = useCallback((): (FormField & { fixed?: boolean })[] => {
    const allFields: (FormField & { fixed?: boolean })[] = [...FIXED_FIELDS];
    
    // Add form fields (excluding name and photoUrl which are in FIXED_FIELDS)
    formFields.forEach(field => {
      if (field.fieldName !== 'name' && field.fieldName !== 'photoUrl' && field.fieldType !== 'file') {
        allFields.push(field);
      }
    });
    
    return allFields.sort((a, b) => a.order - b.order);
  }, [formFields]);

  // Get selectable fields (excluding fixed name and photo fields)
  const getSelectableFields = useCallback((): FormField[] => {
    return getAllFields().filter(f => f.fieldName !== 'name' && f.fieldName !== 'photoUrl');
  }, [getAllFields]);

  // Get enabled fields (fields that are currently enabled in display settings)
  // Returns array of {fieldName, fieldLabel, isHighPriority} for enabled non-fixed fields
  // High priority field is always first in the array
  const getEnabledFields = useCallback((): EnabledField[] => {
    const enabledFields = getSelectableFields()
      .filter(f => displaySettings[f.fieldName] === true)
      .map(f => ({ 
        fieldName: f.fieldName, 
        fieldLabel: f.fieldLabel,
        isHighPriority: f.fieldName === highPriorityField
      }));
    
    // Sort so high priority field is first
    return enabledFields.sort((a, b) => {
      if (a.isHighPriority) return -1;
      if (b.isHighPriority) return 1;
      return 0;
    });
  }, [getSelectableFields, displaySettings, highPriorityField]);

  // Refresh form fields (useful after form config changes)
  const refreshFields = useCallback(() => {
    setLoading(true);
    fetchFormConfig();
  }, [fetchFormConfig]);

  return {
    displaySettings,
    setDisplaySettings,
    toggleSetting,
    getSelectedCount,
    isAtMaxSelection: getSelectedCount() >= MAX_SELECTABLE_ITEMS,
    formFields,
    getAllFields,
    getSelectableFields,
    getEnabledFields,
    highPriorityField,
    setHighPriority,
    loading,
    refreshFields
  };
};

export default useDisplaySettings;

