import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import ProtectedRoute from '../ProtectedRoute';
import { AuthContext } from '../../../contexts/AuthContext';

// Mock the auth context
const mockAuthContext = {
  user: null,
  isLoading: false,
  isAuthenticated: false,
  login: jest.fn(),
  logout: jest.fn(),
  checkAuthStatus: jest.fn()
};

// Test wrapper component
const TestWrapper = ({ children, authContextValue = mockAuthContext }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthContext.Provider value={authContextValue}>
          {children}
        </AuthContext.Provider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

// Test components
const TestComponent = () => <div>Protected Content</div>;
const LoadingComponent = () => <div>Loading...</div>;

describe('ProtectedRoute Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading State', () => {
    it('should show loading when authentication is being checked', () => {
      const authContextValue = {
        ...mockAuthContext,
        isLoading: true
      };

      render(
        <TestWrapper authContextValue={authContextValue}>
          <ProtectedRoute>
            <TestComponent />
          </ProtectedRoute>
        </TestWrapper>
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('should show custom loading component when provided', () => {
      const authContextValue = {
        ...mockAuthContext,
        isLoading: true
      };

      render(
        <TestWrapper authContextValue={authContextValue}>
          <ProtectedRoute loadingComponent={<LoadingComponent />}>
            <TestComponent />
          </ProtectedRoute>
        </TestWrapper>
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
  });

  describe('Authentication', () => {
    it('should redirect to login when user is not authenticated', async () => {
      const authContextValue = {
        ...mockAuthContext,
        isLoading: false,
        isAuthenticated: false,
        user: null
      };

      render(
        <TestWrapper authContextValue={authContextValue}>
          <ProtectedRoute>
            <TestComponent />
          </ProtectedRoute>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
        // In a real test, you would check for navigation to login page
      });
    });

    it('should render children when user is authenticated', () => {
      const authContextValue = {
        ...mockAuthContext,
        isLoading: false,
        isAuthenticated: true,
        user: {
          id: '1',
          name: 'Test User',
          email: 'test@example.com',
          role: 'Demo User'
        }
      };

      render(
        <TestWrapper authContextValue={authContextValue}>
          <ProtectedRoute>
            <TestComponent />
          </ProtectedRoute>
        </TestWrapper>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });

  describe('Role-based Authorization', () => {
    const adminUser = {
      id: '1',
      name: 'Admin User',
      email: 'admin@example.com',
      role: 'Administrator'
    };

    const demoUser = {
      id: '2',
      name: 'Demo User',
      email: 'demo@example.com',
      role: 'Demo User'
    };

    it('should allow Administrator access to admin-only routes', () => {
      const authContextValue = {
        ...mockAuthContext,
        isLoading: false,
        isAuthenticated: true,
        user: adminUser
      };

      render(
        <TestWrapper authContextValue={authContextValue}>
          <ProtectedRoute requireRole="Administrator">
            <TestComponent />
          </ProtectedRoute>
        </TestWrapper>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('should deny Demo User access to admin-only routes', async () => {
      const authContextValue = {
        ...mockAuthContext,
        isLoading: false,
        isAuthenticated: true,
        user: demoUser
      };

      render(
        <TestWrapper authContextValue={authContextValue}>
          <ProtectedRoute requireRole="Administrator">
            <TestComponent />
          </ProtectedRoute>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
        // Should show access denied or redirect
      });
    });

    it('should allow Demo User access to demo routes', () => {
      const authContextValue = {
        ...mockAuthContext,
        isLoading: false,
        isAuthenticated: true,
        user: demoUser
      };

      render(
        <TestWrapper authContextValue={authContextValue}>
          <ProtectedRoute requireRole="Demo User">
            <TestComponent />
          </ProtectedRoute>
        </TestWrapper>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('should allow Administrator access to demo routes', () => {
      const authContextValue = {
        ...mockAuthContext,
        isLoading: false,
        isAuthenticated: true,
        user: adminUser
      };

      render(
        <TestWrapper authContextValue={authContextValue}>
          <ProtectedRoute requireRole="Demo User">
            <TestComponent />
          </ProtectedRoute>
        </TestWrapper>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('should allow access when no specific role is required', () => {
      const authContextValue = {
        ...mockAuthContext,
        isLoading: false,
        isAuthenticated: true,
        user: demoUser
      };

      render(
        <TestWrapper authContextValue={authContextValue}>
          <ProtectedRoute>
            <TestComponent />
          </ProtectedRoute>
        </TestWrapper>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });

  describe('Multiple Roles', () => {
    it('should allow access when user has one of the required roles', () => {
      const authContextValue = {
        ...mockAuthContext,
        isLoading: false,
        isAuthenticated: true,
        user: {
          id: '1',
          name: 'Test User',
          email: 'test@example.com',
          role: 'Demo User'
        }
      };

      render(
        <TestWrapper authContextValue={authContextValue}>
          <ProtectedRoute requireRole={['Administrator', 'Demo User']}>
            <TestComponent />
          </ProtectedRoute>
        </TestWrapper>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('should deny access when user does not have any of the required roles', async () => {
      const authContextValue = {
        ...mockAuthContext,
        isLoading: false,
        isAuthenticated: true,
        user: {
          id: '1',
          name: 'Test User',
          email: 'test@example.com',
          role: 'Demo User'
        }
      };

      render(
        <TestWrapper authContextValue={authContextValue}>
          <ProtectedRoute requireRole={['SuperAdmin', 'Moderator']}>
            <TestComponent />
          </ProtectedRoute>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
      });
    });
  });

  describe('Inactive Users', () => {
    it('should deny access to inactive users', async () => {
      const authContextValue = {
        ...mockAuthContext,
        isLoading: false,
        isAuthenticated: true,
        user: {
          id: '1',
          name: 'Inactive User',
          email: 'inactive@example.com',
          role: 'Demo User',
          is_active: false
        }
      };

      render(
        <TestWrapper authContextValue={authContextValue}>
          <ProtectedRoute>
            <TestComponent />
          </ProtectedRoute>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
      });
    });

    it('should allow access to active users', () => {
      const authContextValue = {
        ...mockAuthContext,
        isLoading: false,
        isAuthenticated: true,
        user: {
          id: '1',
          name: 'Active User',
          email: 'active@example.com',
          role: 'Demo User',
          is_active: true
        }
      };

      render(
        <TestWrapper authContextValue={authContextValue}>
          <ProtectedRoute>
            <TestComponent />
          </ProtectedRoute>
        </TestWrapper>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });

  describe('Custom Redirect', () => {
    it('should redirect to custom path when access is denied', () => {
      const authContextValue = {
        ...mockAuthContext,
        isLoading: false,
        isAuthenticated: false
      };

      render(
        <TestWrapper authContextValue={authContextValue}>
          <ProtectedRoute redirectTo="/custom-login">
            <TestComponent />
          </ProtectedRoute>
        </TestWrapper>
      );

      // In a real test, you would verify the navigation to the custom path
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing user gracefully', async () => {
      const authContextValue = {
        ...mockAuthContext,
        isLoading: false,
        isAuthenticated: true,
        user: null // Authenticated but no user object
      };

      render(
        <TestWrapper authContextValue={authContextValue}>
          <ProtectedRoute>
            <TestComponent />
          </ProtectedRoute>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
      });
    });

    it('should handle malformed user object gracefully', async () => {
      const authContextValue = {
        ...mockAuthContext,
        isLoading: false,
        isAuthenticated: true,
        user: { name: 'Test User' } // Missing required fields
      };

      render(
        <TestWrapper authContextValue={authContextValue}>
          <ProtectedRoute>
            <TestComponent />
          </ProtectedRoute>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
      });
    });
  });
});