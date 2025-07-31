const express = require('express');
const { body, validationResult } = require('express-validator');
const { ensureAuthenticated, ensureAdmin, auditLog, captureOldValues } = require('../middleware/auth');
const { Domain, Agent, Question, Answer, QuestionVariant, AnswerVariant, User } = require('../models');
const { generateVariants } = require('../services/textVariantService');
const router = express.Router();

/**
 * Admin Routes
 * 
 * This module handles all administrator functionality:
 * - Domain management
 * - Agent management with metadata
 * - Q&A management with rich text and variants
 * - Publication workflow (Draft/Final status)
 */

// Apply authentication and admin authorization to all admin routes
router.use(ensureAuthenticated, ensureAdmin);

// =============================================================================
// DOMAIN MANAGEMENT ROUTES
// =============================================================================

/**
 * @route   GET /admin/domains
 * @desc    Get all domains for administrator
 * @access  Private (Admin only)
 */
router.get('/domains', async (req, res) => {
  try {
    const domains = await Domain.findAll({
      include: [{
        model: Agent,
        as: 'agents',
        attributes: ['id', 'name', 'status']
      }, {
        model: User,
        as: 'creator',
        attributes: ['name', 'email']
      }],
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      domains
    });
  } catch (error) {
    console.error('Error fetching domains:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching domains'
    });
  }
});

/**
 * @route   POST /admin/domains
 * @desc    Create new domain
 * @access  Private (Admin only)
 */
router.post('/domains', [
  body('name').trim().isLength({ min: 1 }).withMessage('Domain name is required'),
  body('description').optional().trim()
], auditLog('CREATE', 'Domain'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, description } = req.body;

    // Check if domain name already exists
    const existingDomain = await Domain.findOne({ where: { name } });
    if (existingDomain) {
      return res.status(400).json({
        success: false,
        message: 'Domain name already exists'
      });
    }

    const domain = await Domain.create({
      name,
      description,
      created_by: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Domain created successfully',
      domain
    });
  } catch (error) {
    console.error('Error creating domain:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating domain'
    });
  }
});

/**
 * @route   PUT /admin/domains/:id
 * @desc    Update domain
 * @access  Private (Admin only)
 */
router.put('/domains/:id', [
  body('name').trim().isLength({ min: 1 }).withMessage('Domain name is required'),
  body('description').optional().trim()
], captureOldValues(Domain), auditLog('UPDATE', 'Domain'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, description, is_active } = req.body;
    const domain = await Domain.findByPk(req.params.id);

    if (!domain) {
      return res.status(404).json({
        success: false,
        message: 'Domain not found'
      });
    }

    // Check if domain name already exists (excluding current domain)
    if (name !== domain.name) {
      const existingDomain = await Domain.findOne({ 
        where: { name, id: { [require('sequelize').Op.ne]: req.params.id } }
      });
      if (existingDomain) {
        return res.status(400).json({
          success: false,
          message: 'Domain name already exists'
        });
      }
    }

    await domain.update({
      name,
      description,
      is_active: is_active !== undefined ? is_active : domain.is_active
    });

    res.json({
      success: true,
      message: 'Domain updated successfully',
      domain
    });
  } catch (error) {
    console.error('Error updating domain:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating domain'
    });
  }
});

/**
 * @route   DELETE /admin/domains/:id
 * @desc    Delete domain (if no agents exist)
 * @access  Private (Admin only)
 */
router.delete('/domains/:id', captureOldValues(Domain), auditLog('DELETE', 'Domain'), async (req, res) => {
  try {
    const domain = await Domain.findByPk(req.params.id, {
      include: [{ model: Agent, as: 'agents' }]
    });

    if (!domain) {
      return res.status(404).json({
        success: false,
        message: 'Domain not found'
      });
    }

    if (domain.agents && domain.agents.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete domain with existing agents. Please move or delete agents first.'
      });
    }

    await domain.destroy();

    res.json({
      success: true,
      message: 'Domain deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting domain:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting domain'
    });
  }
});

// =============================================================================
// AGENT MANAGEMENT ROUTES
// =============================================================================

/**
 * @route   GET /admin/agents
 * @desc    Get all agents with metadata
 * @access  Private (Admin only)
 */
router.get('/agents', async (req, res) => {
  try {
    const agents = await Agent.findAll({
      include: [{
        model: Domain,
        as: 'domain',
        attributes: ['id', 'name']
      }, {
        model: User,
        as: 'creator',
        attributes: ['name', 'email']
      }, {
        model: Question,
        as: 'questions',
        include: [{
          model: Answer,
          as: 'answer'
        }]
      }],
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      agents
    });
  } catch (error) {
    console.error('Error fetching agents:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching agents'
    });
  }
});

/**
 * @route   POST /admin/agents
 * @desc    Create new agent
 * @access  Private (Admin only)
 */
