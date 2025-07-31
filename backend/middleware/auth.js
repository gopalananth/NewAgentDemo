const { User, AuditLog } = require('../models');

/**
 * Authentication and Authorization Middleware
 * 
 * This module provides middleware functions for:
 * - Checking if user is authenticated
 * - Role-based access control
 * - Audit logging for admin actions
 */

/**
 * Middleware to ensure user is authenticated
 * Checks if user is logged in via session
 */
const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  
  return res.status(401).json({
    success: false,
    message: 'Authentication required. Please log in.'
  });
};

/**
 * Middleware to ensure user has Administrator role
 * Must be used after ensureAuthenticated
 */
const ensureAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.'
    });
  }

  if (req.user.role !== 'Administrator') {
    return res.status(403).json({
      success: false,
      message: 'Administrator access required.'
    });
  }

  return next();
};

/**
 * Middleware to ensure user has Demo User role
 * Must be used after ensureAuthenticated
 */
const ensureDemoUser = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.'
    });
  }

  if (req.user.role !== 'Demo User') {
    return res.status(403).json({
      success: false,
      message: 'Demo User access required.'
    });
  }

  return next();
};

/**
 * Middleware to allow both Administrator and Demo User roles
 * Must be used after ensureAuthenticated
 */
const ensureUser = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.'
    });
  }

  const allowedRoles = ['Administrator', 'Demo User'];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied.'
    });
  }

  return next();
};

/**
 * Middleware to log admin actions for audit trail
 * Should be used on admin routes that modify data
 */
const auditLog = (action, entityType) => {
  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json;
    
    // Override json method to capture response
    res.json = function(body) {
      // Log the action after successful response
      if (req.user && req.user.role === 'Administrator' && body.success !== false) {
        setImmediate(async () => {
          try {
            await AuditLog.create({
              user_id: req.user.id,
              action: action,
              entity_type: entityType,
              entity_id: req.params.id || req.body.id || null,
              old_values: req.oldValues || null,
              new_values: req.body || null,
              ip_address: req.ip || req.connection.remoteAddress,
              user_agent: req.get('User-Agent') || null
            });
          } catch (error) {
            console.error('Audit log error:', error);
          }
        });
      }
      
      // Call original json method
      originalJson.call(this, body);
    };

    next();
  };
};

/**
 * Middleware to capture old values before update/delete operations
 * Used for audit logging
 */
const captureOldValues = (Model, idParam = 'id') => {
  return async (req, res, next) => {
    try {
      if (req.params[idParam]) {
        const record = await Model.findByPk(req.params[idParam]);
        if (record) {
          req.oldValues = record.toJSON();
        }
      }
      next();
    } catch (error) {
      console.error('Error capturing old values:', error);
      next();
    }
  };
};

/**
 * Middleware to check if user account is active
 */
const ensureActiveUser = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.'
    });
  }

  if (!req.user.is_active) {
    return res.status(403).json({
      success: false,
      message: 'Account is deactivated. Please contact administrator.'
    });
  }

  return next();
};

/**
 * Middleware to extract user info for logging
 */
const extractUserInfo = (req, res, next) => {
  if (req.user) {
    req.userInfo = {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      role: req.user.role
    };
  }
  next();
};

module.exports = {
  ensureAuthenticated,
  ensureAdmin,
  ensureDemoUser,
  ensureUser,
  ensureActiveUser,
  auditLog,
  captureOldValues,
  extractUserInfo
};