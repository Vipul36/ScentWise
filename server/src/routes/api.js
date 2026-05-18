/**
 * API Routes
 */
const express = require('express');
const router = express.Router();

const PerfumeController = require('../controllers/perfumeController');
const RecommendationController = require('../controllers/recommendationController');
const AnalyticsController = require('../controllers/analyticsController');
const { validatePreference, validateInteraction, validateUUID } = require('../middleware/validation');

// ============================================================================
// PERFUME ROUTES
// ============================================================================

// Meta routes must come before :id route
router.get('/perfumes/meta/families', PerfumeController.getFragranceFamilies);
router.get('/perfumes/meta/brands', PerfumeController.getBrands);
router.get('/perfumes/meta/notes', PerfumeController.getNotes);

router.get('/perfumes', PerfumeController.getAll);
router.get('/perfumes/:id', PerfumeController.getById);

// Note explanation
router.get('/notes/:name/explain', PerfumeController.explainNote);

// ============================================================================
// PREFERENCE & RECOMMENDATION ROUTES
// ============================================================================

router.post('/preferences', validatePreference, RecommendationController.submitPreferences);
router.get('/preferences/user/:userId', RecommendationController.getUserPreferences);

router.get('/recommendations/:preferenceId', RecommendationController.getByPreferenceId);
router.get('/recommendations/user/:userId', RecommendationController.getByUserId);

// ============================================================================
// INTERACTION TRACKING
// ============================================================================

router.post('/interactions', validateInteraction, AnalyticsController.trackInteraction);

// ============================================================================
// ANALYTICS ROUTES
// ============================================================================

router.get('/analytics/overview', AnalyticsController.getOverview);
router.get('/analytics/preferences', AnalyticsController.getPreferenceDistribution);
router.get('/analytics/perfumes', AnalyticsController.getPerfumePerformance);
router.get('/analytics/recommendations', AnalyticsController.getRecommendationPerformance);
router.get('/analytics/trends', AnalyticsController.getInteractionTrends);
router.get('/analytics/notes', AnalyticsController.getTopNotes);
router.get('/analytics/prices', AnalyticsController.getPriceDistribution);
router.get('/analytics/ratings', AnalyticsController.getRatingDistribution);

module.exports = router;
