/**
 * Perfume Model — Database queries for perfume data
 */
const db = require('../config/database');

const PerfumeModel = {
  /**
   * Get all perfumes with pagination, filtering, and search.
   */
  async getAll({ page = 1, limit = 20, search, fragranceFamily, gender, minPrice, maxPrice, season, occasion, sortBy = 'rating', sortOrder = 'DESC' } = {}) {
    let query = `
      SELECT DISTINCT p.*,
        ARRAY(SELECT fn.note_name FROM perfume_notes pn JOIN fragrance_notes fn ON pn.note_id = fn.id WHERE pn.perfume_id = p.id AND pn.note_layer = 'top') AS top_notes,
        ARRAY(SELECT fn.note_name FROM perfume_notes pn JOIN fragrance_notes fn ON pn.note_id = fn.id WHERE pn.perfume_id = p.id AND pn.note_layer = 'middle') AS middle_notes,
        ARRAY(SELECT fn.note_name FROM perfume_notes pn JOIN fragrance_notes fn ON pn.note_id = fn.id WHERE pn.perfume_id = p.id AND pn.note_layer = 'base') AS base_notes,
        ARRAY(SELECT ps.season FROM perfume_seasons ps WHERE ps.perfume_id = p.id) AS seasons,
        ARRAY(SELECT po.occasion FROM perfume_occasions po WHERE po.perfume_id = p.id) AS occasions,
        (SELECT pt.time_of_day FROM perfume_time_of_day pt WHERE pt.perfume_id = p.id LIMIT 1) AS time_of_day
      FROM perfumes p
      WHERE p.is_active = true
    `;
    const params = [];
    let paramIdx = 1;

    if (search) {
      query += ` AND (p.perfume_name ILIKE $${paramIdx} OR p.brand ILIKE $${paramIdx})`;
      params.push(`%${search}%`);
      paramIdx++;
    }
    if (fragranceFamily) {
      query += ` AND p.fragrance_family = $${paramIdx}`;
      params.push(fragranceFamily.toLowerCase());
      paramIdx++;
    }
    if (gender) {
      query += ` AND (p.gender = $${paramIdx} OR p.gender = 'unisex')`;
      params.push(gender.toLowerCase());
      paramIdx++;
    }
    if (minPrice) {
      query += ` AND p.price >= $${paramIdx}`;
      params.push(parseFloat(minPrice));
      paramIdx++;
    }
    if (maxPrice) {
      query += ` AND p.price <= $${paramIdx}`;
      params.push(parseFloat(maxPrice));
      paramIdx++;
    }
    if (season) {
      query += ` AND EXISTS (SELECT 1 FROM perfume_seasons ps WHERE ps.perfume_id = p.id AND ps.season = $${paramIdx})`;
      params.push(season.toLowerCase());
      paramIdx++;
    }
    if (occasion) {
      query += ` AND EXISTS (SELECT 1 FROM perfume_occasions po WHERE po.perfume_id = p.id AND po.occasion = $${paramIdx})`;
      params.push(occasion.toLowerCase());
      paramIdx++;
    }

    // Count total
    const countQuery = `SELECT COUNT(*) FROM (${query}) AS count_query`;
    const { rows: countRows } = await db.query(countQuery, params);
    const total = parseInt(countRows[0].count, 10);

    // Sorting
    const validSorts = ['rating', 'price', 'review_count', 'created_at', 'perfume_name'];
    const sort = validSorts.includes(sortBy) ? sortBy : 'rating';
    const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    query += ` ORDER BY p.${sort} ${order} NULLS LAST`;

    // Pagination
    const offset = (page - 1) * limit;
    query += ` LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
    params.push(limit, offset);

    const { rows } = await db.query(query, params);
    return { perfumes: rows, total };
  },

  /**
   * Get a single perfume by ID with full details.
   */
  async getById(id) {
    const { rows } = await db.query(`
      SELECT p.*,
        ARRAY(SELECT fn.note_name FROM perfume_notes pn JOIN fragrance_notes fn ON pn.note_id = fn.id WHERE pn.perfume_id = p.id AND pn.note_layer = 'top') AS top_notes,
        ARRAY(SELECT fn.note_name FROM perfume_notes pn JOIN fragrance_notes fn ON pn.note_id = fn.id WHERE pn.perfume_id = p.id AND pn.note_layer = 'middle') AS middle_notes,
        ARRAY(SELECT fn.note_name FROM perfume_notes pn JOIN fragrance_notes fn ON pn.note_id = fn.id WHERE pn.perfume_id = p.id AND pn.note_layer = 'base') AS base_notes,
        ARRAY(SELECT ps.season FROM perfume_seasons ps WHERE ps.perfume_id = p.id) AS seasons,
        ARRAY(SELECT po.occasion FROM perfume_occasions po WHERE po.perfume_id = p.id) AS occasions,
        (SELECT pt.time_of_day FROM perfume_time_of_day pt WHERE pt.perfume_id = p.id LIMIT 1) AS time_of_day
      FROM perfumes p
      WHERE p.id = $1
    `, [id]);
    return rows[0] || null;
  },

  /**
   * Get all perfumes for recommendation engine (no pagination).
   */
  async getAllForRecommendation() {
    const { rows } = await db.query(`
      SELECT p.*,
        ARRAY(SELECT fn.note_name FROM perfume_notes pn JOIN fragrance_notes fn ON pn.note_id = fn.id WHERE pn.perfume_id = p.id AND pn.note_layer = 'top') AS top_notes,
        ARRAY(SELECT fn.note_name FROM perfume_notes pn JOIN fragrance_notes fn ON pn.note_id = fn.id WHERE pn.perfume_id = p.id AND pn.note_layer = 'middle') AS middle_notes,
        ARRAY(SELECT fn.note_name FROM perfume_notes pn JOIN fragrance_notes fn ON pn.note_id = fn.id WHERE pn.perfume_id = p.id AND pn.note_layer = 'base') AS base_notes,
        ARRAY(SELECT ps.season FROM perfume_seasons ps WHERE ps.perfume_id = p.id) AS seasons,
        ARRAY(SELECT po.occasion FROM perfume_occasions po WHERE po.perfume_id = p.id) AS occasions,
        (SELECT pt.time_of_day FROM perfume_time_of_day pt WHERE pt.perfume_id = p.id LIMIT 1) AS time_of_day
      FROM perfumes p
      WHERE p.is_active = true
    `);
    return rows;
  },

  /**
   * Get distinct fragrance families.
   */
  async getFragranceFamilies() {
    const { rows } = await db.query(
      'SELECT DISTINCT fragrance_family FROM perfumes WHERE is_active = true ORDER BY fragrance_family'
    );
    return rows.map(r => r.fragrance_family);
  },

  /**
   * Get distinct brands.
   */
  async getBrands() {
    const { rows } = await db.query(
      'SELECT DISTINCT brand FROM perfumes WHERE is_active = true ORDER BY brand'
    );
    return rows.map(r => r.brand);
  },

  /**
   * Get all fragrance notes.
   */
  async getNotes() {
    const { rows } = await db.query(
      'SELECT note_name, category FROM fragrance_notes ORDER BY category, note_name'
    );
    return rows;
  }
};

module.exports = PerfumeModel;
