/**
 * Text Variant Generation Service
 * 
 * This service generates paraphrased variants of questions and answers
 * while preserving HTML formatting and context. It provides multiple
 * paraphrasing techniques to create diverse variants.
 */

/**
 * Generates paraphrased variants for text content
 * @param {string} originalText - The original text to paraphrase
 * @param {string} type - Either 'question' or 'answer'
 * @param {string} htmlContent - HTML version for answers (optional)
 * @returns {Array} Array of variant objects
 */
const generateVariants = (originalText, type = 'question', htmlContent = null) => {
  const variants = [];
  
  try {
    // Generate 10+ variants using different paraphrasing techniques
    const techniques = [
      'synonymReplacement',
      'sentenceRestructuring', 
      'formalInformal',
      'activePassive',
      'questionStyle',
      'expandContract',
      'orderChange',
      'emphasisShift',
      'perspectiveChange',
      'contextualVariation'
    ];

    techniques.forEach((technique, index) => {
      const variant = applyParaphraseTechnique(originalText, technique, type, htmlContent);
      if (variant && variant !== originalText) {
        variants.push({
          id: index + 1,
          text: variant.text,
          html: variant.html || variant.text,
          technique: technique,
          confidence: variant.confidence || 0.8
        });
      }
    });

    // Add some additional creative variants
    const creativeVariants = generateCreativeVariants(originalText, type, htmlContent);
    variants.push(...creativeVariants);

    return variants.slice(0, 12); // Return up to 12 variants
  } catch (error) {
    console.error('Error generating variants:', error);
    return [];
  }
};

/**
 * Applies specific paraphrasing technique to text
 * @param {string} text - Original text
 * @param {string} technique - Paraphrasing technique to apply
 * @param {string} type - Content type (question/answer)
 * @param {string} htmlContent - HTML content for answers
 * @returns {Object} Paraphrased variant
 */
const applyParaphraseTechnique = (text, technique, type, htmlContent) => {
  const cleanText = stripHtml(text);
  
  switch (technique) {
    case 'synonymReplacement':
      return synonymReplacement(cleanText, type, htmlContent);
    
    case 'sentenceRestructuring':
      return sentenceRestructuring(cleanText, type, htmlContent);
    
    case 'formalInformal':
      return formalInformalSwitch(cleanText, type, htmlContent);
    
    case 'activePassive':
      return activePassiveSwitch(cleanText, type, htmlContent);
    
    case 'questionStyle':
      return questionStyleVariation(cleanText, type, htmlContent);
    
    case 'expandContract':
      return expandContract(cleanText, type, htmlContent);
    
    case 'orderChange':
      return changeOrder(cleanText, type, htmlContent);
    
    case 'emphasisShift':
      return shiftEmphasis(cleanText, type, htmlContent);
    
    case 'perspectiveChange':
      return changePerspective(cleanText, type, htmlContent);
    
    case 'contextualVariation':
      return contextualVariation(cleanText, type, htmlContent);
    
    default:
      return { text: cleanText, html: htmlContent };
  }
};

/**
 * Synonym replacement technique
 */
const synonymReplacement = (text, type, htmlContent) => {
  const synonymMap = {
    // Common words
    'how': 'in what way',
    'what': 'which',
    'why': 'for what reason',
    'when': 'at what time',
    'where': 'in which location',
    'can': 'is it possible to',
    'will': 'shall',
    'would': 'could',
    'should': 'ought to',
    'help': 'assist',
    'show': 'display',
    'explain': 'describe',
    'tell': 'inform',
    'find': 'locate',
    'get': 'obtain',
    'make': 'create',
    'use': 'utilize',
    'need': 'require',
    'want': 'desire',
    // Technical terms
    'process': 'procedure',
    'method': 'approach',
    'system': 'platform',
    'feature': 'functionality',
    'option': 'choice',
    'setting': 'configuration',
    'data': 'information',
    'user': 'person',
    'admin': 'administrator',
    'manage': 'handle'
  };

  let result = text;
  
  Object.entries(synonymMap).forEach(([original, synonym]) => {
    const regex = new RegExp(`\\b${original}\\b`, 'gi');
    if (Math.random() > 0.7) { // 30% chance to replace each word
      result = result.replace(regex, synonym);
    }
  });

  return {
    text: result,
    html: htmlContent ? htmlContent.replace(text, result) : result,
    confidence: 0.9
  };
};

/**
 * Sentence restructuring technique
 */
