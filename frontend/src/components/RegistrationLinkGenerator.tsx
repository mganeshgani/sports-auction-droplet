import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';

// Simple cache for registration link
let cachedLink: string | null = null;
let cachedConfigExists: boolean | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 30000; // 30 seconds

// Export function to clear cache when needed
export const clearRegistrationLinkCache = () => {
  cachedLink = null;
  cachedConfigExists = null;
  cacheTimestamp = 0;
};

interface RegistrationLinkGeneratorProps {
  onFormConfigChange?: (hasConfig: boolean) => void;
}

const RegistrationLinkGenerator: React.FC<RegistrationLinkGeneratorProps> = ({ onFormConfigChange }) => {
  const [registrationLink, setRegistrationLink] = useState<string>(cachedLink || '');
  const [copied, setCopied] = useState(false);
  const [hasFormConfig, setHasFormConfig] = useState<boolean>(cachedConfigExists ?? false);
  const [loading, setLoading] = useState(false);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

  // Check if cache is valid
  const isCacheValid = useMemo(() => {
    return cachedLink && cachedConfigExists && (Date.now() - cacheTimestamp < CACHE_TTL);
  }, []);

  useEffect(() => {
    // If cache is valid, use it immediately
    if (isCacheValid) {
      setRegistrationLink(cachedLink!);
      setHasFormConfig(cachedConfigExists!);
      onFormConfigChange?.(cachedConfigExists!);
      return;
    }

    // Otherwise, fetch data
    fetchLinkAndConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchLinkAndConfig = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      // Parallel fetch of both config check and link generation
      const [configResponse, linkResponse] = await Promise.all([
        axios.get(`${API_URL}/form-config`, { headers }),
        axios.post(`${API_URL}/auth/generate-registration-link`, {}, { 
          withCredentials: true,
          headers 
        })
      ]);
      
      // Check if form config exists
      const configExists = configResponse.data && 
                          configResponse.data.fields && 
                          configResponse.data.fields.length > 0;
      
      // Update cache
      cachedConfigExists = configExists;
      cachedLink = linkResponse.data.success ? linkResponse.data.data.url : '';
      cacheTimestamp = Date.now();
      
      setHasFormConfig(configExists);
      setRegistrationLink(cachedLink || '');
      onFormConfigChange?.(configExists);
    } catch (error) {
      console.error('Error fetching registration data:', error);
      setHasFormConfig(false);
      onFormConfigChange?.(false);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(registrationLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareViaWhatsApp = () => {
    const message = `Register for the Sports Auction!\n\nClick here to register: ${registrationLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  // Show loading skeleton briefly if no cache
  if (loading && !registrationLink) {
    return (
      <div className="flex items-center gap-1.5 sm:gap-2 animate-pulse">
        <div className="h-8 sm:h-9 w-20 sm:w-24 bg-gray-700/50 rounded-lg"></div>
        <div className="h-8 sm:h-9 w-20 sm:w-28 bg-gray-700/50 rounded-lg"></div>
      </div>
    );
  }

  // Don't render if no form config exists
  if (!hasFormConfig || !registrationLink) {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      <button
        onClick={copyToClipboard}
        className="flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200"
        style={{
          background: copied 
            ? 'rgba(16, 185, 129, 0.15)'
            : 'rgba(99, 102, 241, 0.1)',
          color: copied ? '#6ee7b7' : '#a5b4fc',
          border: `1px solid ${copied ? 'rgba(16, 185, 129, 0.3)' : 'rgba(99, 102, 241, 0.25)'}`,
          backdropFilter: 'blur(8px)'
        }}
        onMouseEnter={(e) => {
          if (!copied) {
            e.currentTarget.style.background = 'rgba(99, 102, 241, 0.2)';
            e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.45)';
            e.currentTarget.style.boxShadow = '0 0 20px rgba(99, 102, 241, 0.12)';
          }
        }}
        onMouseLeave={(e) => {
          if (!copied) {
            e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)';
            e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.25)';
            e.currentTarget.style.boxShadow = 'none';
          }
        }}
      >
        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {copied ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
          )}
        </svg>
        <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy Link'}</span>
        <span className="sm:hidden">{copied ? '✓' : 'Copy'}</span>
      </button>
      <button
        onClick={shareViaWhatsApp}
        className="flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200"
        style={{
          background: 'rgba(34, 197, 94, 0.1)',
          color: '#86efac',
          border: '1px solid rgba(34, 197, 94, 0.25)',
          backdropFilter: 'blur(8px)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(34, 197, 94, 0.2)';
          e.currentTarget.style.borderColor = 'rgba(34, 197, 94, 0.45)';
          e.currentTarget.style.boxShadow = '0 0 20px rgba(34, 197, 94, 0.12)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(34, 197, 94, 0.1)';
          e.currentTarget.style.borderColor = 'rgba(34, 197, 94, 0.25)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
        </svg>
        <span className="hidden sm:inline">WhatsApp</span>
      </button>
    </div>
  );
};

export default RegistrationLinkGenerator;
