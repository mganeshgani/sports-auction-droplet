import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import ConfirmModal from '../components/ConfirmModal';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ─── Types ──────────────────────────────────────────────────────────────────────

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
  };
  isSystemField?: boolean;
}

// ─── Constants ──────────────────────────────────────────────────────────────────

const FIELD_TYPES = [
  { value: 'text',     label: 'Short Text',    icon: '📝', tooltip: 'For names, jersey numbers, hometown, and other short answers' },
  { value: 'number',   label: 'Number',        icon: '🔢', tooltip: 'For age, weight, height, years of experience, and other numeric values' },
  { value: 'select',   label: 'Dropdown',      icon: '📋', tooltip: 'For choosing from a list — e.g. position, category, skill level' },
  { value: 'file',     label: 'Photo Upload',  icon: '🖼️', tooltip: 'Lets players upload a profile photo or document' },
  { value: 'textarea', label: 'Long Text',     icon: '📄', tooltip: 'For longer answers like player bio, achievements, or notes' },
  { value: 'date',     label: 'Date',          icon: '📅', tooltip: 'For date of birth, registration date, or any calendar date' },
  { value: 'email',    label: 'Email Address', icon: '📧', tooltip: "For collecting player's email address" },
  { value: 'tel',      label: 'Phone Number',  icon: '📞', tooltip: "For collecting player's phone number" },
] as const;

const FIELD_TYPE_ICON: Record<string, string> = Object.fromEntries(FIELD_TYPES.map(f => [f.value, f.icon]));
const FIELD_TYPE_LABEL: Record<string, string> = Object.fromEntries(FIELD_TYPES.map(f => [f.value, f.label]));

const SPORT_TEMPLATES = [
  { id: 'cricket',    name: 'Cricket',    icon: '🏏' },
  { id: 'football',   name: 'Football',   icon: '⚽' },
  { id: 'basketball', name: 'Basketball', icon: '🏀' },
  { id: 'general',    name: 'General',    icon: '🎯' },
];

const STARTER_FIELDS: FormField[] = [
  { fieldName: 'name',  fieldLabel: 'Player Name',  fieldType: 'text', required: true,  order: 1, isSystemField: true },
  { fieldName: 'photo', fieldLabel: 'Player Photo', fieldType: 'file', required: false, order: 2 },
  { fieldName: 'category', fieldLabel: 'Category',  fieldType: 'select', required: true, options: ['Category A', 'Category B', 'Category C'], order: 3 },
];

const DRAFT_KEY = 'formbuilder_draft';
const AUTO_SAVE_INTERVAL = 30_000;

function labelToFieldName(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '_') || 'field';
}

// ─── Sortable Field Card ────────────────────────────────────────────────────────

interface FieldCardProps {
  field: FormField;
  isEditing: boolean;
  onToggleEdit: () => void;
  onDelete: () => void;
  onFieldChange: (updates: Partial<FormField>) => void;
  showDeleteWarning: boolean;
  deleteWarningCount: number;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}

