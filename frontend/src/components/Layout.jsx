import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
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
  FileText,
  Facebook,
  Instagram,
  Youtube,
  Globe,
  MessageCircle,
  DollarSign
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
        { name: 'Finance', href: '/finance/overview', icon: DollarSign, current: currentPath.startsWith('/finance') },
        { name: 'Users', href: '/users', icon: Users, current: currentPath === '/users' },
      ];
    } else {
      // Sales Rep Navigation
      return [
        { name: 'Dashboard', href: '/dashboard', icon: BarChart3, current: currentPath === '/dashboard' },
        { name: 'Create Advert', href: '/create-advert', icon: Plus, current: currentPath === '/create-advert' },
        { name: 'Calendar', href: '/calendar', icon: Calendar, current: currentPath === '/calendar' },
        { name: 'Adverts', href: '/my-adverts', icon: FileText, current: currentPath === '/my-adverts' },
        { name: 'Clients', href: '/my-clients', icon: Users, current: currentPath === '/my-clients' },
        { name: 'Invoices', href: '/invoices', icon: FileText, current: currentPath === '/invoices' },
        { name: 'Requisitions', href: '/finance/my-requisitions', icon: DollarSign, current: currentPath === '/finance/my-requisitions' },
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
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Fixed Header */}
      <header className="bg-black border-b border-gray-800 fixed top-0 left-0 right-0 z-50">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 gap-4">
            {/* Logo and Navigation */}
            <div className="flex items-center lg:space-x-4 xl:space-x-8 min-w-0">
              {/* Logo */}
              <div className="flex-shrink-0">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="flex items-center space-x-3 text-white hover:opacity-80 transition-opacity duration-200"
                >
                  <img
                    src="/logo.svg"
                    alt="AfroGazette"
                    className="h-6 md:h-7 w-auto max-w-[120px] md:max-w-none object-contain"
                  />
                </button>
              </div>

              {/* Desktop Navigation */}
              <nav className="hidden lg:flex space-x-1">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.name}
                      onClick={() => handleNavigation(item.href)}
                      className={`
                        flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 whitespace-nowrap
                        ${item.current
                          ? 'bg-red-600 text-white'
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

            {/* User Profile - Mobile Optimized */}
            <div className="flex items-center space-x-2 md:space-x-4 flex-shrink-0">
              {/* User Info */}
              <div className="hidden md:flex items-center space-x-3">
                <div className="flex items-center justify-center w-9 h-9 md:w-10 md:h-10 rounded-full bg-red-600 text-white font-bold text-sm">
                  {(user?.full_name || user?.fullName || user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="text-left hidden xl:block">
                  <div className="text-sm font-semibold text-white">
                    {user?.full_name?.split(' ')[0] ||
                      user?.fullName?.split(' ')[0] ||
                      user?.name?.split(' ')[0] ||
                      user?.email?.split('@')[0] ||
                      'User'}
                  </div>
                  <div className="text-xs text-gray-400">
                    {user?.role === 'admin' ? 'Administrator' : 'Sales Rep'}
                  </div>
                </div>
              </div>

              {/* Notification Bell */}
              <NotificationBell />

              {/* Logout Button - Mobile Optimized */}
              <button
                onClick={handleLogout}
                className="hidden md:flex items-center px-3 md:px-4 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors duration-200 tap-target"
              >
                <LogOut className="h-4 w-4 mr-2" />
                <span className="hidden xl:inline">Logout</span>
              </button>

              {/* Mobile Menu Button - Larger Tap Target */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden tap-target-lg rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 transition-colors duration-200"
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation - Improved Spacing & Tap Targets */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-gray-900 border-t border-gray-800 animate-in slide-in-from-top-2 duration-200">
            <div className="mobile-container py-4 space-y-2">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.name}
                    onClick={() => handleNavigation(item.href)}
                    className={`
                      w-full flex items-center px-4 py-3.5 text-base font-medium rounded-lg transition-colors duration-200 text-left tap-target-lg
                      ${item.current
                        ? 'bg-red-600 text-white font-semibold'
                        : 'text-gray-300 hover:text-white hover:bg-gray-800'
                      }
                    `}
                  >
                    <Icon className="h-5 w-5 mr-3 flex-shrink-0" />
                    {item.name}
                  </button>
                );
              })}

              {/* Mobile User Info - Show First Name */}
              <div className="pt-4 border-t border-gray-800 mt-4">
                <div className="flex items-center px-4 py-3 mb-2">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-600 text-white font-bold text-sm mr-3 flex-shrink-0">
                    {(user?.full_name || user?.fullName || user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">
                      {user?.full_name?.split(' ')[0] ||
                        user?.fullName?.split(' ')[0] ||
                        user?.name?.split(' ')[0] ||
                        user?.email?.split('@')[0] ||
                        'User'}
                    </div>
                    <div className="text-xs text-gray-400">
                      {user?.role === 'admin' ? 'Administrator' : 'Sales Rep'}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center px-4 py-3.5 text-base font-medium text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors duration-200"
                >
                  <LogOut className="h-5 w-5 mr-3" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="pt-16 flex-grow">
        <div className="w-full max-w-none mx-auto">
          <div className="px-0 sm:px-0 lg:px-0">
            <div className="w-full overflow-x-hidden">
              {children}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-black text-white py-8 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-6 md:space-y-0">
            {/* Brand */}
            <div className="text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start space-x-2 mb-2">
                <img
                  src="/logo.svg"
                  alt="AfroGazette"
                  className="h-6 w-auto"
                />
              </div>
              <p className="text-gray-400 text-sm">
                Premium Advertising Platform
              </p>
            </div>

            {/* Social Icons */}
            <div className="flex space-x-6">
              <a href="#" className="text-gray-400 hover:text-white transition-colors p-2">
                <MessageCircle className="h-6 w-6" />
                <span className="sr-only">WhatsApp</span>
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors p-2">
                <Facebook className="h-6 w-6" />
                <span className="sr-only">Facebook</span>
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors p-2">
                <Instagram className="h-6 w-6" />
                <span className="sr-only">Instagram</span>
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors p-2">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                </svg>
                <span className="sr-only">TikTok</span>
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors p-2">
                <Youtube className="h-6 w-6" />
                <span className="sr-only">YouTube</span>
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors p-2">
                <Globe className="h-6 w-6" />
                <span className="sr-only">Website</span>
              </a>
            </div>

            {/* Copyright */}
            <div className="text-center md:text-right text-gray-500 text-xs">
              <p>&copy; {new Date().getFullYear()} AfroGazette News.</p>
              <p>All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
