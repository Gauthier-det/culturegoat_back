const DOMPurify = require('isomorphic-dompurify');

/**
 * Nettoie une chaîne de caractères de tout HTML/JS
 */
function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  
  // Supprimer tout HTML et scripts
  return DOMPurify.sanitize(input, { 
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  }).trim();
}

/**
 * Nettoie un objet récursivement
 */
function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  
  const sanitized = {};
  
  for (let key in obj) {
    if (typeof obj[key] === 'string') {
      sanitized[key] = sanitizeInput(obj[key]);
    } else if (Array.isArray(obj[key])) {
      sanitized[key] = obj[key].map(item => 
        typeof item === 'string' ? sanitizeInput(item) : item
      );
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitized[key] = sanitizeObject(obj[key]);
    } else {
      sanitized[key] = obj[key];
    }
  }
  
  return sanitized;
}

module.exports = { sanitizeInput, sanitizeObject };
