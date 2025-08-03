const Joi = require('joi');
const { ValidationError } = require('../utils/errors');

/**
 * Input Validation Middleware
 * 
 * Provides comprehensive input validation using Joi schemas to:
 * - Validate request body, params, and query parameters
 * - Sanitize user inputs
 * - Prevent injection attacks
 * - Ensure data integrity
 */

/**
 * Common validation schemas
 */
const commonSchemas = {
  uuid: Joi.string().uuid().required(),
  email: Joi.string().email().max(255).required(),
  name: Joi.string().min(1).max(255).trim().required(),
  description: Joi.string().max(2000).trim().allow(''),
  status: Joi.string().valid('Draft', 'Final').required(),
  role: Joi.string().valid('Administrator', 'Demo User').required(),
  environment: Joi.string().valid('Agentforce', 'Copilot', 'Custom', 'Other').required(),
  version: Joi.string().max(50).trim().required(),
  pagination: {
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().max(50).default('created_at'),
    sortOrder: Joi.string().valid('ASC', 'DESC').default('DESC')
  }
};

/**
 * Domain validation schemas
 */
const domainSchemas = {
  create: Joi.object({
    name: commonSchemas.name,
    description: commonSchemas.description
  }),
  
  update: Joi.object({
    name: commonSchemas.name.optional(),
    description: commonSchemas.description,
    is_active: Joi.boolean()
  }).min(1),
  
  params: Joi.object({
    id: commonSchemas.uuid
  }),
  
  query: Joi.object({
    ...commonSchemas.pagination,
    search: Joi.string().max(255).trim(),
    is_active: Joi.boolean()
  })
};

/**
 * Agent validation schemas
 */
const agentSchemas = {
  create: Joi.object({
    name: commonSchemas.name,
    environment: commonSchemas.environment,
    version: commonSchemas.version,
    developed_by: Joi.string().min(1).max(255).trim().required(),
    description: commonSchemas.description,
    domain_id: commonSchemas.uuid
  }),
  
  update: Joi.object({
    name: commonSchemas.name.optional(),
    environment: commonSchemas.environment.optional(),
    version: commonSchemas.version.optional(),
    developed_by: Joi.string().min(1).max(255).trim(),
    description: commonSchemas.description,
    domain_id: commonSchemas.uuid.optional()
  }).min(1),
  
  updateStatus: Joi.object({
    status: commonSchemas.status
  }),
  
  params: Joi.object({
    id: commonSchemas.uuid,
    domainId: commonSchemas.uuid.optional()
  }),
  
  query: Joi.object({
    ...commonSchemas.pagination,
    search: Joi.string().max(255).trim(),
    status: Joi.string().valid('Draft', 'Final'),
    environment: commonSchemas.environment.optional(),
    domain_id: commonSchemas.uuid.optional()
  })
};

/**
 * Question and Answer validation schemas
 */
const qaSchemas = {
  createQuestion: Joi.object({
    question_text: Joi.string().min(5).max(2000).trim().required(),
    answer_text: Joi.string().min(5).max(10000).trim().required(),
    answer_html: Joi.string().max(15000).trim().required()
  }),
  
  updateQuestion: Joi.object({
    question_text: Joi.string().min(5).max(2000).trim(),
    answer_text: Joi.string().min(5).max(10000).trim(),
    answer_html: Joi.string().max(15000).trim()
  }).min(1),
  
  updateStatus: Joi.object({
    status: commonSchemas.status
  }),
  
  params: Joi.object({
    id: commonSchemas.uuid,
    agentId: commonSchemas.uuid.optional(),
    questionId: commonSchemas.uuid.optional()
  }),
  
  query: Joi.object({
    ...commonSchemas.pagination,
    search: Joi.string().max(255).trim(),
    status: Joi.string().valid('Draft', 'Final')
  })
};

/**
 * Chat validation schemas
 */
const chatSchemas = {
  startSession: Joi.object({
    agent_id: commonSchemas.uuid
  }),
  
  sendMessage: Joi.object({
    message: Joi.string().min(1).max(2000).trim().required()
  }),
  
  params: Joi.object({
    id: commonSchemas.uuid,
    sessionId: commonSchemas.uuid.optional()
  }),
  
  query: Joi.object({
    ...commonSchemas.pagination
  })
};

/**
 * User validation schemas
 */
const userSchemas = {
  update: Joi.object({
    name: commonSchemas.name.optional(),
    role: commonSchemas.role.optional(),
    is_active: Joi.boolean()
  }).min(1),
  
  params: Joi.object({
    id: commonSchemas.uuid
  }),
  
  query: Joi.object({
    ...commonSchemas.pagination,
    search: Joi.string().max(255).trim(),
    role: commonSchemas.role.optional(),
    is_active: Joi.boolean()
  })
};

