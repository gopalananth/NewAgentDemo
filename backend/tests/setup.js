const { Sequelize } = require('sequelize');
const { User, Domain, Agent, Question, Answer } = require('../models');

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.SESSION_SECRET = 'test-session-secret-key';

// Create in-memory SQLite database for testing
const sequelize = new Sequelize('sqlite::memory:', {
  logging: false, // Disable SQL logging during tests
  dialect: 'sqlite'
});

// Setup test database before all tests
beforeAll(async () => {
  // Override the database connection for tests
  const models = require('../models');
  Object.keys(models).forEach(modelName => {
    if (models[modelName].sequelize) {
      models[modelName].sequelize = sequelize;
    }
  });

  // Sync database
  await sequelize.sync({ force: true });
  
  // Create test data
  await createTestData();
});

// Clean up after all tests
afterAll(async () => {
  await sequelize.close();
});

// Reset database state before each test
beforeEach(async () => {
  // Clear all data except test users
  await Answer.destroy({ where: {} });
  await Question.destroy({ where: {} });
  await Agent.destroy({ where: {} });
  await Domain.destroy({ where: {} });
  
  // Recreate test data
  await createTestData();
});

/**
 * Create test data for use in tests
 */
async function createTestData() {
  // Create test users
  const adminUser = await User.create({
    azure_id: 'test-admin-azure-id',
    email: 'admin@test.com',
    name: 'Test Administrator',
    role: 'Administrator',
    is_active: true
  });

  const demoUser = await User.create({
    azure_id: 'test-demo-azure-id',
    email: 'demo@test.com',
    name: 'Test Demo User',
    role: 'Demo User',
    is_active: true
  });

  // Create test domain
  const domain = await Domain.create({
    name: 'Test Domain',
    description: 'Test domain description',
    is_active: true,
    created_by: adminUser.id
  });

  // Create test agent
  const agent = await Agent.create({
    name: 'Test Agent',
    environment: 'Custom',
    version: '1.0.0',
    developed_by: 'Test Developer',
    description: 'Test agent description',
    status: 'Final',
    domain_id: domain.id,
    created_by: adminUser.id
  });

  // Create test question and answer
  const question = await Question.create({
    agent_id: agent.id,
    question_text: 'What is this test agent?',
    status: 'Final',
    created_by: adminUser.id
  });

  await Answer.create({
    question_id: question.id,
    answer_text: 'This is a test agent for automated testing.',
    answer_html: '<p>This is a test agent for automated testing.</p>',
    status: 'Final',
    created_by: adminUser.id
  });

  // Store references for use in tests
  global.testData = {
    adminUser,
    demoUser,
    domain,
    agent,
    question
  };
}

/**
 * Helper function to create authenticated session for testing
 */
function createAuthenticatedSession(app, user) {
  const request = require('supertest');
  const agent = request.agent(app);
  
  // Mock passport authentication
  agent.user = user;
  
  return agent;
}

/**
 * Helper function to generate JWT token for API testing
 */
function generateTestToken(user) {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    { 
      userId: user.id,
      email: user.email,
      role: user.role 
    },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

/**
 * Helper function to create mock request with user
 */
function createMockRequest(user = null, body = {}, params = {}, query = {}) {
  return {
    user,
    body,
    params,
    query,
    ip: '127.0.0.1',
    get: jest.fn(() => 'test-user-agent'),
    isAuthenticated: jest.fn(() => !!user)
  };
}

/**
 * Helper function to create mock response
 */
function createMockResponse() {
  const res = {
    status: jest.fn(() => res),
    json: jest.fn(() => res),
    send: jest.fn(() => res),
    set: jest.fn(() => res),
    cookie: jest.fn(() => res),
    clearCookie: jest.fn(() => res)
  };
  return res;
}

/**
 * Helper function to create mock next function
 */
function createMockNext() {
  return jest.fn();
}

// Export helper functions
global.testHelpers = {
  createAuthenticatedSession,
  generateTestToken,
  createMockRequest,
  createMockResponse,
  createMockNext,
  sequelize
};

// Mock console methods to reduce test output noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};