router.post('/agents', [
  body('name').trim().isLength({ min: 1 }).withMessage('Agent name is required'),
  body('environment').isIn(['Agentforce', 'Copilot', 'Custom', 'Other']).withMessage('Valid environment is required'),
  body('version').trim().isLength({ min: 1 }).withMessage('Version is required'),
  body('developed_by').trim().isLength({ min: 1 }).withMessage('Developed by is required'),
  body('domain_id').isUUID().withMessage('Valid domain ID is required'),
  body('description').optional().trim()
], auditLog('CREATE', 'Agent'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, environment, version, developed_by, description, domain_id } = req.body;

    // Verify domain exists
    const domain = await Domain.findByPk(domain_id);
    if (!domain) {
      return res.status(400).json({
        success: false,
        message: 'Invalid domain ID'
      });
    }

    const agent = await Agent.create({
      name,
      environment,
      version,
      developed_by,
      description,
      domain_id,
      created_by: req.user.id,
      last_updated: new Date()
    });

    // Fetch agent with relationships for response
    const agentWithRelations = await Agent.findByPk(agent.id, {
      include: [{
        model: Domain,
        as: 'domain',
        attributes: ['id', 'name']
      }]
    });

    res.status(201).json({
      success: true,
      message: 'Agent created successfully',
      agent: agentWithRelations
    });
  } catch (error) {
    console.error('Error creating agent:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating agent'
    });
  }
});

/**
 * @route   PUT /admin/agents/:id
 * @desc    Update agent
 * @access  Private (Admin only)
 */
router.put('/agents/:id', [
  body('name').trim().isLength({ min: 1 }).withMessage('Agent name is required'),
  body('environment').isIn(['Agentforce', 'Copilot', 'Custom', 'Other']).withMessage('Valid environment is required'),
  body('version').trim().isLength({ min: 1 }).withMessage('Version is required'),
  body('developed_by').trim().isLength({ min: 1 }).withMessage('Developed by is required'),
  body('domain_id').isUUID().withMessage('Valid domain ID is required'),
  body('description').optional().trim()
], captureOldValues(Agent), auditLog('UPDATE', 'Agent'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, environment, version, developed_by, description, domain_id, status } = req.body;
    const agent = await Agent.findByPk(req.params.id);

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    // Verify domain exists
    const domain = await Domain.findByPk(domain_id);
    if (!domain) {
      return res.status(400).json({
        success: false,
        message: 'Invalid domain ID'
      });
    }

    await agent.update({
      name,
      environment,
      version,
      developed_by,
      description,
      domain_id,
      status: status || agent.status,
      last_updated: new Date()
    });

    // Fetch updated agent with relationships
    const updatedAgent = await Agent.findByPk(agent.id, {
      include: [{
        model: Domain,
        as: 'domain',
        attributes: ['id', 'name']
      }]
    });

    res.json({
      success: true,
      message: 'Agent updated successfully',
      agent: updatedAgent
    });
  } catch (error) {
    console.error('Error updating agent:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating agent'
    });
  }
});

/**
 * @route   DELETE /admin/agents/:id
 * @desc    Delete agent and all associated Q&A
 * @access  Private (Admin only)
 */
router.delete('/agents/:id', captureOldValues(Agent), auditLog('DELETE', 'Agent'), async (req, res) => {
  try {
    const agent = await Agent.findByPk(req.params.id);

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    // Delete agent (cascading delete will handle Q&A)
    await agent.destroy();

    res.json({
      success: true,
      message: 'Agent deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting agent:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting agent'
    });
  }
});

/**
 * @route   PUT /admin/agents/:id/status
 * @desc    Update agent status (Draft/Final)
 * @access  Private (Admin only)
 */
router.put('/agents/:id/status', [
  body('status').isIn(['Draft', 'Final']).withMessage('Status must be Draft or Final')
], captureOldValues(Agent), auditLog('UPDATE_STATUS', 'Agent'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const agent = await Agent.findByPk(req.params.id);
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    await agent.update({ status: req.body.status });

    res.json({
      success: true,
      message: `Agent status updated to ${req.body.status}`,
      agent
    });
  } catch (error) {
    console.error('Error updating agent status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating agent status'
    });
  }
});

// =============================================================================
// Q&A MANAGEMENT ROUTES
// =============================================================================

/**
 * @route   GET /admin/agents/:agentId/questions
 * @desc    Get all questions and answers for an agent
 * @access  Private (Admin only)
 */
router.get('/agents/:agentId/questions', async (req, res) => {
  try {
    const questions = await Question.findAll({
      where: { agent_id: req.params.agentId },
      include: [{
        model: Answer,
        as: 'answer',
        include: [{
          model: AnswerVariant,
          as: 'variants'
        }]
      }, {
        model: QuestionVariant,
        as: 'variants'
      }],
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      questions
    });
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching questions'
    });
  }
});

/**
 * @route   POST /admin/agents/:agentId/questions
 * @desc    Create question and answer with variants
 * @access  Private (Admin only)
 */
