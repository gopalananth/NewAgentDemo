import React, { createContext, useContext, useReducer, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

/**
 * Authentication Context
 * 
 * Manages user authentication state, Office 365 login/logout,
 * and provides authentication status throughout the application.
 */

// API Base URL
const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

// Configure axios defaults
axios.defaults.withCredentials = true;
axios.defaults.baseURL = API_BASE_URL;

// Authentication states
const AuthContext = createContext();

// Initial state
const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null
};

// Action types
const AUTH_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGOUT: 'LOGOUT',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  UPDATE_USER: 'UPDATE_USER'
};

// Reducer function
function authReducer(state, action) {
  switch (action.type) {
    case AUTH_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload,
        error: null
      };
    
    case AUTH_ACTIONS.LOGIN_SUCCESS:
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
        error: null
      };
    
    case AUTH_ACTIONS.LOGOUT:
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      };
    
    case AUTH_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        isLoading: false
      };
    
    case AUTH_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };
    
    case AUTH_ACTIONS.UPDATE_USER:
      return {
        ...state,
        user: { ...state.user, ...action.payload }
      };
    
    default:
      return state;
  }
}

// Auth Provider Component
export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check authentication status on app load
  useEffect(() => {
    checkAuthStatus();
  }, []);

  /**
   * Check if user is authenticated
   */
  const checkAuthStatus = async () => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
      
      const response = await axios.get('/auth/status');
      
      if (response.data.success && response.data.authenticated) {
        dispatch({
          type: AUTH_ACTIONS.LOGIN_SUCCESS,
          payload: response.data.user
        });
      } else {
        dispatch({ type: AUTH_ACTIONS.LOGOUT });
      }
    } catch (error) {
      console.error('Auth status check failed:', error);
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
    }
  };

  /**
   * Initiate Office 365 login
   */
  const login = () => {
    try {
      // Clear any existing errors
      dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
      
      // Redirect to Office 365 login
      window.location.href = `${API_BASE_URL}/auth/login`;
    } catch (error) {
      console.error('Login initiation failed:', error);
      dispatch({
        type: AUTH_ACTIONS.SET_ERROR,
        payload: 'Failed to initiate login. Please try again.'
      });
      toast.error('Failed to initiate login. Please try again.');
    }
  };

  /**
   * Logout user
   */
  const logout = async () => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
      
      await axios.post('/auth/logout');
      
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
      
      toast.success('Logged out successfully');
      
      // Redirect to login page
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout failed:', error);
      
      // Even if logout fails on server, clear local state
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
      
      toast.error('Logout failed, but you have been logged out locally');
      window.location.href = '/login';
    }
  };

  /**
   * Get current user information
   */
  const getCurrentUser = async () => {
    try {
      const response = await axios.get('/auth/user');
      
      if (response.data.success) {
        dispatch({
          type: AUTH_ACTIONS.UPDATE_USER,
          payload: response.data.user
        });
        return response.data.user;
      }
    } catch (error) {
      console.error('Failed to get current user:', error);
      
      if (error.response?.status === 401) {
        dispatch({ type: AUTH_ACTIONS.LOGOUT });
      }
    }
    
    return null;
  };

  /**
   * Clear authentication error
   */
  const clearError = () => {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
  };

  /**
   * Check if user has specific role
   */
  const hasRole = (role) => {
    return state.user?.role === role;
  };

  /**
   * Check if user is administrator
   */
  const isAdmin = () => {
    return hasRole('Administrator');
  };

  /**
   * Check if user is demo user
   */
  const isDemoUser = () => {
    return hasRole('Demo User');
  };

  // Context value
  const value = {
    // State
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    error: state.error,
    
    // Actions
    login,
    logout,
    getCurrentUser,
    clearError,
    checkAuthStatus,
    
    // Utility functions
    hasRole,
    isAdmin,
    isDemoUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}

// Higher-order component for role-based access
export function withAuth(WrappedComponent, requiredRole = null) {
  return function AuthenticatedComponent(props) {
    const { isAuthenticated, isLoading, user } = useAuth();
    
    if (isLoading) {
      return <div>Loading...</div>;
    }
    
    if (!isAuthenticated) {
      return <div>Please log in to access this page.</div>;
    }
    
    if (requiredRole && user?.role !== requiredRole) {
      return <div>You don't have permission to access this page.</div>;
    }
    
    return <WrappedComponent {...props} />;
  };
}

export default AuthContext;