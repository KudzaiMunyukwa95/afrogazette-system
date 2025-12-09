import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import Layout from '../components/Layout';
import { useToast } from '../components/Toast';
import {
    User,
    Mail,
    Lock,
    Save,
    Shield,
    Briefcase
} from 'lucide-react';

const Profile = () => {
    const { user, login } = useAuth(); // login is valid here? No, login is for auth. We might need to update the context user.
    // Actually, useAuth usually exposes a way to update user or we just rely on fetchProfile.
    // Let's assume we update local state and maybe trigger a re-fetch if supported, or just let the next reload handle it.
    // Better: Update the user object in localStorage and context if possible. 
    // Inspecting AuthContext would be ideal but I'll assume standard behavior for now.

    const toast = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: ''
    });

    useEffect(() => {
        if (user) {
            setFormData(prev => ({
                ...prev,
                fullName: user.fullName || user.full_name || '',
                email: user.email || ''
            }));
        }
    }, [user]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        if (formData.password && formData.password !== formData.confirmPassword) {
            toast.error('Passwords do not match');
            setLoading(false);
            return;
        }

        try {
            const updateData = {
                fullName: formData.fullName,
                email: formData.email
            };

            if (formData.password) {
                updateData.password = formData.password;
            }

            const response = await authAPI.updateProfile(updateData);

            // Update local storage user data
            const updatedUser = response.data.data.user;
            const currentUser = JSON.parse(localStorage.getItem('user'));
            const newUser = { ...currentUser, ...updatedUser };
            localStorage.setItem('user', JSON.stringify(newUser));

            // Force reload to update context (simple way) or if we had setUser in context we'd use that.
            // For now, let's just show success. Ideally AuthContext should expose a generic updateUser method.

            toast.success('Profile updated successfully');
            setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));

            // Optional: reload to reflect changes in header immediately if context doesn't sync
            setTimeout(() => window.location.reload(), 1000);

        } catch (error) {
            console.error('Profile update error:', error);
            toast.error(error.response?.data?.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout>
            <div className="min-h-screen bg-gray-50 py-8">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

                        {/* Header */}
                        <div className="px-6 py-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                            <div className="flex items-center space-x-4">
                                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-sm ${user?.role === 'admin' ? 'bg-gradient-to-br from-blue-500 to-blue-600' : 'bg-gradient-to-br from-green-500 to-green-600'
                                    }`}>
                                    {user?.fullName?.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
                                    <div className="flex items-center space-x-2 mt-1">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user?.role === 'admin' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                                            }`}>
                                            {user?.role === 'admin' ? <Shield className="w-3 h-3 mr-1" /> : <Briefcase className="w-3 h-3 mr-1" />}
                                            {user?.role === 'admin' ? 'Administrator' : 'Sales Representative'}
                                        </span>
                                        <span className="text-gray-500 text-sm">{user?.email}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                {/* Full Name */}
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Full Name
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <User className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <input
                                            type="text"
                                            required
                                            value={formData.fullName}
                                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500 transition-colors"
                                            placeholder="Enter your full name"
                                        />
                                    </div>
                                </div>

                                {/* Email Address */}
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Email Address
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Mail className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <input
                                            type="email"
                                            required
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500 transition-colors"
                                            placeholder="Enter your email"
                                        />
                                    </div>
                                </div>

                                {/* Separator */}
                                <div className="col-span-2 border-t border-gray-100 my-2"></div>
                                <div className="col-span-2">
                                    <h3 className="text-lg font-medium text-gray-900 mb-1">Change Password</h3>
                                    <p className="text-sm text-gray-500">Leave blank to keep your current password</p>
                                </div>

                                {/* New Password */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        New Password
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Lock className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <input
                                            type="password"
                                            minLength="6"
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500 transition-colors"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>

                                {/* Confirm Password */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Confirm New Password
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Lock className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <input
                                            type="password"
                                            minLength="6"
                                            value={formData.confirmPassword}
                                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500 transition-colors"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>

                            </div>

                            <div className="pt-4 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex items-center space-x-2 bg-red-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 transition-all shadow-sm"
                                >
                                    <Save className="h-4 w-4" />
                                    <span>{loading ? 'Saving Changes...' : 'Save Changes'}</span>
                                </button>
                            </div>

                        </form>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default Profile;
