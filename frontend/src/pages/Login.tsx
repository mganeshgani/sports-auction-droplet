import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import SEO from '../components/SEO';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    // Clear error immediately when user starts typing
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Show optimistic loading toast
    const toastId = toast.loading('Signing in...', { autoClose: false });

    try {
      const response = await login(formData.email, formData.password);
      
      if (response.success && response.data) {
        // Update toast to success
        toast.update(toastId, {
          render: 'Login successful! Redirecting...',
          type: 'success',
          isLoading: false,
          autoClose: 1000,
        });

        // Store user role for redirect
        const userRole = response.data.user.role;
        
        // Redirect immediately (optimistic navigation)
        setTimeout(() => {
          if (userRole === 'admin') {
            navigate('/admin');
          } else {
            navigate('/auction');
          }
        }, 500); // Small delay for toast visibility
      } else {
        // Update toast to error
        const errorMsg = response.error || 'Login failed';
        toast.update(toastId, {
          render: errorMsg,
          type: 'error',
          isLoading: false,
          autoClose: 3000,
        });
        setError(errorMsg);
        setLoading(false);
      }
    } catch (err: any) {
      const errorMsg = err.message || 'An error occurred during login';
      toast.update(toastId, {
        render: errorMsg,
        type: 'error',
        isLoading: false,
        autoClose: 3000,
      });
      setError(errorMsg);
      setLoading(false);
    }
  };

  return (
    <>
    <SEO
      title="Login | BidSport — Sports Auction Software"
      description="Log in to your BidSport account and manage your sports player auctions. Cricket, football, kabaddi auction management platform."
      url="https://sportsauction.me/login"
      noIndex={false}
    />
    <div className="fixed inset-0 w-full h-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center overflow-auto">
      <div className="w-full max-w-md px-4 py-8 sm:px-0">
        {/* Card Container */}
        <div className="relative">
          {/* Glow Effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 rounded-2xl blur opacity-20"></div>
          
          {/* Main Card */}
          <div className="relative bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="px-6 sm:px-8 pt-6 sm:pt-8 pb-4 sm:pb-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
              <div className="text-center space-y-1.5 sm:space-y-2">
                <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 mb-3 sm:mb-4">
                  <svg className="w-7 h-7 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">Welcome Back</h1>
                <p className="text-xs sm:text-sm text-slate-400">Sign in to access your auction dashboard</p>
              </div>
            </div>

            {/* Form */}
            <div className="px-6 sm:px-8 py-5 sm:py-6">
              {/* Dynamic error message */}
              {error && (
                <div className="mb-4 bg-red-500/10 border border-red-500/50 rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 flex items-start gap-2 sm:gap-3 animate-[shake_0.3s_ease-in-out]">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <p className="text-xs sm:text-sm text-red-300 flex-1">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4">
                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-xs sm:text-sm font-medium text-slate-300 mb-1.5 sm:mb-2">
                    Email Address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    disabled={loading}
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white text-sm sm:text-base placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="you@example.com"
                  />
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="password" className="block text-xs sm:text-sm font-medium text-slate-300 mb-1.5 sm:mb-2">
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    autoComplete="current-password"
                    disabled={loading}
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white text-sm sm:text-base placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="Enter your password"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-4 sm:mt-6 px-4 py-3 sm:py-3.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-white text-sm sm:text-base font-semibold rounded-lg shadow-lg shadow-amber-500/20 transform transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="text-sm sm:text-base">Signing in...</span>
                    </span>
                  ) : (
                    'Sign In'
                  )}
                </button>
              </form>
              <p className="text-center text-xs text-slate-500 mt-4">
                India's trusted sports auction platform for cricket, football, kabaddi & volleyball tournaments
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default Login;
