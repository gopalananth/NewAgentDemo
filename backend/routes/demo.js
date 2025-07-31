const express = require('express');
const { Op } = require('sequelize');
const { ensureAuthenticated, ensureDemoUser } = require('../middleware/auth');
const { Domain, Agent, Question, Answer, QuestionVariant, AnswerVariant, ChatSession, ChatMessage } = require('../models');
const router = express.Router();

/**
 * Demo User Routes
 * 
 * This module handles demo user functionality:
 * - View agents grouped by domain (Final status only)
 * - Chat interface with agents
 * - Session chat history management
 * - Question matching and response generation
 */

// Apply authentication to all demo routes
router.use(ensureAuthenticated);

// =============================================================================
// AGENT VIEWING ROUTES
// =============================================================================

/**
 * @route   GET /demo/domains
 * @desc    Get all domains with their final agents for demo users
 * @access  Private (Demo User)
 */
router.get('/domains', async (req, res) => {
  try {
    const domains = await Domain.findAll({
      where: { is_active: true },
      include: [{
        model: Agent,
        as: 'agents',
        where: { status: 'Final' },
        required: false, // LEFT JOIN to include domains even without final agents
        attributes: ['id', 'name', 'environment', 'version', 'developed_by', 'description', 'access_count', 'last_updated']
      }],
      order: [['name', 'ASC'], [{ model: Agent, as: 'agents' }, 'name', 'ASC']]
    });

    // Filter out domains with no final agents
    const domainsWithAgents = domains.filter(domain => domain.agents && domain.agents.length > 0);

    res.json({
      success: true,
      domains: domainsWithAgents
    });
  } catch (error) {
    console.error('Error fetching domains for demo user:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching available agents'
    });
  }
});

/**
 * @route   GET /demo/agents/:id
 * @desc    Get specific agent details
 * @access  Private (Demo User)
 */
router.get('/agents/:id', async (req, res) => {
  try {
    const agent = await Agent.findOne({
      where: { 
        id: req.params.id,
        status: 'Final'
      },
      include: [{
        model: Domain,
        as: 'domain',
        attributes: ['id', 'name']
      }],
      attributes: ['id', 'name', 'environment', 'version', 'developed_by', 'description', 'access_count', 'last_updated']
    });

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found or not available'
      });
    }

    res.json({
      success: true,
      agent
    });
  } catch (error) {
    console.error('Error fetching agent:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching agent details'
    });
  }
});

// =============================================================================
// CHAT SESSION ROUTES
// =============================================================================

/**
 * @route   POST /demo/agents/:id/chat/start
 * @desc    Start a new chat session with an agent
 * @access  Private (Demo User)
 */
router.post('/agents/:id/chat/start', async (req, res) => {
  try {
    const agentId = req.params.id;

    // Verify agent exists and is final
    const agent = await Agent.findOne({
      where: { 
        id: agentId,
        status: 'Final'
      }
    });

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found or not available'
      });
    }

    // End any existing active sessions for this user and agent
    await ChatSession.update(
      { is_active: false, ended_at: new Date() },
      { 
        where: { 
          user_id: req.user.id, 
          agent_id: agentId, 
          is_active: true 
        } 
      }
    );

    // Create new chat session
    const session = await ChatSession.create({
      user_id: req.user.id,
      agent_id: agentId
    });

    // Increment agent access count
    await agent.increment('access_count');

    res.json({
      success: true,
      message: 'Chat session started',
      session_id: session.id
    });
  } catch (error) {
    console.error('Error starting chat session:', error);
    res.status(500).json({
      success: false,
      message: 'Error starting chat session'
    });
  }
});

/**
 * @route   POST /demo/chat/:sessionId/message
 * @desc    Send a message in a chat session
 * @access  Private (Demo User)
 */
router.post('/chat/:sessionId/message', async (req, res) => {
  try {
    const { message } = req.body;
    const sessionId = req.params.sessionId;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    // Verify session exists and belongs to user
    const session = await ChatSession.findOne({
      where: {
        id: sessionId,
        user_id: req.user.id,
        is_active: true
      },
      include: [{
        model: Agent,
        as: 'agent'
      }]
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Chat session not found or not active'
      });
    }

    // Save user message
    const userMessage = await ChatMessage.create({
      session_id: sessionId,
      message_type: 'user',
      message_text: message.trim()
    });

    // Find matching answer
    const response = await findMatchingAnswer(session.agent.id, message.trim());

    // Save agent response
    const agentMessage = await ChatMessage.create({
      session_id: sessionId,
      message_type: 'agent',
      message_text: response.text,
      message_html: response.html,
      question_id: response.question_id,
      answer_id: response.answer_id
    });

    res.json({
      success: true,
      messages: [
        {
          id: userMessage.id,
          type: 'user',
          text: userMessage.message_text,
          timestamp: userMessage.timestamp
        },
        {
          id: agentMessage.id,
          type: 'agent',
          text: agentMessage.message_text,
          html: agentMessage.message_html,
          timestamp: agentMessage.timestamp
        }
      ]
    });
  } catch (error) {
    console.error('Error processing chat message:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing message'
    });
  }
});

/**
 * @route   GET /demo/chat/:sessionId/history
 * @desc    Get chat history for a session (last 10 messages)
 * @access  Private (Demo User)
 */
router.get('/chat/:sessionId/history', async (req, res) => {
  try {
    const sessionId = req.params.sessionId;

    // Verify session belongs to user
    const session = await ChatSession.findOne({
      where: {
        id: sessionId,
        user_id: req.user.id
      }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Chat session not found'
      });
    }

    // Get last 10 messages
    const messages = await ChatMessage.findAll({
      where: { session_id: sessionId },
      order: [['timestamp', 'DESC']],
      limit: 10
    });

    // Reverse to show chronological order
    const chronologicalMessages = messages.reverse().map(msg => ({
      id: msg.id,
      type: msg.message_type,
      text: msg.message_text,
      html: msg.message_html,
      timestamp: msg.timestamp
    }));

    res.json({
      success: true,
      messages: chronologicalMessages
    });
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching chat history'
    });
  }
});

