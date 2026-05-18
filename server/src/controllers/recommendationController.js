/**
 * Recommendation Controller
 */
const PerfumeModel = require('../models/perfumeModel');
const { PreferenceModel, RecommendationModel } = require('../models/preferenceModel');
const { InteractionModel } = require('../models/analyticsModel');
const RecommendationEngine = require('../services/recommendationEngine');
const { getAIService } = require('../services/aiService');
const { sendSuccess, sendError } = require('../utils/response');
const logger = require('../utils/logger');

const RecommendationController = {
  /**
   * POST /api/preferences
   * Submit user preferences and generate recommendations.
   * This is the main recommendation flow.
   */
  async submitPreferences(req, res) {
    try {
      const preferenceData = req.body;

      // 1. Save preferences to database
      const savedPref = await PreferenceModel.create(preferenceData);
      logger.info(`Preference saved: ${savedPref.id}`);

      // 2. Track interaction
      await InteractionModel.create({
        user_id: preferenceData.user_id,
        session_id: preferenceData.session_id,
        event_type: 'preference_submitted',
        preference_id: savedPref.id
      });

      // 3. Load all perfumes for recommendation engine
      const allPerfumes = await PerfumeModel.getAllForRecommendation();
      logger.info(`Loaded ${allPerfumes.length} perfumes for recommendation`);

      // 4. Run recommendation engine
      const engine = new RecommendationEngine();
      const recommendations = engine.recommend(savedPref, allPerfumes);
      logger.info(`Generated ${recommendations.length} recommendations`);

      // 5. Save recommendations to database
      const recsToSave = recommendations.map(rec => ({
        ...rec,
        preference_id: savedPref.id,
        user_id: preferenceData.user_id || null
      }));

      let savedRecs = [];
      if (recsToSave.length > 0) {
        savedRecs = await RecommendationModel.createBatch(recsToSave);
      }

      // 6. Track recommendation generation
      await InteractionModel.create({
        user_id: preferenceData.user_id,
        session_id: preferenceData.session_id,
        event_type: 'recommendation_generated',
        preference_id: savedPref.id,
        metadata: { count: recommendations.length }
      });

      // 7. Optionally generate AI explanations for top 5
      const aiService = getAIService();
      for (const rec of recommendations.slice(0, 5)) {
        try {
          const aiExplanation = await aiService.explainRecommendation(
            rec.perfume,
            rec.matched_preferences,
            rec.final_score
          );
          rec.ai_explanation = aiExplanation;

          // Update in DB if we have a saved ID
          const savedRec = savedRecs.find(sr => sr.perfume_id === rec.perfume_id);
          if (savedRec) {
            await RecommendationModel.updateAIExplanation(savedRec.id, aiExplanation);
          }
        } catch (aiErr) {
          logger.debug('AI explanation failed for recommendation:', aiErr.message);
        }
      }

      return sendSuccess(res, {
        preference_id: savedPref.id,
        total_recommendations: recommendations.length,
        recommendations: recommendations.map(rec => ({
          perfume_id: rec.perfume_id,
          rank_position: rec.rank_position,
          final_score: rec.final_score,
          brand: rec.perfume.brand,
          perfume_name: rec.perfume.perfume_name,
          price: rec.perfume.price,
          rating: rec.perfume.rating,
          fragrance_family: rec.perfume.fragrance_family,
          gender: rec.perfume.gender,
          intensity: rec.perfume.intensity,
          top_notes: rec.perfume.top_notes,
          middle_notes: rec.perfume.middle_notes,
          base_notes: rec.perfume.base_notes,
          seasons: rec.perfume.seasons,
          occasions: rec.perfume.occasions,
          image_url: rec.perfume.image_url,
          scores: rec.scores,
          matched_preferences: rec.matched_preferences,
          unmatched_preferences: rec.unmatched_preferences,
          reason_text: rec.reason_text,
          ai_explanation: rec.ai_explanation || null,
        }))
      }, 201);
    } catch (err) {
      logger.error('Recommendation generation failed:', err);
      return sendError(res, 'Failed to generate recommendations', 500);
    }
  },

  /**
   * GET /api/recommendations/:preferenceId
   * Retrieve previously generated recommendations.
   */
  async getByPreferenceId(req, res) {
    try {
      const recommendations = await RecommendationModel.getByPreferenceId(req.params.preferenceId);
      if (recommendations.length === 0) {
        return sendError(res, 'No recommendations found', 404);
      }
      return sendSuccess(res, recommendations);
    } catch (err) {
      logger.error('Failed to fetch recommendations:', err);
      return sendError(res, 'Failed to fetch recommendations', 500);
    }
  },

  /**
   * GET /api/recommendations/user/:userId
   * Get recommendation history for a user.
   */
  async getByUserId(req, res) {
    try {
      const recommendations = await RecommendationModel.getByUserId(req.params.userId);
      return sendSuccess(res, recommendations);
    } catch (err) {
      logger.error('Failed to fetch user recommendations:', err);
      return sendError(res, 'Failed to fetch recommendations', 500);
    }
  },

  /**
   * GET /api/preferences/user/:userId
   * Get preference history for a user.
   */
  async getUserPreferences(req, res) {
    try {
      const preferences = await PreferenceModel.getByUserId(req.params.userId);
      return sendSuccess(res, preferences);
    } catch (err) {
      logger.error('Failed to fetch preferences:', err);
      return sendError(res, 'Failed to fetch preferences', 500);
    }
  }
};

module.exports = RecommendationController;
