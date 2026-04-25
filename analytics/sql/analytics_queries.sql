-- ============================================================================
-- ScentWise — SQL Analytics Queries
-- ============================================================================
-- These queries answer real business questions for a perfume recommendation
-- platform. Each query includes the business question it answers.
--
-- Techniques demonstrated:
--   JOIN, GROUP BY, HAVING, CASE, CTEs, Subqueries, Window Functions,
--   Aggregate Functions, ARRAY_AGG, UNNEST, COALESCE, NULLS handling
-- ============================================================================


-- ============================================================================
-- Q1: Most Popular Perfumes by Total Interactions
-- Business Question: Which perfumes receive the most user engagement?
-- ============================================================================
SELECT 
  p.brand,
  p.perfume_name,
  p.fragrance_family,
  p.price,
  p.rating,
  COUNT(i.id) AS total_interactions,
  COUNT(CASE WHEN i.event_type = 'perfume_viewed' THEN 1 END) AS views,
  COUNT(CASE WHEN i.event_type = 'perfume_clicked' THEN 1 END) AS clicks,
  COUNT(CASE WHEN i.event_type = 'purchase' THEN 1 END) AS purchases
FROM perfumes p
LEFT JOIN interactions i ON p.id = i.perfume_id
GROUP BY p.id, p.brand, p.perfume_name, p.fragrance_family, p.price, p.rating
ORDER BY total_interactions DESC
LIMIT 20;


-- ============================================================================
-- Q2: Most Popular Fragrance Families
-- Business Question: Which fragrance families do users prefer most?
-- ============================================================================
SELECT 
  p.fragrance_family,
  COUNT(DISTINCT p.id) AS perfume_count,
  ROUND(AVG(p.rating)::NUMERIC, 2) AS avg_rating,
  ROUND(AVG(p.price)::NUMERIC, 2) AS avg_price,
  COUNT(i.id) AS total_interactions
FROM perfumes p
LEFT JOIN interactions i ON p.id = i.perfume_id
WHERE p.is_active = true
GROUP BY p.fragrance_family
ORDER BY total_interactions DESC;


-- ============================================================================
-- Q3: Average Perfume Price by Fragrance Family
-- Business Question: What is the pricing landscape across categories?
-- ============================================================================
SELECT 
  fragrance_family,
  COUNT(*) AS count,
  ROUND(MIN(price)::NUMERIC, 2) AS min_price,
  ROUND(AVG(price)::NUMERIC, 2) AS avg_price,
  ROUND(MAX(price)::NUMERIC, 2) AS max_price,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price)::NUMERIC, 2) AS median_price
FROM perfumes
WHERE is_active = true
GROUP BY fragrance_family
ORDER BY avg_price DESC;


-- ============================================================================
-- Q4: Average Rating by Brand (Brands with 5+ Perfumes)
-- Business Question: Which brands consistently deliver high-quality perfumes?
-- ============================================================================
SELECT 
  brand,
  COUNT(*) AS perfume_count,
  ROUND(AVG(rating)::NUMERIC, 2) AS avg_rating,
  ROUND(MIN(rating)::NUMERIC, 2) AS min_rating,
  ROUND(MAX(rating)::NUMERIC, 2) AS max_rating,
  SUM(review_count) AS total_reviews
FROM perfumes
WHERE is_active = true AND rating IS NOT NULL
GROUP BY brand
HAVING COUNT(*) >= 5
ORDER BY avg_rating DESC;


-- ============================================================================
-- Q5: Recommendation Click-Through Rate (CTR)
-- Business Question: How effectively do recommendations drive user engagement?
-- ============================================================================
WITH rec_stats AS (
  SELECT
    COUNT(CASE WHEN event_type = 'recommendation_viewed' THEN 1 END) AS total_views,
    COUNT(CASE WHEN event_type = 'perfume_clicked' THEN 1 END) AS total_clicks,
    COUNT(CASE WHEN event_type = 'add_to_cart' THEN 1 END) AS total_cart_adds,
    COUNT(CASE WHEN event_type = 'purchase' THEN 1 END) AS total_purchases
  FROM interactions
)
SELECT 
  total_views,
  total_clicks,
  total_cart_adds,
  total_purchases,
  CASE WHEN total_views > 0 
    THEN ROUND((total_clicks::NUMERIC / total_views) * 100, 2)
    ELSE 0 
  END AS ctr_percent,
  CASE WHEN total_clicks > 0 
    THEN ROUND((total_cart_adds::NUMERIC / total_clicks) * 100, 2)
    ELSE 0 
  END AS add_to_cart_rate,
  CASE WHEN total_views > 0 
    THEN ROUND((total_purchases::NUMERIC / total_views) * 100, 2)
    ELSE 0 
  END AS conversion_rate
