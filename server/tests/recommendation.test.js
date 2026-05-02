/**
 * ScentWise — Recommendation Engine Tests
 * =========================================
 * Tests the deterministic weighted scoring recommendation engine.
 */

const RecommendationEngine = require('../src/services/recommendationEngine');

describe('RecommendationEngine', () => {
  let engine;

  // Sample perfume objects for testing
  const createPerfume = (overrides = {}) => ({
    id: 'test-perfume-1',
    brand: 'Test Brand',
    perfume_name: 'Test Perfume',
    gender: 'unisex',
    price: 3000,
    rating: 4.2,
    review_count: 150,
    fragrance_family: 'citrus',
    intensity: 'moderate',
    longevity: 'long',
    sillage: 'moderate',
    top_notes: ['bergamot', 'lemon'],
    middle_notes: ['jasmine', 'rose'],
    base_notes: ['sandalwood', 'musk'],
    seasons: ['spring', 'summer'],
    occasions: ['office', 'casual'],
    time_of_day: 'day',
    ...overrides
  });

  const createPreferences = (overrides = {}) => ({
    budget_min: 1000,
    budget_max: 5000,
    gender_preference: 'any',
    preferred_seasons: ['summer'],
    preferred_occasions: ['office'],
    preferred_time_of_day: 'day',
    preferred_fragrance_families: ['citrus'],
    preferred_notes: ['bergamot'],
    preferred_intensity: 'moderate',
    ...overrides
  });

  beforeEach(() => {
    engine = new RecommendationEngine();
  });

  // ============================================================================
  // HARD CONSTRAINT TESTS
  // ============================================================================

  describe('Hard Constraints', () => {
    test('should pass when perfume is within budget', () => {
      const result = engine.checkHardConstraints(
        createPreferences({ budget_max: 5000 }),
        createPerfume({ price: 3000 })
      );
      expect(result.pass).toBe(true);
      expect(result.failures).toHaveLength(0);
    });

    test('should fail when perfume exceeds budget', () => {
      const result = engine.checkHardConstraints(
        createPreferences({ budget_max: 2000 }),
        createPerfume({ price: 3000 })
      );
      expect(result.pass).toBe(false);
      expect(result.failures).toHaveLength(1);
      expect(result.failures[0]).toContain('Over budget');
    });

    test('should fail when gender does not match', () => {
      const result = engine.checkHardConstraints(
        createPreferences({ gender_preference: 'female' }),
        createPerfume({ gender: 'male' })
      );
      expect(result.pass).toBe(false);
      expect(result.failures[0]).toContain('Gender mismatch');
    });

    test('should pass when perfume is unisex regardless of preference', () => {
      const result = engine.checkHardConstraints(
        createPreferences({ gender_preference: 'female' }),
        createPerfume({ gender: 'unisex' })
      );
      expect(result.pass).toBe(true);
    });

    test('should pass when gender preference is any', () => {
      const result = engine.checkHardConstraints(
        createPreferences({ gender_preference: 'any' }),
        createPerfume({ gender: 'male' })
      );
      expect(result.pass).toBe(true);
    });
  });

  // ============================================================================
  // FEATURE SCORE TESTS
  // ============================================================================

  describe('Feature Scoring', () => {
    test('exact fragrance family match should score 100', () => {
      const score = engine.scoreFragranceFamily(
        createPreferences({ preferred_fragrance_families: ['citrus'] }),
        createPerfume({ fragrance_family: 'citrus' })
      );
      expect(score).toBe(100);
    });

    test('no fragrance family preference should score 50 (neutral)', () => {
      const score = engine.scoreFragranceFamily(
        createPreferences({ preferred_fragrance_families: [] }),
        createPerfume({ fragrance_family: 'citrus' })
      );
      expect(score).toBe(50);
    });

    test('unmatched fragrance family should score low', () => {
      const score = engine.scoreFragranceFamily(
        createPreferences({ preferred_fragrance_families: ['oriental'] }),
        createPerfume({ fragrance_family: 'citrus' })
      );
      expect(score).toBeLessThan(50);
    });

    test('related fragrance family should score moderate', () => {
      const score = engine.scoreFragranceFamily(
        createPreferences({ preferred_fragrance_families: ['fresh'] }),
        createPerfume({ fragrance_family: 'citrus' })
      );
      expect(score).toBe(60);
    });

    test('exact note match should score high', () => {
      const score = engine.scoreFragranceNotes(
        createPreferences({ preferred_notes: ['bergamot', 'lemon'] }),
        createPerfume({ top_notes: ['bergamot', 'lemon'], middle_notes: [], base_notes: [] })
      );
      expect(score).toBe(100);
    });

    test('partial note match should score proportionally', () => {
      const score = engine.scoreFragranceNotes(
        createPreferences({ preferred_notes: ['bergamot', 'rose', 'vanilla'] }),
        createPerfume({ top_notes: ['bergamot'], middle_notes: ['rose'], base_notes: ['sandalwood'] })
      );
      expect(score).toBeGreaterThan(50);
      expect(score).toBeLessThan(100);
    });

    test('budget sweet spot should score high', () => {
      const score = engine.scoreBudget(
        createPreferences({ budget_max: 5000 }),
        createPerfume({ price: 3500 })
      );
      expect(score).toBeGreaterThanOrEqual(90);
    });

    test('exact season match should score high', () => {
      const score = engine.scoreSeason(
        createPreferences({ preferred_seasons: ['summer'] }),
        createPerfume({ seasons: ['summer', 'spring'] })
      );
      expect(score).toBeGreaterThanOrEqual(70);
    });

    test('no season overlap should score low', () => {
      const score = engine.scoreSeason(
        createPreferences({ preferred_seasons: ['winter'] }),
        createPerfume({ seasons: ['summer'] })
      );
      expect(score).toBeLessThan(50);
    });

    test('exact intensity match should score 100', () => {
      const score = engine.scoreIntensity(
        createPreferences({ preferred_intensity: 'moderate' }),
        createPerfume({ intensity: 'moderate' })
      );
      expect(score).toBe(100);
    });

    test('close intensity should score moderate', () => {
      const score = engine.scoreIntensity(
        createPreferences({ preferred_intensity: 'moderate' }),
        createPerfume({ intensity: 'strong' })
      );
      expect(score).toBe(70);
    });
  });

  // ============================================================================
  // WEIGHTED SCORE TESTS
  // ============================================================================

  describe('Weighted Scoring', () => {
    test('should calculate weighted score correctly', () => {
      const scores = {
        fragranceFamily: 100,
        fragranceNotes: 100,
        occasion: 100,
        season: 100,
        budget: 100,
        timeOfDay: 100,
        intensity: 100,
        gender: 100
      };
      const result = engine.calculateWeightedScore(scores);
      expect(result).toBeCloseTo(100, 1);
    });

    test('should apply weights proportionally', () => {
      const scores = {
        fragranceFamily: 100,
        fragranceNotes: 0,
        occasion: 0,
        season: 0,
        budget: 0,
        timeOfDay: 0,
        intensity: 0,
        gender: 0
      };
      const result = engine.calculateWeightedScore(scores);
      // fragranceFamily weight is 0.30, so score should be 30
      expect(result).toBeCloseTo(30, 1);
    });
  });

  // ============================================================================
  // FULL RECOMMENDATION TESTS
  // ============================================================================

  describe('Full Recommendation Flow', () => {
    test('exact preference match should produce high score', () => {
      const preferences = createPreferences();
      const perfumes = [createPerfume()];
      const results = engine.recommend(preferences, perfumes);

      expect(results).toHaveLength(1);
      expect(results[0].final_score).toBeGreaterThan(60);
      expect(results[0].rank_position).toBe(1);
      expect(results[0].matched_preferences.length).toBeGreaterThan(0);
    });

    test('budget mismatch should exclude perfume', () => {
      const preferences = createPreferences({ budget_max: 1000 });
      const perfumes = [createPerfume({ price: 5000 })];
      const results = engine.recommend(preferences, perfumes);

      expect(results).toHaveLength(0);
    });

    test('multiple matching perfumes should be ranked by score', () => {
      const preferences = createPreferences();
      const perfumes = [
        createPerfume({ id: 'p1', fragrance_family: 'citrus', price: 2500 }),
        createPerfume({ id: 'p2', fragrance_family: 'woody', price: 2500 }),
        createPerfume({ id: 'p3', fragrance_family: 'citrus', price: 3500 }),
      ];
      const results = engine.recommend(preferences, perfumes);

      expect(results.length).toBeGreaterThan(0);
      // Results should be sorted by score descending
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].final_score).toBeGreaterThanOrEqual(results[i].final_score);
      }
      // Rank positions should be sequential
      results.forEach((r, idx) => {
        expect(r.rank_position).toBe(idx + 1);
      });
    });

    test('no matching perfumes should return empty', () => {
      const preferences = createPreferences({ 
        budget_max: 100, 
        gender_preference: 'female' 
      });
      const perfumes = [
        createPerfume({ price: 5000, gender: 'male' })
      ];
      const results = engine.recommend(preferences, perfumes);
      expect(results).toHaveLength(0);
    });

    test('should handle empty perfume array', () => {
      const results = engine.recommend(createPreferences(), []);
      expect(results).toHaveLength(0);
    });

    test('should handle missing preference fields gracefully', () => {
      const preferences = {}; // No preferences at all
      const perfumes = [createPerfume()];
      const results = engine.recommend(preferences, perfumes);

      // Should still produce results (with neutral scores)
      expect(results.length).toBeGreaterThanOrEqual(0);
    });

    test('reason text should be generated', () => {
      const results = engine.recommend(
        createPreferences(),
        [createPerfume()]
      );
      expect(results[0].reason_text).toBeDefined();
      expect(results[0].reason_text.length).toBeGreaterThan(0);
    });

    test('matched and unmatched preferences should be populated', () => {
      const results = engine.recommend(
        createPreferences(),
        [createPerfume()]
      );
      expect(Array.isArray(results[0].matched_preferences)).toBe(true);
      expect(Array.isArray(results[0].unmatched_preferences)).toBe(true);
    });

    test('scores breakdown should be present', () => {
      const results = engine.recommend(
        createPreferences(),
        [createPerfume()]
      );
      expect(results[0].scores).toBeDefined();
      expect(results[0].scores.fragrance_score).toBeDefined();
      expect(results[0].scores.occasion_score).toBeDefined();
      expect(results[0].scores.season_score).toBeDefined();
      expect(results[0].scores.budget_score).toBeDefined();
    });
  });

  // ============================================================================
  // CUSTOM WEIGHTS TEST
  // ============================================================================

  describe('Custom Weights', () => {
    test('should accept custom weights', () => {
      const customEngine = new RecommendationEngine({
        fragranceFamily: 0.50,
        fragranceNotes: 0.10,
        occasion: 0.10,
        season: 0.10,
        budget: 0.10,
        timeOfDay: 0.05,
        intensity: 0.03,
        gender: 0.02
      });

      const results = customEngine.recommend(
        createPreferences(),
        [createPerfume()]
      );
      expect(results.length).toBeGreaterThan(0);
    });
  });
});
