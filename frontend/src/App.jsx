import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
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

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
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
                <PrivateRoute adminOnly>
                  <ClientManagement />
                </PrivateRoute>
              }
            />

            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route path="*" element={<Navigate to="/dashboard" />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
