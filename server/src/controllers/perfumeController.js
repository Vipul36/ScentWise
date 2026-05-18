/**
 * Perfume Controller
 */
const PerfumeModel = require('../models/perfumeModel');
const { getAIService } = require('../services/aiService');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response');
const logger = require('../utils/logger');

const PerfumeController = {
  /**
   * GET /api/perfumes
   * List perfumes with filtering, search, and pagination.
   */
  async getAll(req, res) {
    try {
      const { page = 1, limit = 20, search, fragrance_family, gender,
              min_price, max_price, season, occasion, sort_by, sort_order } = req.query;

      const result = await PerfumeModel.getAll({
        page: parseInt(page, 10),
        limit: Math.min(parseInt(limit, 10) || 20, 100),
        search,
        fragranceFamily: fragrance_family,
        gender,
        minPrice: min_price,
        maxPrice: max_price,
        season,
        occasion,
        sortBy: sort_by,
        sortOrder: sort_order
      });

      return sendPaginated(res, result.perfumes, page, limit, result.total);
    } catch (err) {
      logger.error('Failed to fetch perfumes:', err);
      return sendError(res, 'Failed to fetch perfumes', 500);
    }
  },

  /**
   * GET /api/perfumes/:id
   * Get a single perfume with full details.
   */
  async getById(req, res) {
    try {
      const perfume = await PerfumeModel.getById(req.params.id);
      if (!perfume) {
        return sendError(res, 'Perfume not found', 404);
      }

      // Try to get AI description
      try {
        const aiService = getAIService();
        perfume.ai_description = await aiService.describePerfumeExperience(perfume);
      } catch (aiErr) {
        logger.debug('AI description unavailable:', aiErr.message);
      }

      return sendSuccess(res, perfume);
    } catch (err) {
      logger.error('Failed to fetch perfume:', err);
      return sendError(res, 'Failed to fetch perfume', 500);
    }
  },

  /**
   * GET /api/perfumes/meta/families
   * Get all distinct fragrance families.
   */
  async getFragranceFamilies(req, res) {
    try {
      const families = await PerfumeModel.getFragranceFamilies();
      return sendSuccess(res, families);
    } catch (err) {
      logger.error('Failed to fetch fragrance families:', err);
      return sendError(res, 'Failed to fetch fragrance families', 500);
    }
  },

  /**
   * GET /api/perfumes/meta/brands
   */
  async getBrands(req, res) {
    try {
      const brands = await PerfumeModel.getBrands();
      return sendSuccess(res, brands);
    } catch (err) {
      logger.error('Failed to fetch brands:', err);
      return sendError(res, 'Failed to fetch brands', 500);
    }
  },

  /**
   * GET /api/perfumes/meta/notes
   */
  async getNotes(req, res) {
    try {
      const notes = await PerfumeModel.getNotes();
      return sendSuccess(res, notes);
    } catch (err) {
      logger.error('Failed to fetch notes:', err);
      return sendError(res, 'Failed to fetch notes', 500);
    }
  },

  /**
   * GET /api/notes/:name/explain
   * Get AI explanation for a fragrance note.
   */
  async explainNote(req, res) {
    try {
      const aiService = getAIService();
      const explanation = await aiService.explainNote(req.params.name);
      return sendSuccess(res, { note: req.params.name, explanation });
    } catch (err) {
      logger.error('Failed to explain note:', err);
      return sendError(res, 'Failed to generate explanation', 500);
    }
  }
};

module.exports = PerfumeController;
