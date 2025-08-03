const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const rateLimit = require('express-rate-limit');
const passport = require('./config/passport');
const { testConnection, sequelize } = require('./config/database');
require('dotenv').config();

/**
 * New Agent Demo Platform - Express Server
 * 
 * This is the main server file that sets up:
 * - Express application with security middleware
 * - Database connection and models
 * - Session management with PostgreSQL storage
 * - Office 365 authentication
 * - API routes for admin and demo functionality
 * - Error handling and logging
 */

const app = express();
const PORT = process.env.PORT || 3001;

// =============================================================================
// MIDDLEWARE CONFIGURATION
// =============================================================================

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https://login.microsoftonline.com"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://localhost:3000',
      'https://login.microsoftonline.com'
    ];
    
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', limiter);

// Logging
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Trust proxy (important for Azure deployment)
app.set('trust proxy', 1);

// =============================================================================
// SESSION CONFIGURATION
// =============================================================================

// Session store using PostgreSQL
const sessionStore = new SequelizeStore({
  db: sequelize,
  tableName: 'Sessions',
  checkExpirationInterval: 15 * 60 * 1000, // Clean up expired sessions every 15 minutes
  expiration: 24 * 60 * 60 * 1000 // 24 hours
});

// Session configuration
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'your-super-secret-session-key',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Only send over HTTPS in production
    httpOnly: true, // Prevent XSS attacks
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  },
  name: 'newagentdemo.sid'
};

app.use(session(sessionConfig));

// =============================================================================
// PASSPORT CONFIGURATION
// =============================================================================

app.use(passport.initialize());
app.use(passport.session());

// =============================================================================
// ROUTES
// =============================================================================

// Import health service
const healthService = require('./services/healthService');

// Basic health check endpoint (liveness probe)
app.get('/health', async (req, res) => {
  const health = await healthService.quickHealthCheck();
  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

// Detailed health check endpoint (readiness probe)
app.get('/health/detailed', async (req, res) => {
  const health = await healthService.comprehensiveHealthCheck();
  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

// Metrics endpoint for monitoring
app.get('/metrics', async (req, res) => {
  const health = await healthService.comprehensiveHealthCheck();
  
  // Convert to Prometheus-style metrics format (basic implementation)
  const metrics = [
    `# HELP app_health_status Application health status (1=healthy, 0=unhealthy)`,
    `# TYPE app_health_status gauge`,
    `app_health_status{service="new-agent-demo"} ${health.status === 'healthy' ? 1 : 0}`,
    '',
    `# HELP app_uptime_seconds Application uptime in seconds`,
    `# TYPE app_uptime_seconds counter`,
    `app_uptime_seconds{service="new-agent-demo"} ${Math.floor((Date.now() - healthService.startTime) / 1000)}`,
    ''
  ];

  // Add individual check metrics
  for (const [checkName, checkResult] of Object.entries(health.checks)) {
    metrics.push(`# HELP app_check_${checkName}_status Health check status for ${checkName} (1=healthy, 0=unhealthy)`);
    metrics.push(`# TYPE app_check_${checkName}_status gauge`);
    metrics.push(`app_check_${checkName}_status{service="new-agent-demo"} ${checkResult.status === 'healthy' ? 1 : 0}`);
    
    if (checkResult.duration !== undefined) {
      metrics.push(`# HELP app_check_${checkName}_duration_ms Health check duration for ${checkName} in milliseconds`);
      metrics.push(`# TYPE app_check_${checkName}_duration_ms gauge`);
      metrics.push(`app_check_${checkName}_duration_ms{service="new-agent-demo"} ${checkResult.duration}`);
    }
    metrics.push('');
  }

  res.set('Content-Type', 'text/plain');
  res.send(metrics.join('\n'));
});

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    service: 'New Agent Demo Platform API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      admin: '/api/admin',
      demo: '/api/demo'
    },
    documentation: 'See README.md for detailed API documentation'
  });
});

// Authentication routes
app.use('/api/auth', require('./routes/auth'));

// Admin routes (domain management, agent management, Q&A management)
app.use('/api/admin', require('./routes/admin'));

// Demo user routes (view agents, chat functionality)
app.use('/api/demo', require('./routes/demo'));

// =============================================================================
// ERROR HANDLING
// =============================================================================

// Import enhanced error handlers
const { errorHandler, notFoundHandler } = require('./utils/errors');

// 404 handler for non-existent routes
app.use(notFoundHandler);

// Global error handler with structured error responses
app.use(errorHandler);

// =============================================================================
// DATABASE INITIALIZATION AND SERVER STARTUP
// =============================================================================

async function initializeServer() {
  try {
    console.log('🚀 Starting New Agent Demo Platform...');

    // Test database connection
    await testConnection();

    // Sync database models
    console.log('📊 Synchronizing database models...');
    await sequelize.sync({ alter: true }); // Use { force: true } only for development reset
    
    // Create session table
    await sessionStore.sync();
    
    console.log('✅ Database models synchronized successfully');

    // Start server
    app.listen(PORT, () => {
      console.log(`🌐 Server running on port ${PORT}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
      console.log(`🔑 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
      console.log('');
      console.log('📋 Available endpoints:');
      console.log('   - GET  /health               (Health check)');
      console.log('   - GET  /api                  (API documentation)');
      console.log('   - POST /api/auth/login       (Office 365 login)');
      console.log('   - GET  /api/auth/status      (Authentication status)');
      console.log('   - GET  /api/admin/domains    (Admin: Domain management)');
      console.log('   - GET  /api/admin/agents     (Admin: Agent management)');
      console.log('   - GET  /api/demo/domains     (Demo: View available agents)');
      console.log('');
      console.log('🔐 Authentication: Office 365 (Azure AD)');
      console.log('👥 User Roles: Administrator, Demo User');
      console.log('');
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('📴 SIGTERM received, shutting down gracefully...');
  await sequelize.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('📴 SIGINT received, shutting down gracefully...');
  await sequelize.close();
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Initialize and start the server
initializeServer();

module.exports = app;