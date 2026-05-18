/**
 * Input validation middleware using express-validator
 */
const { body, param, query, validationResult } = require('express-validator');
const { sendError } = require('../utils/response');

// Generic validation error handler
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendError(res, 'Validation failed', 400, errors.array());
  }
  next();
};

// Preference submission validation
const validatePreference = [
  body('budget_min').optional().isFloat({ min: 0 }).withMessage('budget_min must be a positive number'),
  body('budget_max').optional().isFloat({ min: 0 }).withMessage('budget_max must be a positive number'),
  body('gender_preference').optional().isIn(['male', 'female', 'unisex', 'any']).withMessage('Invalid gender preference'),
  body('preferred_seasons').optional().isArray().withMessage('preferred_seasons must be an array'),
  body('preferred_occasions').optional().isArray().withMessage('preferred_occasions must be an array'),
  body('preferred_time_of_day').optional().isIn(['day', 'night', 'both', 'any']).withMessage('Invalid time of day'),
  body('preferred_fragrance_families').optional().isArray().withMessage('preferred_fragrance_families must be an array'),
  body('preferred_notes').optional().isArray().withMessage('preferred_notes must be an array'),
  body('preferred_intensity').optional().isIn(['light', 'moderate', 'strong', 'intense', 'any']).withMessage('Invalid intensity'),
  handleValidation
];

// Interaction tracking validation
const validateInteraction = [
  body('event_type')
    .isIn([
      'preference_submitted', 'recommendation_generated', 'recommendation_viewed',
      'perfume_clicked', 'perfume_viewed', 'perfume_saved', 'add_to_cart',
      'purchase', 'feedback_submitted', 'search_performed', 'filter_applied'
    ])
    .withMessage('Invalid event type'),
  body('session_id').optional().isString(),
  handleValidation
];

// UUID param validation
const validateUUID = (paramName) => [
  param(paramName).isUUID().withMessage(`${paramName} must be a valid UUID`),
  handleValidation
];

module.exports = {
  handleValidation,
  validatePreference,
  validateInteraction,
  validateUUID
};
