/**
 * ScentWise — Recommendation Engine
 * ====================================
 * 
 * A transparent, deterministic, weighted scoring recommendation system.
 * 
 * This is NOT a machine learning model. It is a configurable weighted
 * scoring algorithm that:
 * 
 * 1. Applies hard constraints (budget, gender) to filter out unsuitable perfumes
 * 2. Calculates individual feature match scores (0-100 each)
 * 3. Applies configurable weights to each feature score
 * 4. Produces a final composite score (0-100)
 * 5. Ranks perfumes by score
 * 6. Returns detailed match/unmatch explanations for each recommendation
 * 
 * Architecture Notes:
 * - The recommendation logic is SEPARATE from the LLM
 * - The LLM is only used downstream for natural-language explanation generation
 * - Scoring is fully deterministic given the same inputs and weights
 * - Weights are configurable from the central config
 * 
 * Weight Configuration (default):
 *   fragranceFamily: 30%
 *   fragranceNotes:  10%
 *   occasion:        20%
 *   season:          15%
 *   budget:          10%
 *   timeOfDay:        5%
 *   intensity:        5%
 *   gender:           5%
 *   Total:          100%
 */

const config = require('../config');
const logger = require('../utils/logger');

class RecommendationEngine {
  constructor(weights = null) {
    this.weights = weights || config.recommendation.weights;
    this.maxResults = config.recommendation.maxResults;
    this.minScore = config.recommendation.minScore;
  }

  /**
   * Generate recommendations for a user preference set.
   * @param {object} preferences - User's submitted preferences
   * @param {Array} perfumes - Array of perfume objects with joined data
   * @returns {Array} Ranked recommendation objects
   */
  recommend(preferences, perfumes) {
    logger.info(`Generating recommendations for ${perfumes.length} perfumes`);

    const results = [];

    for (const perfume of perfumes) {
      // Step 1: Apply hard constraints
      const hardConstraintResult = this.checkHardConstraints(preferences, perfume);
      if (!hardConstraintResult.pass) {
        continue; // Skip perfumes that fail hard constraints
      }

      // Step 2: Calculate individual feature scores
      const scores = this.calculateFeatureScores(preferences, perfume);

      // Step 3: Apply weights to get final score
      const finalScore = this.calculateWeightedScore(scores);

      // Step 4: Only include if above minimum threshold
      if (finalScore < this.minScore) {
        continue;
      }

      // Step 5: Build matched/unmatched preference lists
      const { matched, unmatched } = this.buildMatchDetails(preferences, perfume, scores);

      // Step 6: Generate deterministic reason text
      const reasonText = this.generateReasonText(perfume, matched, unmatched, finalScore);

      results.push({
        perfume_id: perfume.id,
        perfume,
        final_score: Math.round(finalScore * 100) / 100,
        scores: {
          fragrance_score: scores.fragranceFamily,
          notes_score: scores.fragranceNotes,
          occasion_score: scores.occasion,
          season_score: scores.season,
          budget_score: scores.budget,
          time_score: scores.timeOfDay,
          intensity_score: scores.intensity,
          gender_score: scores.gender,
        },
        matched_preferences: matched,
        unmatched_preferences: unmatched,
        reason_text: reasonText,
      });
    }

    // Step 6: Sort by score descending, then by rating as tiebreaker
    results.sort((a, b) => {
      if (b.final_score !== a.final_score) return b.final_score - a.final_score;
      return (b.perfume.rating || 0) - (a.perfume.rating || 0);
    });

    // Step 7: Assign rank positions and limit results
    return results.slice(0, this.maxResults).map((r, idx) => ({
      ...r,
      rank_position: idx + 1,
    }));
  }

  /**
   * Hard constraints — if ANY fails, the perfume is excluded entirely.
   */
  checkHardConstraints(preferences, perfume) {
    const failures = [];

    // Budget: if user specified max budget, perfume must be within range
    if (preferences.budget_max && perfume.price > preferences.budget_max) {
      failures.push(`Over budget (₹${perfume.price} > ₹${preferences.budget_max})`);
    }

    // Gender: if user specified a gender preference (not 'any'),
    // perfume must match or be unisex
    if (preferences.gender_preference &&
        preferences.gender_preference !== 'any' &&
        perfume.gender !== 'unisex' &&
        perfume.gender !== preferences.gender_preference) {
      failures.push(`Gender mismatch (${perfume.gender} ≠ ${preferences.gender_preference})`);
    }

    return {
      pass: failures.length === 0,
      failures,
    };
  }

  /**
   * Calculate individual feature match scores (each 0–100).
   */
  calculateFeatureScores(preferences, perfume) {
    return {
      fragranceFamily: this.scoreFragranceFamily(preferences, perfume),
      fragranceNotes: this.scoreFragranceNotes(preferences, perfume),
      occasion: this.scoreOccasion(preferences, perfume),
      season: this.scoreSeason(preferences, perfume),
      budget: this.scoreBudget(preferences, perfume),
      timeOfDay: this.scoreTimeOfDay(preferences, perfume),
      intensity: this.scoreIntensity(preferences, perfume),
      gender: this.scoreGender(preferences, perfume),
    };
  }

