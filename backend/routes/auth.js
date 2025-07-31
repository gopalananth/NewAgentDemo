const express = require('express');
const passport = require('../config/passport');
const { ensureAuthenticated } = require('../middleware/auth');
const router = express.Router();

/**
 * Authentication Routes
 * 
 * This module handles Office 365 authentication routes:
 * - Login initiation
 * - Authentication callback
 * - Logout
 * - User session status
 */

/**
 * @route   GET /auth/login
 * @desc    Initiate Office 365 login
 * @access  Public
 */
router.get('/login', (req, res, next) => {
  console.log('🔐 Initiating Office 365 login...');
  
  passport.authenticate('azure-ad', {
    prompt: 'select_account'
  })(req, res, next);
});

/**
 * @route   POST /auth/azure/callback
 * @desc    Handle Office 365 authentication callback
 * @access  Public
 */
router.post('/azure/callback', 
  passport.authenticate('azure-ad', { 
    failureRedirect: '/auth/login/failed',
    failureFlash: true 
  }),
  (req, res) => {
    console.log('✅ Office 365 authentication successful');
    
    // Redirect to frontend with success
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/dashboard`);
  }
);

/**
 * @route   GET /auth/login/failed
 * @desc    Handle failed authentication
 * @access  Public
 */
router.get('/login/failed', (req, res) => {
  console.log('❌ Office 365 authentication failed');
  
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  res.redirect(`${frontendUrl}/login?error=authentication_failed`);
});

/**
 * @route   POST /auth/logout
 * @desc    Logout user and destroy session
 * @access  Private
 */
router.post('/logout', ensureAuthenticated, (req, res) => {
  console.log('🚪 User logging out:', req.user.email);
  
  // Destroy session
  req.logout((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({
        success: false,
        message: 'Error during logout'
      });
    }
    
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destruction error:', err);
        return res.status(500).json({
          success: false,
          message: 'Error destroying session'
        });
      }
      
      res.clearCookie('connect.sid');
      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    });
  });
});

/**
 * @route   GET /auth/user
 * @desc    Get current user information
 * @access  Private
 */
router.get('/user', ensureAuthenticated, (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      lastLogin: req.user.last_login,
      isActive: req.user.is_active
    }
  });
});

/**
 * @route   GET /auth/status
 * @desc    Check authentication status
 * @access  Public
 */
router.get('/status', (req, res) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    res.json({
      success: true,
      authenticated: true,
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role
      }
    });
  } else {
    res.json({
      success: true,
      authenticated: false,
      user: null
    });
  }
});

/**
 * @route   GET /auth/config
 * @desc    Get authentication configuration for frontend
 * @access  Public
 */
router.get('/config', (req, res) => {
  res.json({
    success: true,
    config: {
      loginUrl: '/auth/login',
      logoutUrl: '/auth/logout',
      userUrl: '/auth/user',
      statusUrl: '/auth/status',
      provider: 'Office 365'
    }
  });
});

module.exports = router;