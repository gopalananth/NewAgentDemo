/**
 * Custom Error Classes and Error Handling Utilities
 * 
 * This module provides:
 * - Custom error classes for different error types
 * - Structured error response formatting
 * - Error logging utilities
 * - Error handling middleware
 */

/**
 * Base application error class
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    this.timestamp = new Date().toISOString();

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert error to JSON format for API responses
   */
  toJSON() {
    return {
      success: false,
      error: {
        name: this.name,
        message: this.message,
        code: this.code,
        statusCode: this.statusCode,
        timestamp: this.timestamp,
        ...(this.details && { details: this.details })
      }
    };
  }
}

/**
 * Validation error for input validation failures
 */
class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

/**
 * Authentication error for auth failures
 */
class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

/**
 * Authorization error for permission failures
 */
class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

/**
 * Not found error for missing resources
 */
class NotFoundError extends AppError {
  constructor(resource = 'Resource', id = null) {
    const message = id ? `${resource} with ID '${id}' not found` : `${resource} not found`;
    super(message, 404, 'NOT_FOUND_ERROR', { resource, id });
  }
}

/**
 * Conflict error for duplicate resources or constraint violations
 */
class ConflictError extends AppError {
  constructor(message, details = null) {
    super(message, 409, 'CONFLICT_ERROR', details);
  }
}

/**
 * Rate limit error for too many requests
 */
class RateLimitError extends AppError {
  constructor(message = 'Too many requests. Please try again later.') {
    super(message, 429, 'RATE_LIMIT_ERROR');
  }
}

/**
 * Database error for database-related failures
 */
class DatabaseError extends AppError {
  constructor(message, originalError = null) {
    super(message, 500, 'DATABASE_ERROR', {
      originalError: originalError?.message,
      sqlState: originalError?.parent?.code
    });
  }
}

/**
 * External service error for third-party API failures
 */
class ExternalServiceError extends AppError {
  constructor(service, message, statusCode = 502) {
    super(`${service} service error: ${message}`, statusCode, 'EXTERNAL_SERVICE_ERROR', {
      service
    });
  }
}

/**
 * Error formatter for consistent API responses
 */
class ErrorFormatter {
  /**
   * Format error for production response (hide sensitive information)
   */
  static formatForProduction(error) {
    if (error instanceof AppError) {
      return error.toJSON();
    }

    // For non-operational errors, return generic message
    return {
      success: false,
      error: {
        name: 'InternalServerError',
        message: 'An unexpected error occurred',
        code: 'INTERNAL_ERROR',
        statusCode: 500,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Format error for development response (include stack trace)
   */
  static formatForDevelopment(error) {
    if (error instanceof AppError) {
      const errorResponse = error.toJSON();
      errorResponse.error.stack = error.stack;
      return errorResponse;
    }

    // For non-operational errors, include full details in development
    return {
      success: false,
      error: {
        name: error.name || 'Error',
        message: error.message || 'An unexpected error occurred',
        code: 'INTERNAL_ERROR',
        statusCode: 500,
        timestamp: new Date().toISOString(),
        stack: error.stack
      }
    };
  }

  /**
   * Format error based on environment
   */
  static format(error, environment = process.env.NODE_ENV) {
    if (environment === 'production') {
      return this.formatForProduction(error);
    }
    return this.formatForDevelopment(error);
  }
}

/**
 * Error logger with structured logging
 */
class ErrorLogger {
  /**
   * Log error with structured format
   */
  static log(error, context = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      message: error.message,
      name: error.name,
      ...(error instanceof AppError && {
        code: error.code,
        statusCode: error.statusCode,
        isOperational: error.isOperational
      }),
      context,
      stack: error.stack
    };

    // In production, you might want to send this to a logging service
    // For now, we'll use console.error with structured format
    console.error(JSON.stringify(logEntry, null, 2));
  }

  /**
   * Log error with request context
   */
  static logWithRequest(error, req) {
    const context = {
      url: req.url,
      method: req.method,
      headers: req.headers,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id,
      userEmail: req.user?.email,
      body: req.body,
      params: req.params,
      query: req.query
    };

    this.log(error, context);
  }
}

/**
 * Express error handling middleware
 */
const errorHandler = (error, req, res, next) => {
  // Log the error
  ErrorLogger.logWithRequest(error, req);

  // Handle specific Sequelize errors
  if (error.name === 'SequelizeValidationError') {
    const validationError = new ValidationError(
      'Validation failed',
      error.errors.map(err => ({
        field: err.path,
        message: err.message,
        value: err.value
      }))
    );
    const response = ErrorFormatter.format(validationError);
    return res.status(validationError.statusCode).json(response);
  }

  if (error.name === 'SequelizeUniqueConstraintError') {
    const conflictError = new ConflictError(
      'Resource already exists',
      {
        fields: error.errors.map(err => err.path),
        values: error.errors.map(err => err.value)
      }
    );
    const response = ErrorFormatter.format(conflictError);
    return res.status(conflictError.statusCode).json(response);
  }

  if (error.name === 'SequelizeForeignKeyConstraintError') {
    const validationError = new ValidationError(
      'Invalid reference to related resource',
      {
        table: error.table,
        constraint: error.constraint
      }
    );
    const response = ErrorFormatter.format(validationError);
    return res.status(validationError.statusCode).json(response);
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    const authError = new AuthenticationError('Invalid token');
    const response = ErrorFormatter.format(authError);
    return res.status(authError.statusCode).json(response);
  }

  if (error.name === 'TokenExpiredError') {
    const authError = new AuthenticationError('Token expired');
    const response = ErrorFormatter.format(authError);
    return res.status(authError.statusCode).json(response);
  }

  // Handle rate limit errors
  if (error.status === 429) {
    const rateLimitError = new RateLimitError();
    const response = ErrorFormatter.format(rateLimitError);
    return res.status(rateLimitError.statusCode).json(response);
  }

  // Handle application errors
  if (error instanceof AppError) {
    const response = ErrorFormatter.format(error);
    return res.status(error.statusCode).json(response);
  }

  // Handle unknown errors
  const response = ErrorFormatter.format(error);
  const statusCode = error.statusCode || 500;
  res.status(statusCode).json(response);
};

/**
 * Async wrapper to catch async errors in route handlers
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 404 handler for non-existent routes
 */
const notFoundHandler = (req, res, next) => {
  const error = new NotFoundError('Endpoint', req.path);
  next(error);
};

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  DatabaseError,
  ExternalServiceError,
  ErrorFormatter,
  ErrorLogger,
  errorHandler,
  asyncHandler,
  notFoundHandler
};