  /**
   * Fragrance Family Score (0-100)
   * Exact match = 100, no preference = 50 (neutral)
   */
  scoreFragranceFamily(preferences, perfume) {
    if (!preferences.preferred_fragrance_families ||
        preferences.preferred_fragrance_families.length === 0) {
      return 50; // No preference → neutral score
    }

    const families = preferences.preferred_fragrance_families.map(f => f.toLowerCase());
    if (families.includes(perfume.fragrance_family.toLowerCase())) {
      return 100;
    }

    // Partial credit for related families
    const relatedFamilies = {
      citrus: ['fresh', 'aquatic', 'green'],
      floral: ['fruity', 'green', 'chypre'],
      woody: ['aromatic', 'leather', 'fougere'],
      oriental: ['spicy', 'gourmand', 'leather'],
      fresh: ['citrus', 'aquatic', 'green'],
      aquatic: ['fresh', 'citrus'],
      gourmand: ['oriental', 'sweet'],
      aromatic: ['woody', 'fougere', 'green'],
      chypre: ['floral', 'woody'],
      fougere: ['aromatic', 'woody'],
      leather: ['woody', 'oriental'],
      musk: ['floral', 'oriental'],
      green: ['fresh', 'citrus', 'aromatic'],
      fruity: ['floral', 'fresh'],
      spicy: ['oriental', 'woody']
    };

    const related = relatedFamilies[perfume.fragrance_family.toLowerCase()] || [];
    const hasRelated = families.some(f => related.includes(f));
    if (hasRelated) return 60;

    return 10; // No match at all
  }

  /**
   * Fragrance Notes Score (0-100)
   * Based on how many preferred notes are present in the perfume's note profile
   */
  scoreFragranceNotes(preferences, perfume) {
    if (!preferences.preferred_notes || preferences.preferred_notes.length === 0) {
      return 50; // Neutral
    }

    const prefNotes = preferences.preferred_notes.map(n => n.toLowerCase());
    const perfumeNotes = [
      ...(perfume.top_notes || []),
      ...(perfume.middle_notes || []),
      ...(perfume.base_notes || [])
    ].map(n => n.toLowerCase());

    if (perfumeNotes.length === 0) return 30;

    const matchCount = prefNotes.filter(n => perfumeNotes.includes(n)).length;
    const matchRatio = matchCount / prefNotes.length;

    return Math.round(matchRatio * 100);
  }

  /**
   * Occasion Score (0-100)
   */
  scoreOccasion(preferences, perfume) {
    if (!preferences.preferred_occasions || preferences.preferred_occasions.length === 0) {
      return 50;
    }

    const prefOccasions = preferences.preferred_occasions.map(o => o.toLowerCase());
    const perfumeOccasions = (perfume.occasions || []).map(o => o.toLowerCase());

    if (perfumeOccasions.length === 0) return 30;

    const matchCount = prefOccasions.filter(o => perfumeOccasions.includes(o)).length;
    if (matchCount > 0) {
      return Math.min(100, 70 + (matchCount / prefOccasions.length) * 30);
    }

    return 15;
  }

  /**
   * Season Score (0-100)
   */
  scoreSeason(preferences, perfume) {
    if (!preferences.preferred_seasons || preferences.preferred_seasons.length === 0) {
      return 50;
    }

    const prefSeasons = preferences.preferred_seasons.map(s => s.toLowerCase());
    const perfumeSeasons = (perfume.seasons || []).map(s => s.toLowerCase());

    if (perfumeSeasons.length === 0) return 30;

    const matchCount = prefSeasons.filter(s => perfumeSeasons.includes(s)).length;
    if (matchCount > 0) {
      return Math.min(100, 70 + (matchCount / prefSeasons.length) * 30);
    }

    return 10;
  }

  /**
   * Budget Score (0-100)
   * The closer to the budget range center, the higher the score.
   */
  scoreBudget(preferences, perfume) {
    if (!preferences.budget_max) return 50;

    const max = preferences.budget_max;
    const min = preferences.budget_min || 0;
    const price = perfume.price;

    if (price > max) return 0; // Should be filtered by hard constraints
    if (price < min) return 40; // Below budget floor — not ideal

    // Within range: score based on how well it uses the budget
    // Sweet spot is 50-80% of max budget
    const ratio = price / max;
    if (ratio >= 0.5 && ratio <= 0.8) return 100;
    if (ratio < 0.5) return 60 + (ratio / 0.5) * 30;
    return 70 + ((1 - ratio) / 0.2) * 30;
  }