const sentenceRestructuring = (text, type, htmlContent) => {
  let result = text;

  if (type === 'question') {
    // Convert different question formats
    if (text.toLowerCase().startsWith('how do i')) {
      result = text.replace(/^how do i/i, 'What is the process to');
    } else if (text.toLowerCase().startsWith('what is')) {
      result = text.replace(/^what is/i, 'Could you explain what');
    } else if (text.toLowerCase().startsWith('can i')) {
      result = text.replace(/^can i/i, 'Is it possible for me to');
    } else if (text.toLowerCase().startsWith('where')) {
      result = text.replace(/^where/i, 'In what location');
    }
  } else {
    // For answers, restructure sentences
    const sentences = result.split('. ');
    if (sentences.length > 1) {
      // Reverse order of some sentences
      const restructured = [...sentences];
      if (restructured.length >= 2) {
        [restructured[0], restructured[1]] = [restructured[1], restructured[0]];
      }
      result = restructured.join('. ');
    }
  }

  return {
    text: result,
    html: htmlContent ? htmlContent.replace(text, result) : result,
    confidence: 0.8
  };
};

/**
 * Formal/informal style switching
 */
const formalInformalSwitch = (text, type, htmlContent) => {
  const formalToInformal = {
    'utilize': 'use',
    'commence': 'start',
    'terminate': 'end',
    'facilitate': 'help',
    'endeavor': 'try',
    'accomplish': 'do',
    'subsequently': 'then',
    'prior to': 'before',
    'in order to': 'to'
  };

  const informalToFormal = {
    'use': 'utilize',
    'start': 'commence',
    'end': 'terminate', 
    'help': 'facilitate',
    'try': 'endeavor',
    'do': 'accomplish',
    'then': 'subsequently',
    'before': 'prior to',
    'to': 'in order to'
  };

  let result = text;
  const mapToUse = Math.random() > 0.5 ? formalToInformal : informalToFormal;

  Object.entries(mapToUse).forEach(([original, replacement]) => {
    const regex = new RegExp(`\\b${original}\\b`, 'gi');
    result = result.replace(regex, replacement);
  });

  return {
    text: result,
    html: htmlContent ? htmlContent.replace(text, result) : result,
    confidence: 0.85
  };
};

/**
 * Active/passive voice switching
 */
const activePassiveSwitch = (text, type, htmlContent) => {
  let result = text;

  // Simple active to passive conversions
  const activeToPassive = [
    { pattern: /I (can|will|should) (\w+)/gi, replacement: 'The $2 process can be' },
    { pattern: /You (can|will|should) (\w+)/gi, replacement: 'The $2 action can be performed' },
    { pattern: /The system (\w+s)/gi, replacement: 'It is $1 by the system' }
  ];

  activeToPassive.forEach(({ pattern, replacement }) => {
    if (Math.random() > 0.6) {
      result = result.replace(pattern, replacement);
    }
  });

  return {
    text: result,
    html: htmlContent ? htmlContent.replace(text, result) : result,
    confidence: 0.7
  };
};

/**
 * Question style variation
 */
const questionStyleVariation = (text, type, htmlContent) => {
  if (type !== 'question') {
    return { text, html: htmlContent };
  }

  let result = text;

  // Add different question starters
  const questionStarters = [
    'Could you please explain',
    'I would like to know',
    'Can you help me understand',
    'I need information about',
    'Please tell me'
  ];

  if (!text.match(/^(how|what|when|where|why|can|could|would|should)/i)) {
    const starter = questionStarters[Math.floor(Math.random() * questionStarters.length)];
    result = `${starter} ${text.toLowerCase()}`;
  }

  return {
    text: result,
    html: htmlContent ? htmlContent.replace(text, result) : result,
    confidence: 0.8
  };
};

/**
 * Expand contractions or contract phrases
 */
