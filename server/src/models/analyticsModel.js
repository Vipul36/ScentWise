/**
 * Interaction & Analytics Models
 */
const db = require('../config/database');

const InteractionModel = {
  async create(interaction) {
    const { rows } = await db.query(
      `INSERT INTO interactions (user_id, session_id, event_type, perfume_id, recommendation_id, preference_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        interaction.user_id || null,
        interaction.session_id || null,
        interaction.event_type,
        interaction.perfume_id || null,
        interaction.recommendation_id || null,
        interaction.preference_id || null,
        interaction.metadata ? JSON.stringify(interaction.metadata) : null
      ]
    );
    return rows[0];
  },

  async getByUserId(userId, limit = 50) {
    const { rows } = await db.query(
      'SELECT * FROM interactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
      [userId, limit]
    );
    return rows;
  }
};

const AnalyticsModel = {
  async getOverview() {
    const { rows } = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM users) AS total_users,
        (SELECT COUNT(DISTINCT user_id) FROM interactions WHERE created_at > NOW() - INTERVAL '30 days') AS active_users_30d,
        (SELECT COUNT(*) FROM perfumes WHERE is_active = true) AS total_perfumes,
        (SELECT COUNT(*) FROM recommendations) AS total_recommendations,
        (SELECT COUNT(*) FROM interactions WHERE event_type = 'recommendation_viewed') AS recommendation_views,
        (SELECT COUNT(*) FROM interactions WHERE event_type = 'perfume_clicked') AS perfume_clicks,
        (SELECT COUNT(*) FROM interactions WHERE event_type = 'add_to_cart') AS add_to_carts,
        (SELECT COUNT(*) FROM interactions WHERE event_type = 'purchase') AS purchases,
        (SELECT COUNT(*) FROM reviews) AS total_reviews,
        (SELECT ROUND(AVG(rating)::NUMERIC, 2) FROM reviews) AS avg_review_rating
    `);
    
    const overview = rows[0];
    
    // Calculate KPIs
    const recViews = parseInt(overview.recommendation_views) || 1;
    overview.recommendation_ctr = overview.perfume_clicks > 0
      ? Math.round((parseInt(overview.perfume_clicks) / recViews) * 10000) / 100
      : 0;
    overview.conversion_rate = overview.recommendation_views > 0
      ? Math.round((parseInt(overview.purchases) / recViews) * 10000) / 100
      : 0;

    return overview;
  },

  async getPreferenceDistribution() {
    // Fragrance family preferences
    const { rows: familyDist } = await db.query(`
      SELECT unnest(preferred_fragrance_families) AS family, COUNT(*) AS count
      FROM user_preferences
      WHERE preferred_fragrance_families IS NOT NULL AND array_length(preferred_fragrance_families, 1) > 0
      GROUP BY family
      ORDER BY count DESC
    `);

    // Season preferences
    const { rows: seasonDist } = await db.query(`
      SELECT unnest(preferred_seasons) AS season, COUNT(*) AS count
      FROM user_preferences
      WHERE preferred_seasons IS NOT NULL AND array_length(preferred_seasons, 1) > 0
      GROUP BY season
      ORDER BY count DESC
    `);

    // Occasion preferences
    const { rows: occasionDist } = await db.query(`
      SELECT unnest(preferred_occasions) AS occasion, COUNT(*) AS count
      FROM user_preferences
      WHERE preferred_occasions IS NOT NULL AND array_length(preferred_occasions, 1) > 0
      GROUP BY occasion
      ORDER BY count DESC
    `);

    // Budget distribution
    const { rows: budgetDist } = await db.query(`
      SELECT
        CASE
          WHEN budget_max <= 1000 THEN 'Under ₹1000'
          WHEN budget_max <= 3000 THEN '₹1000 - ₹3000'
          WHEN budget_max <= 5000 THEN '₹3000 - ₹5000'
          WHEN budget_max <= 10000 THEN '₹5000 - ₹10000'
          ELSE 'Above ₹10000'
        END AS budget_range,
        COUNT(*) AS count
      FROM user_preferences
      WHERE budget_max IS NOT NULL
      GROUP BY budget_range
      ORDER BY count DESC
    `);

    return { familyDist, seasonDist, occasionDist, budgetDist };
  },

  async getPerfumePerformance() {
    const { rows } = await db.query(`
      SELECT p.id, p.brand, p.perfume_name, p.fragrance_family, p.price, p.rating,
        COUNT(CASE WHEN i.event_type = 'perfume_viewed' THEN 1 END) AS views,
        COUNT(CASE WHEN i.event_type = 'perfume_clicked' THEN 1 END) AS clicks,
        COUNT(CASE WHEN i.event_type = 'perfume_saved' THEN 1 END) AS saves,
        COUNT(CASE WHEN i.event_type = 'add_to_cart' THEN 1 END) AS cart_adds,
        COUNT(CASE WHEN i.event_type = 'purchase' THEN 1 END) AS purchases
      FROM perfumes p
      LEFT JOIN interactions i ON p.id = i.perfume_id
      GROUP BY p.id, p.brand, p.perfume_name, p.fragrance_family, p.price, p.rating
      ORDER BY views DESC
      LIMIT 50
    `);
    return rows;
  },

  async getRecommendationPerformance() {
    const { rows } = await db.query(`
      SELECT p.fragrance_family,
        COUNT(*) AS times_recommended,
        ROUND(AVG(r.final_score)::NUMERIC, 2) AS avg_score,
        COUNT(CASE WHEN i.event_type = 'perfume_clicked' THEN 1 END) AS clicks,
        COUNT(CASE WHEN i.event_type = 'purchase' THEN 1 END) AS purchases
      FROM recommendations r
      JOIN perfumes p ON r.perfume_id = p.id
      LEFT JOIN interactions i ON r.perfume_id = i.perfume_id AND r.user_id = i.user_id
      GROUP BY p.fragrance_family
      ORDER BY times_recommended DESC
    `);
    return rows;
  },

  async getInteractionTrends(days = 30) {
    const { rows } = await db.query(`
      SELECT DATE(created_at) AS date, event_type, COUNT(*) AS count
      FROM interactions
      WHERE created_at > NOW() - INTERVAL '1 day' * $1
      GROUP BY DATE(created_at), event_type
      ORDER BY date ASC
    `, [days]);
    return rows;
  },

  async getTopFragranceNotes() {
    const { rows } = await db.query(`
      SELECT fn.note_name, fn.category, COUNT(*) AS usage_count
      FROM perfume_notes pn
      JOIN fragrance_notes fn ON pn.note_id = fn.id
      GROUP BY fn.note_name, fn.category
      ORDER BY usage_count DESC
      LIMIT 30
    `);
    return rows;
  },

  async getPriceDistribution() {
    const { rows } = await db.query(`
      SELECT
        CASE
          WHEN price < 1000 THEN 'Under ₹1000'
          WHEN price < 3000 THEN '₹1000-₹3000'
          WHEN price < 5000 THEN '₹3000-₹5000'
          WHEN price < 10000 THEN '₹5000-₹10000'
          WHEN price < 20000 THEN '₹10000-₹20000'
          ELSE 'Above ₹20000'
        END AS price_range,
        COUNT(*) AS count,
        ROUND(AVG(rating)::NUMERIC, 2) AS avg_rating
      FROM perfumes
      WHERE is_active = true
      GROUP BY price_range
      ORDER BY count DESC
    `);
    return rows;
  },

  async getRatingDistribution() {
    const { rows } = await db.query(`
      SELECT
        CASE
          WHEN rating < 2 THEN '1-2'
          WHEN rating < 3 THEN '2-3'
          WHEN rating < 4 THEN '3-4'
          WHEN rating < 4.5 THEN '4-4.5'
          ELSE '4.5-5'
        END AS rating_range,
        COUNT(*) AS count
      FROM perfumes
      WHERE is_active = true AND rating IS NOT NULL
      GROUP BY rating_range
      ORDER BY rating_range
    `);
    return rows;
  }
};

module.exports = { InteractionModel, AnalyticsModel };
