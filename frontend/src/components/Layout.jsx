import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Menu,
  X,
  BarChart3,
  Plus,
  Clock,
  Calendar,
  Users,
  LogOut,
  User,
  FileText
} from 'lucide-react';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Different navigation based on user role
  const getNavigation = () => {
    const currentPath = location.pathname;

    if (user && user.role === 'admin') {
      // Admin Navigation
      return [
        { name: 'Dashboard', href: '/dashboard', icon: BarChart3, current: currentPath === '/dashboard' },
        { name: 'Schedule', href: '/schedule', icon: Calendar, current: currentPath === '/schedule' },
        { name: 'All Adverts', href: '/all-adverts', icon: FileText, current: currentPath === '/all-adverts' },
        { name: 'Invoices', href: '/invoices', icon: FileText, current: currentPath === '/invoices' },
        { name: 'Pending Approvals', href: '/pending-approvals', icon: Clock, current: currentPath === '/pending-approvals' },
        { name: 'Users', href: '/users', icon: Users, current: currentPath === '/users' },
      ];
    } else {
      // Sales Rep Navigation
      return [
        { name: 'Dashboard', href: '/dashboard', icon: BarChart3, current: currentPath === '/dashboard' },
        { name: 'Create Advert', href: '/create-advert', icon: Plus, current: currentPath === '/create-advert' },
        { name: 'My Adverts', href: '/my-adverts', icon: Calendar, current: currentPath === '/my-adverts' },
        { name: 'My Clients', href: '/my-clients', icon: Users, current: currentPath === '/my-clients' },
        { name: 'My Invoices', href: '/invoices', icon: FileText, current: currentPath === '/invoices' },
      ];
    }
  };

  const navigation = getNavigation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNavigation = (href) => {
    navigate(href);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Fixed Header */}
      <header className="bg-black border-b border-gray-800 fixed top-0 left-0 right-0 z-50">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Navigation */}
            <div className="flex items-center space-x-8">
              {/* Logo */}
              <div className="flex-shrink-0">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="flex items-center space-x-3 text-white hover:opacity-80 transition-opacity duration-200"
                >
                  <img
                    src="/logo.svg"
                    alt="AfroGazette"
                    className="h-7 w-auto"
                  />
                </button>
              </div>

              {/* Desktop Navigation */}
              <nav className="hidden md:flex space-x-1">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.name}
                      onClick={() => handleNavigation(item.href)}
                      className={`
                        flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200
                        ${item.current
                          ? 'bg-red-500 text-white'
                          : 'text-gray-300 hover:text-white hover:bg-gray-800'
                        }
                      `}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {item.name}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* User Profile */}
            <div className="flex items-center space-x-4">
              {/* User Info */}
              <div className="hidden sm:flex items-center space-x-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-600 text-white font-bold text-sm">
                  {user?.full_name?.charAt(0) || 'U'}
                </div>
                <div className="text-left">
                  <div className="text-sm font-semibold text-white">
                    {user?.full_name?.split(' ')[0] || 'User'}
                  </div>
                  <div className="text-xs text-gray-400">
                    {user?.role === 'admin' ? 'Administrator' : 'Sales Rep'}
                  </div>
                </div>
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="flex items-center px-4 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors duration-200"
              >
                <LogOut className="h-4 w-4 mr-2" />
                <span className="hidden sm:block">Logout</span>
              </button>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 transition-colors duration-200"
              >
                {isMobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-gray-900 border-t border-gray-800">
            <div className="px-4 py-3 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.name}
                    onClick={() => {
                      navigate(item.href);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`
                      w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200 text-left
                      ${item.current
                        ? 'bg-red-500 text-white'
                        : 'text-gray-300 hover:text-white hover:bg-gray-800'
                      }
                    `}
                  >
                    <Icon className="h-4 w-4 mr-3" />
                    {item.name}
                  </button>
                );
              })}

              {/* Mobile User Info */}
              <div className="pt-4 border-t border-gray-800 mt-4">
                <div className="flex items-center px-4 py-2">
                  <User className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <div className="text-sm font-medium text-white">
                      {user?.full_name || user?.name || 'User'}
                    </div>
                    <div className="text-xs text-gray-400">
                      {user?.role === 'admin' ? 'Administrator' : 'Sales Rep'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="pt-16 min-h-screen">
        <div className="w-full max-w-none mx-auto">
          <div className="px-0 sm:px-0 lg:px-0">
            <div className="w-full overflow-x-hidden">
              {children}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;