FROM rec_stats;


-- ============================================================================
-- Q6: User Preference Distribution — Preferred Fragrance Families
-- Business Question: What fragrance families do users look for most?
-- ============================================================================
SELECT 
  UNNEST(preferred_fragrance_families) AS family,
  COUNT(*) AS selection_count,
  ROUND(COUNT(*)::NUMERIC / (SELECT COUNT(*) FROM user_preferences WHERE preferred_fragrance_families IS NOT NULL) * 100, 2) AS percentage
FROM user_preferences
WHERE preferred_fragrance_families IS NOT NULL 
  AND array_length(preferred_fragrance_families, 1) > 0
GROUP BY family
ORDER BY selection_count DESC;


-- ============================================================================
-- Q7: Seasonal Preference Trends
-- Business Question: How do fragrance preferences vary by season?
-- ============================================================================
SELECT 
  ps.season,
  p.fragrance_family,
  COUNT(*) AS perfume_count,
  ROUND(AVG(p.rating)::NUMERIC, 2) AS avg_rating,
  COUNT(i.id) AS interactions
FROM perfume_seasons ps
JOIN perfumes p ON ps.perfume_id = p.id
LEFT JOIN interactions i ON p.id = i.perfume_id
GROUP BY ps.season, p.fragrance_family
ORDER BY ps.season, interactions DESC;


-- ============================================================================
-- Q8: Most Recommended Perfumes
-- Business Question: Which perfumes does our algorithm recommend most frequently?
-- ============================================================================
SELECT 
  p.brand,
  p.perfume_name,
  p.fragrance_family,
  p.price,
  p.rating,
  COUNT(r.id) AS times_recommended,
  ROUND(AVG(r.final_score)::NUMERIC, 2) AS avg_score,
  MIN(r.rank_position) AS best_rank
FROM recommendations r
JOIN perfumes p ON r.perfume_id = p.id
GROUP BY p.id, p.brand, p.perfume_name, p.fragrance_family, p.price, p.rating
ORDER BY times_recommended DESC
LIMIT 20;


-- ============================================================================
-- Q9: High-Rating But Low-Engagement Perfumes (Hidden Gems)
-- Business Question: Which highly-rated perfumes are being overlooked?
-- ============================================================================
WITH engagement AS (
  SELECT perfume_id, COUNT(*) AS interaction_count
  FROM interactions
  WHERE perfume_id IS NOT NULL
  GROUP BY perfume_id
)
SELECT 
  p.brand,
  p.perfume_name,
  p.rating,
  p.review_count,
  p.price,
  p.fragrance_family,
  COALESCE(e.interaction_count, 0) AS interactions
FROM perfumes p
LEFT JOIN engagement e ON p.id = e.perfume_id
WHERE p.rating >= 4.0
  AND COALESCE(e.interaction_count, 0) < 5
ORDER BY p.rating DESC, p.review_count DESC
LIMIT 20;


-- ============================================================================
-- Q10: Top Perfumes Within Each Fragrance Family (Window Function)
-- Business Question: What's the best perfume in each category?
-- ============================================================================
WITH ranked_perfumes AS (
  SELECT 
    p.*,
    ROW_NUMBER() OVER (
      PARTITION BY p.fragrance_family 
      ORDER BY p.rating DESC NULLS LAST, p.review_count DESC
    ) AS rank_in_family
  FROM perfumes p
  WHERE p.is_active = true
)
SELECT 
  fragrance_family,
  brand,
  perfume_name,
  rating,
  review_count,
  price,
  rank_in_family
FROM ranked_perfumes
WHERE rank_in_family <= 3
ORDER BY fragrance_family, rank_in_family;


-- ============================================================================
-- Q11: Most Frequently Selected Fragrance Notes in User Preferences
-- Business Question: Which specific notes do users ask for most?
-- ============================================================================
SELECT 
  UNNEST(preferred_notes) AS note_name,
  COUNT(*) AS times_selected
