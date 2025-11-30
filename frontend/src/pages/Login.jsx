import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  Shield
} from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);

    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.message || 'Invalid email or password. Please try again.');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center px-4 py-12">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-transparent"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-red-500/5 rounded-full blur-3xl"></div>
      </div>

      {/* Login Card */}
      <div className="relative w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="bg-black px-8 py-8 text-center">
            <div className="flex justify-center mb-4">
              <img 
                src="/logo.svg" 
                alt="AfroGazette" 
                className="h-10 w-auto" 
              />
            </div>
            <p className="text-gray-300 text-sm">
              Advertisement Management System
            </p>
          </div>

          {/* Login Form */}
          <div className="px-8 py-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Welcome Back
              </h2>
              <p className="text-gray-600 text-sm">
                Sign in to access your dashboard
              </p>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h3 className="text-sm font-medium text-red-800 mb-1">
                      Authentication Failed
                    </h3>
                    <p className="text-sm text-red-700">
                      {error}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Field */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors duration-200"
                    placeholder="Enter your email address"
                    required
                    autoFocus
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors duration-200"
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-gray-600 transition-colors duration-200"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !email || !password}
                className="w-full flex justify-center items-center px-6 py-3 border border-transparent text-base font-semibold rounded-xl text-white bg-red-500 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  <>
                    <Shield className="h-5 w-5 mr-2" />
                    Sign In to Dashboard
                  </>
                )}
              </button>
            </form>

            {/* Security Notice */}
            <div className="mt-8 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4 text-gray-600" />
                <span className="text-xs font-medium text-gray-700">
                  Secure Authentication
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Your connection is encrypted and your data is protected with industry-standard security measures.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-8 py-4 border-t border-gray-200">
            <div className="text-center">
              <p className="text-xs text-gray-500">
                © 2024 AfroGazette. All rights reserved.
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Professional advertising management platform
              </p>
            </div>
          </div>
        </div>

        {/* Floating Elements */}
        <div className="absolute -top-4 -right-4 w-8 h-8 bg-red-500 rounded-full opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-4 -left-4 w-6 h-6 bg-red-500 rounded-full opacity-30 animate-pulse delay-1000"></div>
      </div>
    </div>
  );
};

export default Login;
