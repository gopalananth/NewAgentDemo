const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Database Models for the New Agent Demo Platform
 * 
 * This file defines all the database models and their relationships:
 * - User: Stores user information and roles
 * - Domain: Organizes agents by domain/category
 * - Agent: AI agents with metadata
 * - Question: Questions for agents
 * - Answer: Rich text answers for questions
 * - QuestionVariant: Generated paraphrased question variants
 * - AnswerVariant: Generated paraphrased answer variants  
 * - ChatSession: Demo user chat sessions
 * - ChatMessage: Individual chat messages
 * - AuditLog: Admin activity tracking
 */

// User Model
const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  azure_id: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    validate: {
      isEmail: true
    }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('Administrator', 'Demo User'),
    allowNull: false,
    defaultValue: 'Demo User'
  },
  last_login: {
    type: DataTypes.DATE
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
});

// Domain Model
const Domain = sequelize.define('Domain', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  description: {
    type: DataTypes.TEXT
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: false
  }
});

// Agent Model
const Agent = sequelize.define('Agent', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  environment: {
    type: DataTypes.ENUM('Agentforce', 'Copilot', 'Custom', 'Other'),
    allowNull: false
  },
  version: {
    type: DataTypes.STRING,
    allowNull: false
  },
  last_updated: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  access_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  developed_by: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT
  },
  status: {
    type: DataTypes.ENUM('Draft', 'Final'),
    defaultValue: 'Draft'
  },
  domain_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: false
  }
});

// Question Model
const Question = sequelize.define('Question', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  agent_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  question_text: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('Draft', 'Final'),
    defaultValue: 'Draft'
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: false
  }
});

// Answer Model
const Answer = sequelize.define('Answer', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  question_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  answer_text: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  answer_html: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('Draft', 'Final'),
    defaultValue: 'Draft'
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: false
  }
});

// Question Variant Model (for paraphrased questions)
const QuestionVariant = sequelize.define('QuestionVariant', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  question_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  variant_text: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  is_approved: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
});

// Answer Variant Model (for paraphrased answers)
const AnswerVariant = sequelize.define('AnswerVariant', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  answer_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  variant_text: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  variant_html: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  is_approved: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
});

// Chat Session Model
const ChatSession = sequelize.define('ChatSession', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  agent_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  started_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  ended_at: {
    type: DataTypes.DATE
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
});

// Chat Message Model
const ChatMessage = sequelize.define('ChatMessage', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  session_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  message_type: {
    type: DataTypes.ENUM('user', 'agent'),
    allowNull: false
  },
  message_text: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  message_html: {
    type: DataTypes.TEXT
  },
  question_id: {
    type: DataTypes.UUID
  },
  answer_id: {
    type: DataTypes.UUID
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
});

// Audit Log Model
const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  action: {
    type: DataTypes.STRING,
    allowNull: false
  },
  entity_type: {
    type: DataTypes.STRING,
    allowNull: false
  },
  entity_id: {
    type: DataTypes.UUID
  },
  old_values: {
    type: DataTypes.JSONB
  },
  new_values: {
    type: DataTypes.JSONB
  },
  ip_address: {
    type: DataTypes.STRING
  },
  user_agent: {
    type: DataTypes.STRING
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
});

// Define Associations
// User relationships
User.hasMany(Domain, { foreignKey: 'created_by', as: 'created_domains' });
User.hasMany(Agent, { foreignKey: 'created_by', as: 'created_agents' });
User.hasMany(Question, { foreignKey: 'created_by', as: 'created_questions' });
User.hasMany(Answer, { foreignKey: 'created_by', as: 'created_answers' });
User.hasMany(ChatSession, { foreignKey: 'user_id', as: 'chat_sessions' });
User.hasMany(AuditLog, { foreignKey: 'user_id', as: 'audit_logs' });

// Domain relationships
Domain.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
Domain.hasMany(Agent, { foreignKey: 'domain_id', as: 'agents' });

// Agent relationships
Agent.belongsTo(Domain, { foreignKey: 'domain_id', as: 'domain' });
Agent.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
Agent.hasMany(Question, { foreignKey: 'agent_id', as: 'questions' });
Agent.hasMany(ChatSession, { foreignKey: 'agent_id', as: 'chat_sessions' });

// Question relationships
Question.belongsTo(Agent, { foreignKey: 'agent_id', as: 'agent' });
Question.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
Question.hasOne(Answer, { foreignKey: 'question_id', as: 'answer' });
Question.hasMany(QuestionVariant, { foreignKey: 'question_id', as: 'variants' });
Question.hasMany(ChatMessage, { foreignKey: 'question_id', as: 'chat_messages' });

// Answer relationships
Answer.belongsTo(Question, { foreignKey: 'question_id', as: 'question' });
Answer.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
Answer.hasMany(AnswerVariant, { foreignKey: 'answer_id', as: 'variants' });
Answer.hasMany(ChatMessage, { foreignKey: 'answer_id', as: 'chat_messages' });

// Question Variant relationships
QuestionVariant.belongsTo(Question, { foreignKey: 'question_id', as: 'question' });

// Answer Variant relationships
AnswerVariant.belongsTo(Answer, { foreignKey: 'answer_id', as: 'answer' });

// Chat Session relationships
ChatSession.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
ChatSession.belongsTo(Agent, { foreignKey: 'agent_id', as: 'agent' });
ChatSession.hasMany(ChatMessage, { foreignKey: 'session_id', as: 'messages' });

// Chat Message relationships
ChatMessage.belongsTo(ChatSession, { foreignKey: 'session_id', as: 'session' });
ChatMessage.belongsTo(Question, { foreignKey: 'question_id', as: 'question' });
ChatMessage.belongsTo(Answer, { foreignKey: 'answer_id', as: 'answer' });

// Audit Log relationships
AuditLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

module.exports = {
  sequelize,
  User,
  Domain,
  Agent,
  Question,
  Answer,
  QuestionVariant,
  AnswerVariant,
  ChatSession,
  ChatMessage,
  AuditLog
};