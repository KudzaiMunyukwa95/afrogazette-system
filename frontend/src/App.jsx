import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ToastProvider } from './components/Toast';
import PrivateRoute from './components/PrivateRoute';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CreateAdvert from './pages/CreateAdvert';
import PendingApprovals from './pages/PendingApprovals';
import Schedule from './pages/Schedule';
import Users from './pages/Users';
import ClientManagement from './pages/ClientManagement';
import MyInvoices from './pages/MyInvoices';
import MyAdverts from './pages/MyAdverts';
import MyClients from './pages/MyClients';
import AllAdverts from './pages/AllAdverts';
import SalesCalendar from './pages/SalesCalendar';
import FinanceOverview from './pages/FinanceOverview';
import Expenses from './pages/Expenses';
import Requisitions from './pages/Requisitions';
import MyRequisitions from './pages/MyRequisitions';
import FinancialReports from './pages/FinancialReports';
import Profile from './pages/Profile';

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <NotificationProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />

              <Route
                path="/dashboard"
                element={
                  <PrivateRoute>
                    <Dashboard />
                  </PrivateRoute>
                }
              />

              <Route
                path="/profile"
                element={
                  <PrivateRoute>
                    <Profile />
                  </PrivateRoute>
                }
              />

              <Route
                path="/create-advert"
                element={
                  <PrivateRoute>
                    <CreateAdvert />
                  </PrivateRoute>
                }
              />

              <Route
                path="/pending-approvals"
                element={
                  <PrivateRoute adminOnly>
                    <PendingApprovals />
                  </PrivateRoute>
                }
              />

              <Route
                path="/schedule"
                element={
                  <PrivateRoute adminOnly>
                    <Schedule />
                  </PrivateRoute>
                }
              />

              <Route
                path="/users"
                element={
                  <PrivateRoute adminOnly>
                    <Users />
                  </PrivateRoute>
                }
              />

              <Route
                path="/clients"
                element={
                  <PrivateRoute>
                    <ClientManagement />
                  </PrivateRoute>
                }
              />

              <Route
                path="/my-clients"
                element={
                  <PrivateRoute>
                    <MyClients />
                  </PrivateRoute>
                }
              />

              <Route
                path="/my-adverts"
                element={
                  <PrivateRoute>
                    <MyAdverts />
                  </PrivateRoute>
                }
              />

              <Route
                path="/calendar"
                element={
                  <PrivateRoute>
                    <SalesCalendar />
                  </PrivateRoute>
                }
              />

              <Route
                path="/invoices"
                element={
                  <PrivateRoute>
                    <MyInvoices />
                  </PrivateRoute>
                }
              />

              <Route
                path="/all-adverts"
                element={
                  <PrivateRoute adminOnly>
                    <AllAdverts />
                  </PrivateRoute>
                }
              />

              {/* Finance Module Routes */}
              <Route
                path="/finance/overview"
                element={
                  <PrivateRoute adminOnly>
                    <FinanceOverview />
                  </PrivateRoute>
                }
              />
              <Route
                path="/finance/expenses"
                element={
                  <PrivateRoute adminOnly>
                    <Expenses />
                  </PrivateRoute>
                }
              />
              <Route
                path="/finance/requisitions"
                element={
                  <PrivateRoute adminOnly>
                    <Requisitions />
                  </PrivateRoute>
                }
              />
              <Route
                path="/finance/reports"
                element={
                  <PrivateRoute adminOnly>
                    <FinancialReports />
                  </PrivateRoute>
                }
              />
              <Route
                path="/finance/my-requisitions"
                element={
                  <PrivateRoute>
                    <MyRequisitions />
                  </PrivateRoute>
                }
              />

              <Route path="/" element={<Navigate to="/dashboard" />} />
              <Route path="*" element={<Navigate to="/dashboard" />} />
            </Routes>
          </Router>
        </NotificationProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