router.post('/agents/:agentId/questions', [
  body('question_text').trim().isLength({ min: 1 }).withMessage('Question text is required'),
  body('answer_text').trim().isLength({ min: 1 }).withMessage('Answer text is required'),
  body('answer_html').trim().isLength({ min: 1 }).withMessage('Answer HTML is required')
], auditLog('CREATE', 'Question'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { question_text, answer_text, answer_html } = req.body;
    const agentId = req.params.agentId;

    // Verify agent exists
    const agent = await Agent.findByPk(agentId);
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    // Create question
    const question = await Question.create({
      agent_id: agentId,
      question_text,
      created_by: req.user.id
    });

    // Create answer
    const answer = await Answer.create({
      question_id: question.id,
      answer_text,
      answer_html,
      created_by: req.user.id
    });

    // Generate question variants
    const questionVariants = generateVariants(question_text, 'question');
    for (const variant of questionVariants) {
      await QuestionVariant.create({
        question_id: question.id,
        variant_text: variant.text
      });
    }

    // Generate answer variants
    const answerVariants = generateVariants(answer_text, 'answer', answer_html);
    for (const variant of answerVariants) {
      await AnswerVariant.create({
        answer_id: answer.id,
        variant_text: variant.text,
        variant_html: variant.html
      });
    }

    // Fetch complete question with all relationships
    const completeQuestion = await Question.findByPk(question.id, {
      include: [{
        model: Answer,
        as: 'answer',
        include: [{
          model: AnswerVariant,
          as: 'variants'
        }]
      }, {
        model: QuestionVariant,
        as: 'variants'
      }]
    });

    res.status(201).json({
      success: true,
      message: 'Question and answer created successfully with variants',
      question: completeQuestion
    });
  } catch (error) {
    console.error('Error creating question:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating question and answer'
    });
  }
});

/**
 * @route   PUT /admin/questions/:id
 * @desc    Update question and regenerate variants
 * @access  Private (Admin only)
 */
router.put('/questions/:id', [
  body('question_text').trim().isLength({ min: 1 }).withMessage('Question text is required'),
  body('answer_text').trim().isLength({ min: 1 }).withMessage('Answer text is required'),
  body('answer_html').trim().isLength({ min: 1 }).withMessage('Answer HTML is required')
], captureOldValues(Question), auditLog('UPDATE', 'Question'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { question_text, answer_text, answer_html, status } = req.body;
    
    const question = await Question.findByPk(req.params.id, {
      include: [{
        model: Answer,
        as: 'answer'
      }]
    });

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    // Update question
    await question.update({
      question_text,
      status: status || 'Draft' // Reset to Draft when edited
    });

    // Update answer
    await question.answer.update({
      answer_text,
      answer_html,
      status: status || 'Draft'
    });

    // Delete existing variants
    await QuestionVariant.destroy({ where: { question_id: question.id } });
    await AnswerVariant.destroy({ where: { answer_id: question.answer.id } });

    // Generate new variants
    const questionVariants = generateVariants(question_text, 'question');
    for (const variant of questionVariants) {
      await QuestionVariant.create({
        question_id: question.id,
        variant_text: variant.text
      });
    }

    const answerVariants = generateVariants(answer_text, 'answer', answer_html);
    for (const variant of answerVariants) {
      await AnswerVariant.create({
        answer_id: question.answer.id,
        variant_text: variant.text,
        variant_html: variant.html
      });
    }

    // Fetch updated question with all relationships
    const updatedQuestion = await Question.findByPk(question.id, {
      include: [{
        model: Answer,
        as: 'answer',
        include: [{
          model: AnswerVariant,
          as: 'variants'
        }]
      }, {
        model: QuestionVariant,
        as: 'variants'
      }]
    });

    res.json({
      success: true,
      message: 'Question and answer updated successfully',
      question: updatedQuestion
    });
  } catch (error) {
    console.error('Error updating question:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating question and answer'
    });
  }
});

/**
 * @route   DELETE /admin/questions/:id
 * @desc    Delete question and associated answer/variants
 * @access  Private (Admin only)
 */
router.delete('/questions/:id', captureOldValues(Question), auditLog('DELETE', 'Question'), async (req, res) => {
  try {
    const question = await Question.findByPk(req.params.id);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    await question.destroy();

    res.json({
      success: true,
      message: 'Question deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting question'
    });
  }
});

/**
 * @route   PUT /admin/questions/:id/status
 * @desc    Update question/answer status (Draft/Final)
 * @access  Private (Admin only)
 */
router.put('/questions/:id/status', [
  body('status').isIn(['Draft', 'Final']).withMessage('Status must be Draft or Final')
], captureOldValues(Question), auditLog('UPDATE_STATUS', 'Question'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const question = await Question.findByPk(req.params.id, {
      include: [{ model: Answer, as: 'answer' }]
    });

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    const status = req.body.status;

    // Update both question and answer status
    await question.update({ status });
    if (question.answer) {
      await question.answer.update({ status });
    }

    res.json({
      success: true,
      message: `Question status updated to ${status}`,
      question
    });
  } catch (error) {
    console.error('Error updating question status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating question status'
    });
  }
});

module.exports = router;