  /**
   * Time of Day Score (0-100)
   */
  scoreTimeOfDay(preferences, perfume) {
    if (!preferences.preferred_time_of_day || preferences.preferred_time_of_day === 'any') {
      return 50;
    }

    const prefTime = preferences.preferred_time_of_day.toLowerCase();
    const perfumeTime = (perfume.time_of_day || 'both').toLowerCase();

    if (perfumeTime === 'both') return 80;
    if (perfumeTime === prefTime) return 100;
    return 20;
  }

  /**
   * Intensity Score (0-100)
   */
  scoreIntensity(preferences, perfume) {
    if (!preferences.preferred_intensity || preferences.preferred_intensity === 'any') {
      return 50;
    }

    const levels = ['light', 'moderate', 'strong', 'intense'];
    const prefIdx = levels.indexOf(preferences.preferred_intensity.toLowerCase());
    const perfIdx = levels.indexOf((perfume.intensity || 'moderate').toLowerCase());

    if (prefIdx === -1 || perfIdx === -1) return 50;

    const diff = Math.abs(prefIdx - perfIdx);
    if (diff === 0) return 100;
    if (diff === 1) return 70;
    if (diff === 2) return 40;
    return 15;
  }

  /**
   * Gender Score (0-100)
   */
  scoreGender(preferences, perfume) {
    if (!preferences.gender_preference || preferences.gender_preference === 'any') {
      return 50;
    }

    if (perfume.gender === 'unisex') return 90;
    if (perfume.gender === preferences.gender_preference) return 100;
    return 0; // Should be filtered, but just in case
  }

  /**
   * Apply weights to get final weighted score (0-100).
   */
  calculateWeightedScore(scores) {
    let total = 0;
    total += scores.fragranceFamily * this.weights.fragranceFamily;
    total += scores.fragranceNotes * this.weights.fragranceNotes;
    total += scores.occasion * this.weights.occasion;
    total += scores.season * this.weights.season;
    total += scores.budget * this.weights.budget;
    total += scores.timeOfDay * this.weights.timeOfDay;
    total += scores.intensity * this.weights.intensity;
    total += scores.gender * this.weights.gender;
    return total;
  }

  /**
   * Build detailed match/unmatch lists for transparency.
   */
  buildMatchDetails(preferences, perfume, scores) {
    const matched = [];
    const unmatched = [];

    // Budget
    if (scores.budget >= 60) {
      matched.push(`Within budget (₹${perfume.price})`);
    } else if (preferences.budget_max) {
      unmatched.push(`Price may not match budget preference`);
    }

    // Fragrance family
    if (scores.fragranceFamily >= 80) {
      matched.push(`Matches preferred fragrance family: ${perfume.fragrance_family}`);
    } else if (scores.fragranceFamily >= 50) {
      matched.push(`Related fragrance family: ${perfume.fragrance_family}`);
    } else if (preferences.preferred_fragrance_families?.length > 0) {
      unmatched.push(`Different fragrance family: ${perfume.fragrance_family}`);
    }

    // Season
    if (scores.season >= 70) {
      matched.push(`Suitable for preferred season(s)`);
    } else if (preferences.preferred_seasons?.length > 0) {
      unmatched.push(`Not ideal for selected season`);
    }

    // Occasion
    if (scores.occasion >= 70) {
      matched.push(`Suitable for preferred occasion(s)`);
    } else if (preferences.preferred_occasions?.length > 0) {
      unmatched.push(`Not typical for selected occasion`);
    }

    // Time
    if (scores.timeOfDay >= 70) {
      matched.push(`Suitable for ${preferences.preferred_time_of_day || 'any'} wear`);
    }

    // Intensity
    if (scores.intensity >= 70) {
      matched.push(`Intensity matches preference: ${perfume.intensity}`);
    } else if (scores.intensity < 50 && preferences.preferred_intensity) {
      unmatched.push(`Intensity (${perfume.intensity}) differs from preference (${preferences.preferred_intensity})`);
    }

    // Notes
    if (scores.fragranceNotes >= 60) {
      matched.push(`Contains preferred fragrance notes`);
    }

    // Rating bonus
    if (perfume.rating >= 4.0) {
      matched.push(`Highly rated (${perfume.rating}/5)`);
    }

    return { matched, unmatched };
  }

  /**
   * Generate a deterministic human-readable reason string.
   * This is NOT generated by LLM — it is rule-based.
   */
  generateReasonText(perfume, matched, unmatched, score) {
    const parts = [];

    parts.push(`${perfume.brand} ${perfume.perfume_name} scored ${Math.round(score)}/100.`);

    if (matched.length > 0) {
      parts.push(`Strengths: ${matched.slice(0, 3).join('; ')}.`);
    }

    if (unmatched.length > 0 && unmatched.length <= 2) {
      parts.push(`Note: ${unmatched.join('; ')}.`);
    }

    return parts.join(' ');
  }
}

module.exports = RecommendationEngine;