FROM user_preferences
WHERE preferred_notes IS NOT NULL 
  AND array_length(preferred_notes, 1) > 0
GROUP BY note_name
ORDER BY times_selected DESC
LIMIT 20;


-- ============================================================================
-- Q12: Repeat Users Analysis
-- Business Question: How many users come back for multiple recommendation sessions?
-- ============================================================================
WITH user_sessions AS (
  SELECT 
    user_id,
    COUNT(*) AS session_count,
    MIN(created_at) AS first_session,
    MAX(created_at) AS last_session
  FROM user_preferences
  WHERE user_id IS NOT NULL
  GROUP BY user_id
)
SELECT 
  CASE 
    WHEN session_count = 1 THEN 'Single session'
    WHEN session_count BETWEEN 2 AND 3 THEN '2-3 sessions'
    WHEN session_count BETWEEN 4 AND 5 THEN '4-5 sessions'
    ELSE '6+ sessions'
  END AS user_segment,
  COUNT(*) AS user_count,
  ROUND(AVG(session_count)::NUMERIC, 1) AS avg_sessions,
  ROUND(AVG(EXTRACT(EPOCH FROM (last_session - first_session)) / 86400)::NUMERIC, 1) AS avg_days_between
FROM user_sessions
GROUP BY user_segment
ORDER BY user_count DESC;


-- ============================================================================
-- Q13: Budget vs. Actual Recommendation Price Match
-- Business Question: What % of users find recommendations within their budget?
-- ============================================================================
WITH budget_match AS (
  SELECT 
    up.id AS preference_id,
    up.budget_max,
    COUNT(r.id) AS total_recs,
    COUNT(CASE WHEN p.price <= up.budget_max THEN 1 END) AS within_budget,
    ROUND(AVG(p.price)::NUMERIC, 2) AS avg_recommended_price
  FROM user_preferences up
  JOIN recommendations r ON up.id = r.preference_id
  JOIN perfumes p ON r.perfume_id = p.id
  WHERE up.budget_max IS NOT NULL
  GROUP BY up.id, up.budget_max
)
SELECT 
  COUNT(*) AS total_preference_sessions,
  ROUND(AVG(within_budget::NUMERIC / NULLIF(total_recs, 0) * 100), 2) AS avg_within_budget_pct,
  ROUND(AVG(budget_max)::NUMERIC, 2) AS avg_budget,
  ROUND(AVG(avg_recommended_price)::NUMERIC, 2) AS avg_rec_price
FROM budget_match;


-- ============================================================================
-- Q14: Top Perfumes by Season
-- Business Question: What are the best-performing perfumes for each season?
-- ============================================================================
WITH seasonal_performance AS (
  SELECT 
    ps.season,
    p.brand,
    p.perfume_name,
    p.rating,
    p.price,
    COUNT(i.id) AS interactions,
    ROW_NUMBER() OVER (PARTITION BY ps.season ORDER BY COUNT(i.id) DESC, p.rating DESC) AS season_rank
  FROM perfume_seasons ps
  JOIN perfumes p ON ps.perfume_id = p.id
  LEFT JOIN interactions i ON p.id = i.perfume_id
  GROUP BY ps.season, p.id, p.brand, p.perfume_name, p.rating, p.price
)
SELECT season, brand, perfume_name, rating, price, interactions, season_rank
FROM seasonal_performance
WHERE season_rank <= 5
ORDER BY season, season_rank;


-- ============================================================================
-- Q15: Rating vs Price Correlation by Family
-- Business Question: Do expensive perfumes actually get better ratings?
-- ============================================================================
SELECT 
  fragrance_family,
  CASE
    WHEN price < 2000 THEN 'Budget (<₹2K)'
    WHEN price < 5000 THEN 'Mid-range (₹2K-5K)'
    WHEN price < 10000 THEN 'Premium (₹5K-10K)'
    ELSE 'Luxury (₹10K+)'
  END AS price_tier,
  COUNT(*) AS perfume_count,
  ROUND(AVG(rating)::NUMERIC, 2) AS avg_rating,
  ROUND(AVG(review_count)::NUMERIC, 0) AS avg_reviews
FROM perfumes
WHERE is_active = true AND rating IS NOT NULL
GROUP BY fragrance_family, price_tier
HAVING COUNT(*) >= 3
ORDER BY fragrance_family, avg_rating DESC;


