import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from 'styled-components';

// Context
import { AuthProvider } from './contexts/AuthContext';

// Components
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/Auth/ProtectedRoute';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AdminDashboard from './pages/Admin/AdminDashboard';
import DomainManagement from './pages/Admin/DomainManagement';
import AgentManagement from './pages/Admin/AgentManagement';
import QAManagement from './pages/Admin/QAManagement';
import DemoAgents from './pages/Demo/DemoAgents';
import ChatInterface from './pages/Demo/ChatInterface';
import NotFoundPage from './pages/NotFoundPage';

// Styles
import { theme } from './styles/theme';
import './index.css';

/**
 * Main Application Component
 * 
 * This component sets up the application structure including:
 * - React Query for server state management
 * - React Router for navigation
 * - Theme provider for styled-components
 * - Authentication context
 * - Global layout and protected routes
 * - Toast notifications
 */

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
    mutations: {
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <AuthProvider>
          <Router>
            <div className="App">
              <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<LoginPage />} />
                
                {/* Protected Routes */}
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <Layout />
                    </ProtectedRoute>
                  }
                >
                  {/* Default redirect to dashboard */}
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  
                  {/* Dashboard - Available to all authenticated users */}
                  <Route path="dashboard" element={<DashboardPage />} />
                  
                  {/* Admin Routes - Only for administrators */}
                  <Route
                    path="admin"
                    element={
                      <ProtectedRoute requiredRole="Administrator">
                        <AdminDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="admin/domains"
                    element={
                      <ProtectedRoute requiredRole="Administrator">
                        <DomainManagement />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="admin/agents"
                    element={
                      <ProtectedRoute requiredRole="Administrator">
                        <AgentManagement />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="admin/agents/:agentId/questions"
                    element={
                      <ProtectedRoute requiredRole="Administrator">
                        <QAManagement />
                      </ProtectedRoute>
                    }
                  />
                  
                  {/* Demo User Routes - Available to all authenticated users */}
                  <Route path="demo" element={<DemoAgents />} />
                  <Route path="demo/chat/:agentId" element={<ChatInterface />} />
                </Route>
                
                {/* 404 Page */}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
              
              {/* Global Toast Notifications */}
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: '#ffffff',
                    color: '#171717',
                    border: '1px solid #e5e5e5',
                    borderRadius: '0.5rem',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                    padding: '1rem',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                  },
                  success: {
                    iconTheme: {
                      primary: '#22c55e',
                      secondary: '#ffffff',
                    },
                  },
                  error: {
                    iconTheme: {
                      primary: '#ef4444',
                      secondary: '#ffffff',
                    },
                  },
                  loading: {
                    iconTheme: {
                      primary: '#3b82f6',
                      secondary: '#ffffff',
                    },
                  },
                }}
              />
            </div>
          </Router>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;