const expandContract = (text, type, htmlContent) => {
  const contractions = {
    "can't": "cannot",
    "won't": "will not",
    "don't": "do not",
    "doesn't": "does not",
    "isn't": "is not",
    "aren't": "are not",
    "wasn't": "was not",
    "weren't": "were not",
    "haven't": "have not",
    "hasn't": "has not",
    "shouldn't": "should not",
    "wouldn't": "would not",
    "couldn't": "could not"
  };

  const expansions = Object.fromEntries(
    Object.entries(contractions).map(([key, value]) => [value, key])
  );

  let result = text;
  const mapToUse = Math.random() > 0.5 ? contractions : expansions;

  Object.entries(mapToUse).forEach(([original, replacement]) => {
    const regex = new RegExp(original.replace(/'/g, "\\'"), 'gi');
    result = result.replace(regex, replacement);
  });

  return {
    text: result,
    html: htmlContent ? htmlContent.replace(text, result) : result,
    confidence: 0.9
  };
};

/**
 * Change word/phrase order
 */
const changeOrder = (text, type, htmlContent) => {
  let result = text;

  // For questions, try different orderings
  if (type === 'question') {
    const words = text.split(' ');
    if (words.length > 3) {
      // Move question word to different position sometimes
      if (words[0].toLowerCase().match(/^(how|what|when|where|why)$/)) {
        const questionWord = words.shift();
        words.splice(2, 0, questionWord.toLowerCase());
        result = words.join(' ');
        result = result.charAt(0).toUpperCase() + result.slice(1);
      }
    }
  }

  return {
    text: result,
    html: htmlContent ? htmlContent.replace(text, result) : result,
    confidence: 0.6
  };
};

/**
 * Shift emphasis in text
 */
const shiftEmphasis = (text, type, htmlContent) => {
  let result = text;
  let htmlResult = htmlContent;

  // Add emphasis words
  const emphasisWords = ['particularly', 'specifically', 'especially', 'exactly', 'precisely'];
  const emphasis = emphasisWords[Math.floor(Math.random() * emphasisWords.length)];

  if (type === 'question') {
    result = text.replace(/how/gi, `how ${emphasis}`);
    result = result.replace(/what/gi, `what ${emphasis}`);
  }

  // For HTML content, preserve formatting and add emphasis
  if (htmlResult) {
    htmlResult = htmlResult.replace(text, result);
  }

  return {
    text: result,
    html: htmlResult || result,
    confidence: 0.7
  };
};

/**
 * Change perspective (1st person, 2nd person, 3rd person)
 */
const changePerspective = (text, type, htmlContent) => {
  let result = text;

  const perspectiveMap = {
    'I': 'you',
    'me': 'you',
    'my': 'your',
    'mine': 'yours',
    'you': 'one',
    'your': 'one\'s',
    'yours': 'one\'s'
  };

  Object.entries(perspectiveMap).forEach(([original, replacement]) => {
    const regex = new RegExp(`\\b${original}\\b`, 'gi');
    if (Math.random() > 0.7) {
      result = result.replace(regex, replacement);
    }
  });

  return {
    text: result,
    html: htmlContent ? htmlContent.replace(text, result) : result,
    confidence: 0.6
  };
};

/**
 * Contextual variation - add context or remove it
 */
const contextualVariation = (text, type, htmlContent) => {
  let result = text;

  if (type === 'question') {
    const contexts = [
      'In this system,',
      'For this application,',
      'When using this platform,',
      'In the context of this demo,'
    ];
    
    if (Math.random() > 0.5) {
      const context = contexts[Math.floor(Math.random() * contexts.length)];
      result = `${context} ${text.toLowerCase()}`;
    }
  }

  return {
    text: result,
    html: htmlContent ? htmlContent.replace(text, result) : result,
    confidence: 0.8
  };
};

/**
 * Generate creative variants using combination techniques
 */
const generateCreativeVariants = (originalText, type, htmlContent) => {
  const variants = [];
  
  // Combine multiple techniques
  const combinations = [
    ['synonymReplacement', 'formalInformal'],
    ['sentenceRestructuring', 'expandContract'],
    ['questionStyle', 'emphasisShift'],
    ['contextualVariation', 'synonymReplacement']
  ];

  combinations.forEach((combination, index) => {
    let result = { text: originalText, html: htmlContent };
    
    combination.forEach(technique => {
      result = applyParaphraseTechnique(result.text, technique, type, result.html);
    });

    if (result.text !== originalText) {
      variants.push({
        id: `creative_${index + 1}`,
        text: result.text,
        html: result.html || result.text,
        technique: `combined_${combination.join('_')}`,
        confidence: 0.7
      });
    }
  });

  return variants;
};

/**
 * Strip HTML tags from text
 */
const stripHtml = (html) => {
  return html.replace(/<[^>]*>/g, '').trim();
};

/**
 * Preserve HTML formatting while changing text content
 */
const preserveHtmlFormatting = (originalHtml, originalText, newText) => {
  if (!originalHtml || originalHtml === originalText) {
    return newText;
  }

  // Simple approach: replace text content while preserving tags
  return originalHtml.replace(originalText, newText);
};

module.exports = {
  generateVariants,
  applyParaphraseTechnique,
  stripHtml,
  preserveHtmlFormatting
};