-- ============================================================================
-- Q16: Brands with Unusually Low Ratings
-- Business Question: Which brands may have quality concerns?
-- ============================================================================
WITH brand_stats AS (
  SELECT 
    brand,
    COUNT(*) AS perfume_count,
    ROUND(AVG(rating)::NUMERIC, 2) AS avg_rating,
    ROUND(STDDEV(rating)::NUMERIC, 2) AS rating_stddev
  FROM perfumes
  WHERE is_active = true AND rating IS NOT NULL
  GROUP BY brand
  HAVING COUNT(*) >= 3
),
overall AS (
  SELECT ROUND(AVG(rating)::NUMERIC, 2) AS overall_avg
  FROM perfumes WHERE is_active = true AND rating IS NOT NULL
)
SELECT 
  bs.brand,
  bs.perfume_count,
  bs.avg_rating,
  bs.rating_stddev,
  o.overall_avg,
  ROUND((bs.avg_rating - o.overall_avg)::NUMERIC, 2) AS diff_from_avg
FROM brand_stats bs, overall o
WHERE bs.avg_rating < o.overall_avg - 0.3
ORDER BY bs.avg_rating ASC;


-- ============================================================================
-- Q17: Daily Interaction Trends (Last 30 Days)
-- Business Question: How is platform engagement trending?
-- ============================================================================
SELECT 
  DATE(created_at) AS date,
  COUNT(*) AS total_events,
  COUNT(DISTINCT user_id) AS unique_users,
  COUNT(CASE WHEN event_type = 'preference_submitted' THEN 1 END) AS preferences,
  COUNT(CASE WHEN event_type = 'perfume_clicked' THEN 1 END) AS clicks,
  COUNT(CASE WHEN event_type = 'purchase' THEN 1 END) AS purchases
FROM interactions
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date ASC;


-- ============================================================================
-- Q18: Notes Frequency Among Top-Rated Perfumes
-- Business Question: Which notes appear most in high-performing perfumes?
-- ============================================================================
SELECT 
  fn.note_name,
  fn.category AS note_category,
  pn.note_layer,
  COUNT(*) AS occurrence_count,
  ROUND(AVG(p.rating)::NUMERIC, 2) AS avg_perfume_rating
FROM perfume_notes pn
JOIN fragrance_notes fn ON pn.note_id = fn.id
JOIN perfumes p ON pn.perfume_id = p.id
WHERE p.rating >= 4.0
GROUP BY fn.note_name, fn.category, pn.note_layer
ORDER BY occurrence_count DESC
LIMIT 25;


-- ============================================================================
-- Q19: Recommendation Score Distribution
-- Business Question: How are recommendation scores distributed?
-- ============================================================================
SELECT 
  CASE 
    WHEN final_score >= 80 THEN 'Excellent (80-100)'
    WHEN final_score >= 60 THEN 'Good (60-79)'
    WHEN final_score >= 40 THEN 'Fair (40-59)'
    ELSE 'Low (<40)'
  END AS score_tier,
  COUNT(*) AS recommendation_count,
  ROUND(AVG(final_score)::NUMERIC, 2) AS avg_score,
  COUNT(DISTINCT preference_id) AS unique_sessions
FROM recommendations
GROUP BY score_tier
ORDER BY avg_score DESC;


-- ============================================================================
-- Q20: Occasion-wise Engagement Analysis
-- Business Question: Which occasions drive the most perfume exploration?
-- ============================================================================
WITH occasion_perfumes AS (
  SELECT po.occasion, po.perfume_id
  FROM perfume_occasions po
),
occasion_engagement AS (
  SELECT 
    op.occasion,
    COUNT(DISTINCT op.perfume_id) AS perfume_count,
    COUNT(i.id) AS total_interactions,
    COUNT(CASE WHEN i.event_type = 'perfume_clicked' THEN 1 END) AS clicks,
    COUNT(CASE WHEN i.event_type = 'purchase' THEN 1 END) AS purchases
  FROM occasion_perfumes op
  LEFT JOIN interactions i ON op.perfume_id = i.perfume_id
  GROUP BY op.occasion
)
SELECT 
  occasion,
  perfume_count,
  total_interactions,
  clicks,
  purchases,
  CASE WHEN total_interactions > 0 
    THEN ROUND((clicks::NUMERIC / total_interactions) * 100, 2)
    ELSE 0 
  END AS click_rate
FROM occasion_engagement
ORDER BY total_interactions DESC;