function FieldCard({
  field,
  isEditing,
  onToggleEdit,
  onDelete,
  onFieldChange,
  showDeleteWarning,
  deleteWarningCount,
  onConfirmDelete,
  onCancelDelete,
}: FieldCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.fieldName,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  const isSystem = field.isSystemField || field.fieldName === 'name';

  return (
    <div ref={setNodeRef} style={style} className={`rounded-xl border transition-all duration-200 ${isDragging ? 'shadow-2xl shadow-amber-500/20' : 'shadow-md'} ${isEditing ? 'border-amber-500/60 ring-1 ring-amber-500/30' : 'border-slate-700/60 hover:border-slate-600/80'}`}>
      {/* Card header */}
      <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-slate-900/80">
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-slate-300 text-xl select-none touch-none flex-shrink-0"
          title="Drag to reorder"
        >
          ⠿
        </div>

        {/* Icon */}
        <span className="text-lg flex-shrink-0">{FIELD_TYPE_ICON[field.fieldType] || '📝'}</span>

        {/* Label */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-slate-200 text-sm truncate">{field.fieldLabel}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {FIELD_TYPE_LABEL[field.fieldType] || field.fieldType} · {field.required ? 'Required' : 'Optional'}
          </p>
        </div>

        {/* Required badge */}
        <span className={`text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 ${field.required ? 'bg-red-500/15 text-red-400 border border-red-500/30' : 'bg-slate-700/50 text-slate-400 border border-slate-600/50'}`}>
          {field.required ? 'Required' : 'Optional'}
        </span>

        {/* Actions */}
        {isSystem ? (
          <span className="text-[10px] text-slate-500 italic flex-shrink-0 flex items-center gap-1" title="Player Name is required and cannot be removed">
            🔒 System
          </span>
        ) : (
          <div className="flex gap-0.5 flex-shrink-0">
            <button
              onClick={onToggleEdit}
              className="p-1.5 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
              title="Edit field"
            >
              ✎
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              title="Delete field"
            >
              🗑
            </button>
          </div>
        )}
      </div>

      {/* Delete warning */}
      {showDeleteWarning && (
        <div className="mx-3 mb-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <p className="text-sm text-amber-300 mb-2">
            ⚠️ {deleteWarningCount} player{deleteWarningCount !== 1 ? 's have' : ' has'} already filled in &ldquo;{field.fieldLabel}&rdquo;.
            Deleting this field will remove their answers permanently.
          </p>
          <div className="flex gap-2">
            <button
              onClick={onCancelDelete}
              className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirmDelete}
              className="px-3 py-1 text-xs bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
            >
              Yes, delete this field
            </button>
          </div>
        </div>
      )}

      {/* Inline edit panel */}
      {isEditing && !isSystem && (
        <div className="p-3 sm:p-4 border-t border-slate-700/50 bg-slate-950/50 space-y-3">
          {/* Field Label */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Field Label</label>
            <input
              type="text"
              value={field.fieldLabel}
              onChange={(e) => {
                const newLabel = e.target.value;
                const updates: Partial<FormField> = { fieldLabel: newLabel };
                // Auto-generate fieldName from label for non-system fields
                if (!['name', 'photo', 'regNo'].includes(field.fieldName)) {
                  updates.fieldName = labelToFieldName(newLabel) || field.fieldName;
                }
                onFieldChange(updates);
              }}
              className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50"
              placeholder="The name shown to players"
            />
          </div>

          {/* Helper text */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Helper Text <span className="text-slate-600">(optional)</span></label>
            <input
              type="text"
              value={field.placeholder || ''}
              onChange={(e) => onFieldChange({ placeholder: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50"
              placeholder="Hint shown below the input"
            />
          </div>

          {/* Required toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                checked={field.required}
                onChange={(e) => onFieldChange({ required: e.target.checked })}
                className="sr-only"
              />
              <div className={`w-10 h-5 rounded-full transition-colors ${field.required ? 'bg-amber-500' : 'bg-slate-600'}`} />
              <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${field.required ? 'translate-x-5' : ''}`} />
            </div>
            <span className="text-sm text-slate-300">Required?</span>
          </label>

          {/* Type-specific settings */}
          {(field.fieldType === 'number') && (
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-400 mb-1">Minimum value</label>
                <input
                  type="number"
                  value={field.validation?.min ?? ''}
                  onChange={(e) => onFieldChange({ validation: { ...field.validation, min: e.target.value ? Number(e.target.value) : undefined } })}
                  className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  placeholder="No minimum"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-400 mb-1">Maximum value</label>
                <input
                  type="number"
                  value={field.validation?.max ?? ''}
                  onChange={(e) => onFieldChange({ validation: { ...field.validation, max: e.target.value ? Number(e.target.value) : undefined } })}
                  className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  placeholder="No maximum"
                />
              </div>
            </div>
          )}

          {field.fieldType === 'select' && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Options</label>
              <div className="space-y-2">
                {(field.options || []).map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => {
                        const newOptions = [...(field.options || [])];
                        newOptions[i] = e.target.value;
                        onFieldChange({ options: newOptions });
                      }}
                      className="flex-1 px-3 py-1.5 text-sm bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                      placeholder={`Option ${i + 1}`}
                    />
                    <button
                      onClick={() => {
                        const newOptions = (field.options || []).filter((_, idx) => idx !== i);
                        onFieldChange({ options: newOptions });
                      }}
                      className="p-1 text-red-400 hover:bg-red-500/10 rounded transition-colors text-sm"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => onFieldChange({ options: [...(field.options || []), ''] })}
                  className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
                >
                  + Add another option
                </button>
              </div>
            </div>
          )}

          {(field.fieldType === 'text' || field.fieldType === 'textarea') && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Max characters <span className="text-slate-600">(leave blank for unlimited)</span></label>
              <input
                type="number"
                value={field.validation?.maxLength ?? ''}
                onChange={(e) => onFieldChange({ validation: { ...field.validation, maxLength: e.target.value ? Number(e.target.value) : undefined } })}
                className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                placeholder="Unlimited"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Live Preview ───────────────────────────────────────────────────────────────

function LivePreview({ fields, formTitle }: { fields: FormField[]; formTitle: string }) {
  return (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <h3 className="text-base font-semibold text-slate-200">{formTitle || 'Player Registration'}</h3>
      </div>
      {fields.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-8">Add fields to see the preview</p>
      ) : (
        fields.map((field) => (
          <div key={field.fieldName} className="space-y-1">
            <label className="block text-sm font-medium text-slate-300">
              {field.fieldLabel}
              {field.required && <span className="text-red-400 ml-1">*</span>}
            </label>

            {field.fieldType === 'text' || field.fieldType === 'email' || field.fieldType === 'tel' ? (
              <input
                type={field.fieldType}
                disabled
                placeholder={field.placeholder || ''}
                className="w-full px-3 py-2 text-sm bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-500 cursor-not-allowed"
              />
            ) : field.fieldType === 'number' ? (
              <input
                type="number"
                disabled
                placeholder={field.placeholder || ''}
                className="w-full px-3 py-2 text-sm bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-500 cursor-not-allowed"
              />
            ) : field.fieldType === 'date' ? (
              <input
                type="date"
                disabled
                className="w-full px-3 py-2 text-sm bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-500 cursor-not-allowed"
              />
            ) : field.fieldType === 'textarea' ? (
              <textarea
                disabled
                rows={3}
                placeholder={field.placeholder || ''}
                className="w-full px-3 py-2 text-sm bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-500 resize-none cursor-not-allowed"
              />
            ) : field.fieldType === 'select' ? (
              <select
                disabled
                className="w-full px-3 py-2 text-sm bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-500 cursor-not-allowed appearance-none"
              >
                <option value="">Select...</option>
                {(field.options || []).map((opt, i) => (
                  <option key={i} value={opt}>{opt}</option>
                ))}
              </select>
            ) : field.fieldType === 'file' ? (
              <div className="px-3 py-3 text-sm bg-slate-800/50 border border-dashed border-slate-700/50 rounded-lg text-slate-500 text-center cursor-not-allowed">
                Choose File
              </div>
            ) : (
              <input
                type="text"
                disabled
                placeholder={field.placeholder || ''}
                className="w-full px-3 py-2 text-sm bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-500 cursor-not-allowed"
              />
            )}

            {field.placeholder && field.fieldType !== 'file' && (
              <p className="text-xs text-slate-600 mt-0.5">{field.placeholder}</p>
            )}
          </div>
        ))
      )}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────────

const FormBuilderPage: React.FC = () => {
  const { isAuctioneer } = useAuth();
  const navigate = useNavigate();
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

  const [formTitle, setFormTitle] = useState('Player Registration');
  const [formDescription, setFormDescription] = useState('Fill in your details to register');
  const [fields, setFields] = useState<FormField[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [editingFieldName, setEditingFieldName] = useState<string | null>(null);
  const [fieldCounter, setFieldCounter] = useState(1);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedFields, setLastSavedFields] = useState<string>('');
  const [draftAge, setDraftAge] = useState<string | null>(null);
  const [showDraftRestore, setShowDraftRestore] = useState(false);
  const [playerCount, setPlayerCount] = useState(0);
  const [deleteFieldTarget, setDeleteFieldTarget] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<'fields' | 'canvas'>('canvas');
  const [showPreview, setShowPreview] = useState(false);
  const [pendingTemplate, setPendingTemplate] = useState<string | null>(null);

  const canvasEndRef = useRef<HTMLDivElement>(null);
  const justAddedRef = useRef(false);
  const pendingTemplateRef = useRef(false);

  // dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // ─── Data fetching ──────────────────────────────────────────────────────────

  const fetchFormConfig = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/form-config`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const config = response.data;
      setFormTitle(config.formTitle || 'Player Registration');
      setFormDescription(config.formDescription || 'Fill in your details to register');

      // Mark 'name' as system field
      const loadedFields: FormField[] = (config.fields || []).map((f: FormField) => ({
        ...f,
        isSystemField: f.fieldName === 'name' ? true : undefined,
        required: f.fieldName === 'regNo' ? false : f.required,
      }));

      setFields(loadedFields.length > 0 ? loadedFields : STARTER_FIELDS);
      setLastSavedFields(JSON.stringify(loadedFields.length > 0 ? loadedFields : STARTER_FIELDS));

      // Check for draft
      try {
        const draft = localStorage.getItem(DRAFT_KEY);
        if (draft) {
          const parsed = JSON.parse(draft);
          if (parsed.timestamp && parsed.fields) {
            const savedTime = config.updatedAt ? new Date(config.updatedAt).getTime() : 0;
            if (parsed.timestamp > savedTime) {
              const ago = Math.round((Date.now() - parsed.timestamp) / 60000);
              setDraftAge(ago < 1 ? 'just now' : `${ago} min ago`);
              setShowDraftRestore(true);
            } else {
              localStorage.removeItem(DRAFT_KEY);
            }
          }
        }
      } catch { /* ignore corrupt drafts */ }
    } catch (error) {
      console.error('Error fetching form config:', error);
      setFields(STARTER_FIELDS);
      setLastSavedFields(JSON.stringify(STARTER_FIELDS));
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  const fetchPlayerCount = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/players?page=1&limit=1`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPlayerCount(res.data.total || res.data.players?.length || 0);
    } catch {
      setPlayerCount(0);
    }
  }, [API_URL]);

  useEffect(() => {
    if (!isAuctioneer) {
      navigate('/login');
      return;
    }
    fetchFormConfig();
    fetchPlayerCount();
  }, [isAuctioneer, navigate, fetchFormConfig, fetchPlayerCount]);

  // ─── Unsaved changes tracking ──────────────────────────────────────────────

  useEffect(() => {
    const currentState = JSON.stringify(fields);
    setHasUnsavedChanges(currentState !== lastSavedFields);
  }, [fields, lastSavedFields]);

  // Update document title with unsaved indicator
  useEffect(() => {
    document.title = hasUnsavedChanges ? '● Form Builder' : 'Form Builder';
    return () => { document.title = 'Form Builder'; };
  }, [hasUnsavedChanges]);

  // ─── Auto-draft to localStorage ───────────────────────────────────────────

  useEffect(() => {
    if (loading) return;
    const interval = setInterval(() => {
      if (fields.length > 0) {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({
          fields,
          formTitle,
          formDescription,
          timestamp: Date.now(),
        }));
        setDraftAge('just now');
      }
    }, AUTO_SAVE_INTERVAL);
    return () => clearInterval(interval);
  }, [fields, formTitle, formDescription, loading]);

  // ─── Scroll to new field ──────────────────────────────────────────────────

  useEffect(() => {
    if (justAddedRef.current) {
      justAddedRef.current = false;
      setTimeout(() => canvasEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [fields.length]);

  // ─── Draft restore ────────────────────────────────────────────────────────

  const restoreDraft = () => {
    try {
      const draft = localStorage.getItem(DRAFT_KEY);
      if (draft) {
        const parsed = JSON.parse(draft);
        if (parsed.fields) {
          setFields(parsed.fields);
          if (parsed.formTitle) setFormTitle(parsed.formTitle);
          if (parsed.formDescription) setFormDescription(parsed.formDescription);
        }
      }
    } catch { /* ignore */ }
    setShowDraftRestore(false);
  };

  const discardDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setShowDraftRestore(false);
  };

  // ─── Field operations ─────────────────────────────────────────────────────

  const addField = (type: string) => {
    const count = fieldCounter;
    setFieldCounter((c) => c + 1);
    const typeLabel = FIELD_TYPE_LABEL[type] || type;
    const label = `${typeLabel} ${count}`;

    const newField: FormField = {
      fieldName: `${labelToFieldName(label)}_${Date.now()}`,
      fieldLabel: label,
      fieldType: type,
      required: false,
      placeholder: '',
      options: type === 'select' ? ['Option 1', 'Option 2'] : undefined,
      order: fields.length + 1,
    };

    setFields((prev) => [...prev, newField]);
    setEditingFieldName(newField.fieldName);
    justAddedRef.current = true;
  };

  const updateField = (fieldName: string, updates: Partial<FormField>) => {
    setFields((prev) =>
      prev.map((f) => {
        if (f.fieldName !== fieldName) return f;
        const updated = { ...f, ...updates };
        // If fieldName changed via label auto-gen, update it
        if (updates.fieldName && updates.fieldName !== fieldName) {
          // Ensure uniqueness
          const exists = prev.some((p) => p.fieldName === updates.fieldName && p.fieldName !== fieldName);
          if (exists) {
            updated.fieldName = `${updates.fieldName}_${Date.now()}`;
          }
        }
        return updated;
      })
    );
    // If fieldName itself changed, update editingFieldName
    if (updates.fieldName && updates.fieldName !== fieldName && editingFieldName === fieldName) {
      const exists = fields.some((p) => p.fieldName === updates.fieldName && p.fieldName !== fieldName);
      setEditingFieldName(exists ? `${updates.fieldName}_${Date.now()}` : updates.fieldName);
    }
  };

  const initiateDelete = (fieldName: string) => {
    if (playerCount > 0) {
      setDeleteFieldTarget(fieldName);
    } else {
      removeField(fieldName);
    }
  };

  const removeField = (fieldName: string) => {
    setFields((prev) => prev.filter((f) => f.fieldName !== fieldName));
    setDeleteFieldTarget(null);
    if (editingFieldName === fieldName) setEditingFieldName(null);
  };

  // ─── Drag and drop ────────────────────────────────────────────────────────

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setFields((prev) => {
      const oldIndex = prev.findIndex((f) => f.fieldName === active.id);
      const newIndex = prev.findIndex((f) => f.fieldName === over.id);
      return arrayMove(prev, oldIndex, newIndex).map((f, i) => ({ ...f, order: i + 1 }));
    });
  };

  // ─── Template loading ─────────────────────────────────────────────────────

  const loadTemplate = async (templateId: string) => {
    if (fields.length > 0 && !pendingTemplateRef.current) {
      setPendingTemplate(templateId);
      return;
    }
    pendingTemplateRef.current = false;

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/form-config/load-template/${templateId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const config = response.data.formConfig;
      setFormTitle(config.formTitle);
      setFormDescription(config.formDescription);

      const loadedFields: FormField[] = config.fields.map((f: FormField) => ({
        ...f,
        isSystemField: f.fieldName === 'name' ? true : undefined,
        required: f.fieldName === 'regNo' ? false : f.required,
      }));
      setFields(loadedFields);
      setEditingFieldName(null);
    } catch (error) {
      console.error('Error loading template:', error);
    }
  };

  // ─── Save ──────────────────────────────────────────────────────────────────

  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    fields.forEach((f) => {
      if (f.fieldType === 'select' && (!f.options || f.options.filter(Boolean).length === 0)) {
        errors.push(`Dropdown field "${f.fieldLabel}" has no options`);
      }
      if (!f.fieldLabel.trim()) {
        errors.push('A field has no label');
      }
    });
    if (!fields.some((f) => f.fieldName === 'name')) {
      errors.push('Player Name field is required');
    }
    return errors;
  }, [fields]);

  const handleSave = async () => {
    if (validationErrors.length > 0 || fields.length === 0) return;

    setSaving(true);
    setSaveStatus('saving');

    try {
      const token = localStorage.getItem('token');
      // Clean fields for save: strip isSystemField, ensure order
      const cleanFields = fields.map((f, i) => {
        const { isSystemField, ...rest } = f;
        return { ...rest, order: i + 1 };
      });

      await axios.post(
        `${API_URL}/form-config`,
        { formTitle, formDescription, fields: cleanFields },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setLastSavedFields(JSON.stringify(fields));
      setSaveStatus('saved');
      localStorage.removeItem(DRAFT_KEY);

      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error: any) {
      console.error('Error saving form:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setSaving(false);
    }
  };

  // ─── Field name list for sortable context ─────────────────────────────────

  const fieldIds = useMemo(() => fields.map((f) => f.fieldName), [fields]);

  // ─── Loading state ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500" />
          <p className="text-slate-400">Loading form builder...</p>
        </div>
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col bg-slate-950 overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-slate-800 bg-slate-950/95 backdrop-blur-sm px-3 sm:px-5 py-1.5 sm:py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-sm sm:text-base font-semibold text-slate-200">Form Builder</h1>
            {fields.length > 0 && (
              <span className="hidden sm:inline-flex px-2 py-0.5 bg-slate-800/80 text-slate-500 rounded-full text-[10px] font-medium">
                {fields.length} field{fields.length !== 1 ? 's' : ''}
              </span>
            )}
            {hasUnsavedChanges && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Unsaved changes" />}
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setShowPreview(true)}
              className="p-1.5 sm:px-2.5 sm:py-1 text-xs text-slate-400 hover:text-white border border-slate-700/60 hover:border-slate-500 rounded-md transition-all flex items-center gap-1 hover:bg-slate-800/50"
              title="Preview form"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span className="hidden sm:inline">Preview</span>
            </button>
            <button
              onClick={() => navigate(-1)}
              className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-200 rounded-md transition-colors hover:bg-slate-800/50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || validationErrors.length > 0 || fields.length === 0}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                saveStatus === 'saved'
                  ? 'bg-green-600 text-white'
                  : saveStatus === 'error'
                  ? 'bg-red-600 text-white'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-900'
              }`}
            >
              {saveStatus === 'saving' ? (
                <span className="flex items-center gap-1">
                  <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Saving
                </span>
              ) : saveStatus === 'saved' ? (
                '✓ Saved'
              ) : saveStatus === 'error' ? (
                'Failed'
              ) : (
                'Save'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Draft restore banner */}
      {showDraftRestore && (
        <div className="flex-shrink-0 bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between">
          <p className="text-sm text-amber-300">
            You have unsaved changes from {draftAge}.
          </p>
          <div className="flex gap-2">
            <button onClick={restoreDraft} className="px-3 py-1 text-xs bg-amber-600 hover:bg-amber-500 text-white rounded-lg">
              Restore
            </button>
            <button onClick={discardDraft} className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg">
              Discard
            </button>
          </div>
        </div>
      )}

      {/* Mobile tab bar */}
      <div className="flex-shrink-0 lg:hidden border-b border-slate-800 flex">
        {(['fields', 'canvas'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setMobileTab(tab)}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
              mobileTab === tab
                ? 'text-amber-400 border-b-2 border-amber-400'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {tab === 'fields' ? '➕ Add Fields' : '📋 Your Form'}
          </button>
        ))}
      </div>

      {/* Three-panel layout */}
      <div className="flex-1 overflow-hidden flex">
        {/* Panel 1: Field Type Picker */}
        <div className={`w-56 xl:w-64 flex-shrink-0 border-r border-slate-800 overflow-y-auto custom-scrollbar bg-slate-950 ${mobileTab === 'fields' ? '' : 'hidden lg:block'}`}>
          <div className="p-3 sm:p-4 space-y-4">
            <div>
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Add Fields</h2>
              <div className="space-y-1.5">
                {FIELD_TYPES.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => addField(type.value)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 bg-slate-900/50 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-lg transition-all group text-left"
                    title={type.tooltip}
                  >
                    <span className="text-lg group-hover:scale-110 transition-transform">{type.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-300 group-hover:text-slate-100">{type.label}</p>
                      <p className="text-[10px] text-slate-600 group-hover:text-slate-500 truncate">{type.tooltip}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-800 pt-4">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Sport Templates</h2>
              <div className="space-y-1.5">
                {SPORT_TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => loadTemplate(t.id)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 bg-slate-900/50 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-lg transition-all group text-left"
                  >
                    <span className="text-lg">{t.icon}</span>
                    <span className="text-sm font-medium text-slate-400 group-hover:text-slate-200">{t.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Form settings */}
            <div className="border-t border-slate-800 pt-4 space-y-3">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Form Settings</h2>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Title</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Description</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={2}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-500/50 resize-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Panel 2: Form Canvas */}
        <div className={`flex-1 overflow-y-auto custom-scrollbar bg-slate-900/30 ${mobileTab === 'canvas' ? '' : 'hidden lg:block'}`}>
          <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-slate-300">
                Your Form
                <span className="ml-2 px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full text-xs">
                  {fields.length} field{fields.length !== 1 ? 's' : ''}
                </span>
              </h2>
            </div>

            {fields.length === 0 ? (
              <div className="border-2 border-dashed border-slate-700/50 rounded-xl p-12 text-center text-slate-500">
                <div className="text-4xl mb-3">👈</div>
                <p className="text-lg font-medium">Click a field type on the left to start</p>
                <p className="text-sm mt-1">Or choose a sport template to get started quickly</p>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={fieldIds} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {fields.map((field) => (
                      <FieldCard
                        key={field.fieldName}
                        field={field}
                        isEditing={editingFieldName === field.fieldName}
                        onToggleEdit={() =>
                          setEditingFieldName(
                            editingFieldName === field.fieldName ? null : field.fieldName
                          )
                        }
                        onDelete={() => initiateDelete(field.fieldName)}
                        onFieldChange={(updates) => updateField(field.fieldName, updates)}
                        showDeleteWarning={deleteFieldTarget === field.fieldName}
                        deleteWarningCount={playerCount}
                        onConfirmDelete={() => removeField(field.fieldName)}
                        onCancelDelete={() => setDeleteFieldTarget(null)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}

            <div ref={canvasEndRef} />

            {/* Validation errors */}
            {validationErrors.length > 0 && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg space-y-1">
                {validationErrors.map((err, i) => (
                  <p key={i} className="text-xs text-red-400">• {err}</p>
                ))}
              </div>
            )}

            {/* Save status footer */}
            <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-2">
                {hasUnsavedChanges && <span className="text-amber-400">● Unsaved changes</span>}
                {draftAge && !hasUnsavedChanges && <span>Draft auto-saved {draftAge}</span>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(8px)' }}
          onClick={() => setShowPreview(false)}
        >
          <div
            className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto custom-scrollbar rounded-2xl"
            style={{
              background: 'linear-gradient(165deg, #0a0a0f 0%, #111118 100%)',
              border: '1px solid rgba(212, 175, 55, 0.2)',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8), 0 0 60px rgba(212, 175, 55, 0.08)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-slate-800" style={{ background: 'rgba(10, 10, 15, 0.95)', backdropFilter: 'blur(12px)' }}>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <h3 className="text-sm font-semibold text-slate-200">Form Preview</h3>
                <span className="text-[10px] text-slate-500">How players will see your form</span>
              </div>
              <button
                onClick={() => setShowPreview(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>
            {/* Modal body */}
            <div className="p-5 sm:p-6">
              <LivePreview fields={fields} formTitle={formTitle} />
              {/* Fake submit button in preview */}
              <div className="mt-6 pt-4 border-t border-slate-800">
                <div className="px-4 py-2.5 bg-amber-500/20 text-amber-400 text-sm font-semibold text-center rounded-lg border border-amber-500/30 cursor-not-allowed">
                  Register Player
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <ConfirmModal
        open={!!pendingTemplate}
        title="Replace Form?"
        message="This will replace your current form with the selected template. Are you sure?"
        confirmLabel="Replace"
        variant="warning"
        onConfirm={() => {
          if (pendingTemplate) {
            pendingTemplateRef.current = true;
            loadTemplate(pendingTemplate);
          }
          setPendingTemplate(null);
        }}
        onCancel={() => setPendingTemplate(null)}
      />
    </div>
  );
};

export default FormBuilderPage;
