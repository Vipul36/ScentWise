/**
 * Preference & Recommendation Models
 */
const db = require('../config/database');

const PreferenceModel = {
  async create(preference) {
    const { rows } = await db.query(
      `INSERT INTO user_preferences 
        (user_id, session_id, budget_min, budget_max, gender_preference,
         preferred_seasons, preferred_occasions, preferred_time_of_day,
         preferred_fragrance_families, preferred_notes, preferred_intensity,
         natural_language_input)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        preference.user_id || null,
        preference.session_id || null,
        preference.budget_min || null,
        preference.budget_max || null,
        preference.gender_preference || 'any',
        preference.preferred_seasons || [],
        preference.preferred_occasions || [],
        preference.preferred_time_of_day || 'any',
        preference.preferred_fragrance_families || [],
        preference.preferred_notes || [],
        preference.preferred_intensity || 'any',
        preference.natural_language_input || null
      ]
    );
    return rows[0];
  },

  async getByUserId(userId) {
    const { rows } = await db.query(
      'SELECT * FROM user_preferences WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return rows;
  },

  async getById(id) {
    const { rows } = await db.query(
      'SELECT * FROM user_preferences WHERE id = $1',
      [id]
    );
    return rows[0] || null;
  }
};

const RecommendationModel = {
  async createBatch(recommendations) {
    const values = [];
    const params = [];
    let idx = 1;

    for (const rec of recommendations) {
      values.push(`($${idx}, $${idx+1}, $${idx+2}, $${idx+3}, $${idx+4}, $${idx+5}, $${idx+6}, $${idx+7}, $${idx+8}, $${idx+9}, $${idx+10}, $${idx+11}, $${idx+12}, $${idx+13}, $${idx+14}, $${idx+15})`);
      params.push(
        rec.preference_id, rec.user_id || null, rec.perfume_id,
        rec.rank_position, rec.final_score,
        rec.scores.fragrance_score, rec.scores.occasion_score,
        rec.scores.season_score, rec.scores.budget_score,
        rec.scores.time_score, rec.scores.intensity_score,
        rec.scores.gender_score, rec.scores.notes_score,
        JSON.stringify(rec.matched_preferences),
        JSON.stringify(rec.unmatched_preferences),
        rec.reason_text
      );
      idx += 16;
    }

    if (values.length === 0) return [];

    const { rows } = await db.query(
      `INSERT INTO recommendations 
        (preference_id, user_id, perfume_id, rank_position, final_score,
         fragrance_score, occasion_score, season_score, budget_score,
         time_score, intensity_score, gender_score, notes_score,
         matched_preferences, unmatched_preferences, reason_text)
       VALUES ${values.join(', ')}
       RETURNING *`,
      params
    );
    return rows;
  },

  async getByPreferenceId(preferenceId) {
    const { rows } = await db.query(`
      SELECT r.*, p.brand, p.perfume_name, p.price, p.rating, p.review_count,
             p.fragrance_family, p.intensity, p.gender, p.image_url,
             ARRAY(SELECT fn.note_name FROM perfume_notes pn JOIN fragrance_notes fn ON pn.note_id = fn.id WHERE pn.perfume_id = p.id AND pn.note_layer = 'top') AS top_notes,
             ARRAY(SELECT fn.note_name FROM perfume_notes pn JOIN fragrance_notes fn ON pn.note_id = fn.id WHERE pn.perfume_id = p.id AND pn.note_layer = 'middle') AS middle_notes,
             ARRAY(SELECT fn.note_name FROM perfume_notes pn JOIN fragrance_notes fn ON pn.note_id = fn.id WHERE pn.perfume_id = p.id AND pn.note_layer = 'base') AS base_notes,
             ARRAY(SELECT ps.season FROM perfume_seasons ps WHERE ps.perfume_id = p.id) AS seasons,
             ARRAY(SELECT po.occasion FROM perfume_occasions po WHERE po.perfume_id = p.id) AS occasions
      FROM recommendations r
      JOIN perfumes p ON r.perfume_id = p.id
      WHERE r.preference_id = $1
      ORDER BY r.rank_position ASC
    `, [preferenceId]);
    return rows;
  },

  async getByUserId(userId) {
    const { rows } = await db.query(`
      SELECT r.*, p.brand, p.perfume_name, p.price, p.rating, p.fragrance_family, p.image_url
      FROM recommendations r
      JOIN perfumes p ON r.perfume_id = p.id
      WHERE r.user_id = $1
      ORDER BY r.created_at DESC, r.rank_position ASC
      LIMIT 100
    `, [userId]);
    return rows;
  },

  async updateAIExplanation(recommendationId, explanation) {
    await db.query(
      'UPDATE recommendations SET ai_explanation = $1 WHERE id = $2',
      [explanation, recommendationId]
    );
  }
};

module.exports = { PreferenceModel, RecommendationModel };
