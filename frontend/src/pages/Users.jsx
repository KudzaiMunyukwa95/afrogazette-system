import React, { useEffect, useState } from 'react';
import ConfirmModal from '../components/ConfirmModal';
import { userAPI } from '../services/api';
import Layout from '../components/Layout';
import { useToast } from '../components/Toast';
import {
  Users as UsersIcon,
  UserPlus,
  Shield,
  Briefcase,
  Mail,
  Calendar,
  Trash2,
  X,
  Eye,
  EyeOff,
  User
} from 'lucide-react';

const Users = () => {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'sales_rep'
  });
  const [submitting, setSubmitting] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, userId: null, userName: '' });
  const [editingUser, setEditingUser] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await userAPI.getAll();
      setUsers(response.data.data.users);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      fullName: '',
      role: 'sales_rep'
    });
    setEditingUser(null);
    setShowModal(false);
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      password: '', // Leave blank to keep unchanged
      fullName: user.fullName || user.full_name,
      role: user.role
    });
    setShowModal(true);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (editingUser) {
        // Update existing user
        const data = { ...formData };
        if (!data.password) delete data.password; // Don't send empty password

        await userAPI.update(editingUser.id, data);
        toast.success('User updated successfully!');
      } else {
        // Create new user
        await userAPI.create(formData);
        toast.success('User created successfully!');
      }

      resetForm();
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || `Error ${editingUser ? 'updating' : 'creating'} user`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = (id, userName) => {
    setDeleteModal({ isOpen: true, userId: id, userName });
  };

  const confirmDelete = async () => {
    try {
      await userAPI.delete(deleteModal.userId);
      toast.success('User deleted successfully!');
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error deleting user');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto"></div>
            <p className="mt-4 text-gray-600 font-medium">Loading users...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Separate admins and sales reps
  const admins = users.filter(u => u.role === 'admin');
  const salesReps = users.filter(u => u.role === 'sales_rep');

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b">
          <div className="px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <UsersIcon className="h-6 w-6 text-blue-500" />
                <div>
                  <h1 className="text-xl font-bold text-gray-900">User Management</h1>
                  <p className="text-sm text-gray-600">Manage administrators and sales representatives</p>
                </div>
              </div>

              <button
                onClick={() => setShowModal(true)}
                className="bg-red-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-600 transition-colors flex items-center space-x-2"
              >
                <UserPlus className="h-4 w-4" />
                <span>Create User</span>
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard
              title="Total Users"
              value={users.length}
              icon={<UsersIcon className="h-5 w-5" />}
              color="bg-gray-100 text-gray-700"
            />
            <StatCard
              title="Administrators"
              value={admins.length}
              icon={<Shield className="h-5 w-5" />}
              color="bg-blue-100 text-blue-700"
            />
            <StatCard
              title="Sales Reps"
              value={salesReps.length}
              icon={<Briefcase className="h-5 w-5" />}
              color="bg-green-100 text-green-700"
            />
          </div>

          {/* Users Lists */}
          {users.length === 0 ? (
            <div className="bg-white rounded-xl border p-12 text-center">
              <UsersIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Users Yet</h3>
              <p className="text-gray-600 mb-4">Create your first user to get started</p>
              <button
                onClick={() => setShowModal(true)}
                className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
              >
                Create User
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Administrators */}
              {admins.length > 0 && (
                <UserSection
                  title="Administrators"
                  users={admins}
                  icon={<Shield className="h-5 w-5 text-blue-600" />}
                  badgeColor="bg-blue-100 text-blue-700"
                  onDeleteUser={handleDeleteUser}
                />
              )}

              {/* Sales Representatives */}
              {salesReps.length > 0 && (
                <UserSection
                  title="Sales Representatives"
                  users={salesReps}
                  icon={<Briefcase className="h-5 w-5 text-green-600" />}
                  badgeColor="bg-green-100 text-green-700"
                  onDeleteUser={handleDeleteUser}
                />
              )}
            </div>
          )}
        </div>

        {/* Create User Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Create New User</h2>
                <button
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    required
                    placeholder="John Doe"
                    disabled={submitting}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    placeholder="john@example.com"
                    disabled={submitting}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                      minLength="6"
                      placeholder="Minimum 6 characters"
                      disabled={submitting}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 disabled:opacity-50 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-2 p-1 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Minimum 6 characters required</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role *
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    disabled={submitting}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 disabled:opacity-50"
                  >
                    <option value="sales_rep">Sales Representative</option>
                    <option value="admin">Administrator</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.role === 'admin'
                      ? 'Full access: approve adverts, manage users, view all data'
                      : 'Limited access: create adverts, view own data only'
                    }
                  </p>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-red-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-600 disabled:opacity-50 transition-colors"
                  >
                    {submitting ? 'Creating...' : 'Create User'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    disabled={submitting}
                    className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <ConfirmModal
          isOpen={deleteModal.isOpen}
          onClose={() => setDeleteModal({ isOpen: false, userId: null, userName: '' })}
          onConfirm={confirmDelete}
          title="Delete User"
          message={`Are you sure you want to delete ${deleteModal.userName}? All their adverts will also be deleted. This action cannot be undone.`}
          confirmText="Delete"
          type="danger"
        />
      </div>
    </Layout>
  );
};

// Stats Card Component
const StatCard = ({ title, value, icon, color }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-600 mb-1">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
      <div className={`p-3 rounded-lg ${color}`}>
        {icon}
      </div>
    </div>
  </div>
);

// User Section Component - More compact and visually appealing
const UserSection = ({ title, users, icon, badgeColor, onDeleteUser }) => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
    <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {icon}
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        </div>
        <span className={`px-2 py-1 rounded text-xs font-medium ${badgeColor}`}>
          {users.length} {users.length === 1 ? 'user' : 'users'}
        </span>
      </div>
    </div>

    <div className="p-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {users.map(user => (
          <UserCard key={user.id} user={user} onDelete={onDeleteUser} />
        ))}
      </div>
    </div>
  </div>
);

// User Card Component - Much more compact and professional
const UserCard = ({ user, onDelete }) => {
  const getAvatarColor = () => {
    return user.role === 'admin'
      ? 'bg-gradient-to-br from-blue-500 to-blue-600'
      : 'bg-gradient-to-br from-green-500 to-green-600';
  };

  return (
    <div className="relative bg-gray-50 rounded-lg border border-gray-200 p-3 hover:border-gray-300 hover:shadow-sm transition-all duration-200 group">
      <div className="flex items-center space-x-3">
        {/* Avatar */}
        <div className={`w-10 h-10 ${getAvatarColor()} rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm`}>
          {user.fullName.charAt(0).toUpperCase()}
        </div>

        {/* User Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-gray-900 text-sm truncate">{user.fullName}</h3>
            <button
              onClick={() => onDelete(user.id, user.fullName)}
              className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all duration-200"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>

          <div className="space-y-1">
            <div className="flex items-center space-x-1 text-xs text-gray-600">
              <Mail className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{user.email}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1 text-xs text-gray-500">
                <Calendar className="h-3 w-3" />
                <span>{new Date(user.createdAt).toLocaleDateString()}</span>
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded ${user.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                }`}>
                {user.role === 'admin' ? 'Admin' : 'Sales'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Users;
