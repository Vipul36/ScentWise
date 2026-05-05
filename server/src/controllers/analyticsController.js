/**
 * Analytics Controller
 */
const { InteractionModel, AnalyticsModel } = require('../models/analyticsModel');
const { sendSuccess, sendError } = require('../utils/response');
const logger = require('../utils/logger');

const AnalyticsController = {
  /**
   * POST /api/interactions
   * Track a user interaction event.
   */
  async trackInteraction(req, res) {
    try {
      const interaction = await InteractionModel.create(req.body);
      return sendSuccess(res, interaction, 201);
    } catch (err) {
      logger.error('Failed to track interaction:', err);
      return sendError(res, 'Failed to track interaction', 500);
    }
  },

  /**
   * GET /api/analytics/overview
   */
  async getOverview(req, res) {
    try {
      const overview = await AnalyticsModel.getOverview();
      return sendSuccess(res, overview);
    } catch (err) {
      logger.error('Failed to fetch analytics overview:', err);
      return sendError(res, 'Failed to fetch analytics', 500);
    }
  },

  /**
   * GET /api/analytics/preferences
   */
  async getPreferenceDistribution(req, res) {
    try {
      const data = await AnalyticsModel.getPreferenceDistribution();
      return sendSuccess(res, data);
    } catch (err) {
      logger.error('Failed to fetch preference distribution:', err);
      return sendError(res, 'Failed to fetch data', 500);
    }
  },

  /**
   * GET /api/analytics/perfumes
   */
  async getPerfumePerformance(req, res) {
    try {
      const data = await AnalyticsModel.getPerfumePerformance();
      return sendSuccess(res, data);
    } catch (err) {
      logger.error('Failed to fetch perfume performance:', err);
      return sendError(res, 'Failed to fetch data', 500);
    }
  },

  /**
   * GET /api/analytics/recommendations
   */
  async getRecommendationPerformance(req, res) {
    try {
      const data = await AnalyticsModel.getRecommendationPerformance();
      return sendSuccess(res, data);
    } catch (err) {
      logger.error('Failed to fetch recommendation performance:', err);
      return sendError(res, 'Failed to fetch data', 500);
    }
  },

  /**
   * GET /api/analytics/trends
   */
  async getInteractionTrends(req, res) {
    try {
      const days = parseInt(req.query.days, 10) || 30;
      const data = await AnalyticsModel.getInteractionTrends(days);
      return sendSuccess(res, data);
    } catch (err) {
      logger.error('Failed to fetch trends:', err);
      return sendError(res, 'Failed to fetch trends', 500);
    }
  },

  /**
   * GET /api/analytics/notes
   */
  async getTopNotes(req, res) {
    try {
      const data = await AnalyticsModel.getTopFragranceNotes();
      return sendSuccess(res, data);
    } catch (err) {
      logger.error('Failed to fetch notes analytics:', err);
      return sendError(res, 'Failed to fetch data', 500);
    }
  },

  /**
   * GET /api/analytics/prices
   */
  async getPriceDistribution(req, res) {
    try {
      const data = await AnalyticsModel.getPriceDistribution();
      return sendSuccess(res, data);
    } catch (err) {
      logger.error('Failed to fetch price distribution:', err);
      return sendError(res, 'Failed to fetch data', 500);
    }
  },

  /**
   * GET /api/analytics/ratings
   */
  async getRatingDistribution(req, res) {
    try {
      const data = await AnalyticsModel.getRatingDistribution();
      return sendSuccess(res, data);
    } catch (err) {
      logger.error('Failed to fetch rating distribution:', err);
      return sendError(res, 'Failed to fetch data', 500);
    }
  }
};

module.exports = AnalyticsController;