/**
 * @route   POST /demo/chat/:sessionId/end
 * @desc    End a chat session
 * @access  Private (Demo User)
 */
router.post('/chat/:sessionId/end', async (req, res) => {
  try {
    const sessionId = req.params.sessionId;

    // Verify session belongs to user
    const session = await ChatSession.findOne({
      where: {
        id: sessionId,
        user_id: req.user.id,
        is_active: true
      }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Active chat session not found'
      });
    }

    // End session
    await session.update({
      is_active: false,
      ended_at: new Date()
    });

    res.json({
      success: true,
      message: 'Chat session ended'
    });
  } catch (error) {
    console.error('Error ending chat session:', error);
    res.status(500).json({
      success: false,
      message: 'Error ending chat session'
    });
  }
});

/**
 * @route   GET /demo/chat/sessions
 * @desc    Get user's recent chat sessions
 * @access  Private (Demo User)
 */
router.get('/chat/sessions', async (req, res) => {
  try {
    const sessions = await ChatSession.findAll({
      where: { user_id: req.user.id },
      include: [{
        model: Agent,
        as: 'agent',
        attributes: ['id', 'name'],
        include: [{
          model: Domain,
          as: 'domain',
          attributes: ['name']
        }]
      }],
      order: [['started_at', 'DESC']],
      limit: 20
    });

    const sessionList = sessions.map(session => ({
      id: session.id,
      agent: {
        id: session.agent.id,
        name: session.agent.name,
        domain: session.agent.domain.name
      },
      started_at: session.started_at,
      ended_at: session.ended_at,
      is_active: session.is_active
    }));

    res.json({
      success: true,
      sessions: sessionList
    });
  } catch (error) {
    console.error('Error fetching chat sessions:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching chat sessions'
    });
  }
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Find matching answer for user question
 * @param {string} agentId - Agent ID
 * @param {string} userMessage - User's message
 * @returns {Object} Response object with text, html, and IDs
 */
async function findMatchingAnswer(agentId, userMessage) {
  try {
    const lowerMessage = userMessage.toLowerCase().trim();

    // Get all final questions and their variants for this agent
    const questions = await Question.findAll({
      where: { 
        agent_id: agentId,
        status: 'Final'
      },
      include: [{
        model: Answer,
        as: 'answer',
        where: { status: 'Final' },
        include: [{
          model: AnswerVariant,
          as: 'variants',
          where: { is_approved: true },
          required: false
        }]
      }, {
        model: QuestionVariant,
        as: 'variants',
        where: { is_approved: true },
        required: false
      }]
    });

    let bestMatch = null;
    let bestScore = 0;

    // Check each question and its variants for matches
    for (const question of questions) {
      if (!question.answer) continue;

      // Check original question
      const originalScore = calculateSimilarity(lowerMessage, question.question_text.toLowerCase());
      if (originalScore > bestScore) {
        bestMatch = {
          question_id: question.id,
          answer_id: question.answer.id,
          text: question.answer.answer_text,
          html: question.answer.answer_html,
          score: originalScore
        };
        bestScore = originalScore;
      }

      // Check question variants
      for (const variant of question.variants) {
        const variantScore = calculateSimilarity(lowerMessage, variant.variant_text.toLowerCase());
        if (variantScore > bestScore) {
          // Use a random answer variant if available
          const answerVariants = question.answer.variants;
          let selectedAnswer = {
            text: question.answer.answer_text,
            html: question.answer.answer_html
          };

          if (answerVariants && answerVariants.length > 0) {
            const randomVariant = answerVariants[Math.floor(Math.random() * answerVariants.length)];
            selectedAnswer = {
              text: randomVariant.variant_text,
              html: randomVariant.variant_html
            };
          }

          bestMatch = {
            question_id: question.id,
            answer_id: question.answer.id,
            text: selectedAnswer.text,
            html: selectedAnswer.html,
            score: variantScore
          };
          bestScore = variantScore;
        }
      }
    }

    // If we found a reasonable match (score > 0.3), return it
    if (bestMatch && bestScore > 0.3) {
      return bestMatch;
    }

    // Return fallback response
    return {
      question_id: null,
      answer_id: null,
      text: "I'm sorry, I don't have information about that topic. Could you please rephrase your question or ask about something else?",
      html: "I'm sorry, I don't have information about that topic. Could you please rephrase your question or ask about something else?",
      score: 0
    };
  } catch (error) {
    console.error('Error finding matching answer:', error);
    return {
      question_id: null,
      answer_id: null,
      text: "I'm experiencing technical difficulties. Please try again later.",
      html: "I'm experiencing technical difficulties. Please try again later.",
      score: 0
    };
  }
}

/**
 * Calculate similarity between two strings using simple word matching
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Similarity score between 0 and 1
 */
function calculateSimilarity(str1, str2) {
  // Simple word-based similarity calculation
  const words1 = str1.split(/\s+/).filter(word => word.length > 2);
  const words2 = str2.split(/\s+/).filter(word => word.length > 2);

  if (words1.length === 0 || words2.length === 0) {
    return 0;
  }

  let matches = 0;
  const totalWords = Math.max(words1.length, words2.length);

  for (const word1 of words1) {
    for (const word2 of words2) {
      if (word1.includes(word2) || word2.includes(word1)) {
        matches++;
        break;
      }
    }
  }

  return matches / totalWords;
}

module.exports = router;