/**
 * Create validation middleware for a specific schema
 */
function validate(schema, property = 'body') {
  return (req, res, next) => {
    const data = req[property];
    
    const { error, value } = schema.validate(data, {
      abortEarly: false, // Return all errors
      stripUnknown: true, // Remove unknown properties
      convert: true // Convert types (e.g., string to number)
    });
    
    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context.value
      }));
      
      throw new ValidationError('Input validation failed', details);
    }
    
    // Replace request data with validated and sanitized data
    req[property] = value;
    next();
  };
}

/**
 * Validate multiple properties (body, params, query)
 */
function validateMultiple(schemas) {
  return (req, res, next) => {
    const errors = [];
    
    // Validate each property if schema is provided
    Object.entries(schemas).forEach(([property, schema]) => {
      if (schema && req[property] !== undefined) {
        const { error, value } = schema.validate(req[property], {
          abortEarly: false,
          stripUnknown: true,
          convert: true
        });
        
        if (error) {
          const details = error.details.map(detail => ({
            property,
            field: detail.path.join('.'),
            message: detail.message,
            value: detail.context.value
          }));
          errors.push(...details);
        } else {
          req[property] = value;
        }
      }
    });
    
    if (errors.length > 0) {
      throw new ValidationError('Input validation failed', errors);
    }
    
    next();
  };
}

/**
 * Sanitize HTML input to prevent XSS attacks
 */
function sanitizeHtml(req, res, next) {
  const DOMPurify = require('isomorphic-dompurify');
  
  // Sanitize HTML fields in request body
  if (req.body) {
    ['answer_html', 'description_html', 'content_html'].forEach(field => {
      if (req.body[field]) {
        req.body[field] = DOMPurify.sanitize(req.body[field], {
          ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'blockquote'],
          ALLOWED_ATTR: ['href', 'title', 'target'],
          ALLOW_DATA_ATTR: false
        });
      }
    });
  }
  
  next();
}

/**
 * Pre-built validation middleware for common endpoints
 */
const validators = {
  // Domain validators
  domain: {
    create: validate(domainSchemas.create),
    update: validateMultiple({
      body: domainSchemas.update,
      params: domainSchemas.params
    }),
    getById: validate(domainSchemas.params, 'params'),
    list: validate(domainSchemas.query, 'query'),
    delete: validate(domainSchemas.params, 'params')
  },
  
  // Agent validators
  agent: {
    create: validate(agentSchemas.create),
    update: validateMultiple({
      body: agentSchemas.update,
      params: agentSchemas.params
    }),
    updateStatus: validateMultiple({
      body: agentSchemas.updateStatus,
      params: agentSchemas.params
    }),
    getById: validate(agentSchemas.params, 'params'),
    list: validate(agentSchemas.query, 'query'),
    delete: validate(agentSchemas.params, 'params')
  },
  
  // Q&A validators
  qa: {
    createQuestion: validateMultiple({
      body: qaSchemas.createQuestion,
      params: { agentId: commonSchemas.uuid }
    }),
    updateQuestion: validateMultiple({
      body: qaSchemas.updateQuestion,
      params: qaSchemas.params
    }),
    updateStatus: validateMultiple({
      body: qaSchemas.updateStatus,
      params: qaSchemas.params
    }),
    getById: validate(qaSchemas.params, 'params'),
    list: validateMultiple({
      params: { agentId: commonSchemas.uuid },
      query: qaSchemas.query
    }),
    delete: validate(qaSchemas.params, 'params')
  },
  
  // Chat validators
  chat: {
    startSession: validate(chatSchemas.startSession),
    sendMessage: validateMultiple({
      body: chatSchemas.sendMessage,
      params: { sessionId: commonSchemas.uuid }
    }),
    getHistory: validate(chatSchemas.params, 'params'),
    endSession: validate(chatSchemas.params, 'params'),
    getSessions: validate(chatSchemas.query, 'query')
  },
  
  // User validators
  user: {
    update: validateMultiple({
      body: userSchemas.update,
      params: userSchemas.params
    }),
    getById: validate(userSchemas.params, 'params'),
    list: validate(userSchemas.query, 'query')
  }
};

module.exports = {
  validate,
  validateMultiple,
  sanitizeHtml,
  validators,
  schemas: {
    domain: domainSchemas,
    agent: agentSchemas,
    qa: qaSchemas,
    chat: chatSchemas,
    user: userSchemas,
    common: commonSchemas
  }
};