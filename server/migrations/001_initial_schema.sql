-- ============================================================================
-- ScentWise — Database Schema
-- PostgreSQL Migration: Full schema creation
-- ============================================================================
-- This migration creates the complete normalized schema for the ScentWise
-- platform, designed for both application use and analytical queries.
-- ============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. USERS — Registered platform users
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(100),
  gender_preference VARCHAR(20) CHECK (gender_preference IN ('male', 'female', 'unisex', 'any')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);

-- ============================================================================
-- 2. PERFUMES — Core perfume catalog
-- ============================================================================
CREATE TABLE IF NOT EXISTS perfumes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand VARCHAR(100) NOT NULL,
  perfume_name VARCHAR(200) NOT NULL,
  gender VARCHAR(20) NOT NULL CHECK (gender IN ('male', 'female', 'unisex')),
  price NUMERIC(10, 2) NOT NULL CHECK (price > 0),
  rating NUMERIC(3, 2) CHECK (rating >= 0 AND rating <= 5),
  review_count INTEGER DEFAULT 0 CHECK (review_count >= 0),
  fragrance_family VARCHAR(50) NOT NULL,
  intensity VARCHAR(20) CHECK (intensity IN ('light', 'moderate', 'strong', 'intense')),
  longevity VARCHAR(20) CHECK (longevity IN ('short', 'moderate', 'long', 'very_long')),
  sillage VARCHAR(20) CHECK (sillage IN ('intimate', 'moderate', 'strong', 'enormous')),
  description TEXT,
  image_url TEXT,
  product_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_perfumes_brand ON perfumes(brand);
CREATE INDEX idx_perfumes_gender ON perfumes(gender);
CREATE INDEX idx_perfumes_fragrance_family ON perfumes(fragrance_family);
CREATE INDEX idx_perfumes_price ON perfumes(price);
CREATE INDEX idx_perfumes_rating ON perfumes(rating);
CREATE INDEX idx_perfumes_is_active ON perfumes(is_active);

-- ============================================================================
-- 3. FRAGRANCE_NOTES — Normalized note catalog
-- ============================================================================
CREATE TABLE IF NOT EXISTS fragrance_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  note_name VARCHAR(100) UNIQUE NOT NULL,
  category VARCHAR(50), -- e.g., 'citrus', 'floral', 'woody', 'spicy'
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_fragrance_notes_name ON fragrance_notes(note_name);
CREATE INDEX idx_fragrance_notes_category ON fragrance_notes(category);

-- ============================================================================
-- 4. PERFUME_NOTES — Many-to-many: perfumes ↔ notes with layer position
-- ============================================================================
CREATE TABLE IF NOT EXISTS perfume_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  perfume_id UUID NOT NULL REFERENCES perfumes(id) ON DELETE CASCADE,
  note_id UUID NOT NULL REFERENCES fragrance_notes(id) ON DELETE CASCADE,
  note_layer VARCHAR(10) NOT NULL CHECK (note_layer IN ('top', 'middle', 'base')),
  UNIQUE(perfume_id, note_id, note_layer)
);

CREATE INDEX idx_perfume_notes_perfume ON perfume_notes(perfume_id);
CREATE INDEX idx_perfume_notes_note ON perfume_notes(note_id);

-- ============================================================================
-- 5. PERFUME_SEASONS — Which seasons a perfume is suitable for
-- ============================================================================
CREATE TABLE IF NOT EXISTS perfume_seasons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  perfume_id UUID NOT NULL REFERENCES perfumes(id) ON DELETE CASCADE,
  season VARCHAR(20) NOT NULL CHECK (season IN ('spring', 'summer', 'autumn', 'winter')),
  UNIQUE(perfume_id, season)
);

CREATE INDEX idx_perfume_seasons_perfume ON perfume_seasons(perfume_id);
CREATE INDEX idx_perfume_seasons_season ON perfume_seasons(season);

-- ============================================================================
-- 6. PERFUME_OCCASIONS — Which occasions a perfume suits
-- ============================================================================
CREATE TABLE IF NOT EXISTS perfume_occasions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  perfume_id UUID NOT NULL REFERENCES perfumes(id) ON DELETE CASCADE,
  occasion VARCHAR(30) NOT NULL CHECK (occasion IN ('office', 'casual', 'formal', 'date_night', 'party', 'outdoor', 'wedding', 'sport')),
  UNIQUE(perfume_id, occasion)
);

CREATE INDEX idx_perfume_occasions_perfume ON perfume_occasions(perfume_id);
CREATE INDEX idx_perfume_occasions_occasion ON perfume_occasions(occasion);

-- ============================================================================
-- 7. PERFUME_TIME_OF_DAY — Day/Night suitability
-- ============================================================================
CREATE TABLE IF NOT EXISTS perfume_time_of_day (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  perfume_id UUID NOT NULL REFERENCES perfumes(id) ON DELETE CASCADE,
  time_of_day VARCHAR(10) NOT NULL CHECK (time_of_day IN ('day', 'night', 'both')),
  UNIQUE(perfume_id, time_of_day)
);

CREATE INDEX idx_perfume_time_perfume ON perfume_time_of_day(perfume_id);

-- ============================================================================
-- 8. USER_PREFERENCES — Stores each preference quiz submission
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id VARCHAR(100), -- for anonymous users
  budget_min NUMERIC(10, 2),
  budget_max NUMERIC(10, 2),
  gender_preference VARCHAR(20) CHECK (gender_preference IN ('male', 'female', 'unisex', 'any')),
  preferred_seasons TEXT[], -- array of seasons
  preferred_occasions TEXT[], -- array of occasions
  preferred_time_of_day VARCHAR(10) CHECK (preferred_time_of_day IN ('day', 'night', 'both', 'any')),
  preferred_fragrance_families TEXT[], -- array of families
  preferred_notes TEXT[], -- array of note names
  preferred_intensity VARCHAR(20) CHECK (preferred_intensity IN ('light', 'moderate', 'strong', 'intense', 'any')),
  natural_language_input TEXT, -- free-form description
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_prefs_user ON user_preferences(user_id);
CREATE INDEX idx_user_prefs_session ON user_preferences(session_id);
CREATE INDEX idx_user_prefs_created ON user_preferences(created_at);

-- ============================================================================
-- 9. RECOMMENDATIONS — Generated recommendations per preference submission
-- ============================================================================
CREATE TABLE IF NOT EXISTS recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  preference_id UUID NOT NULL REFERENCES user_preferences(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  perfume_id UUID NOT NULL REFERENCES perfumes(id) ON DELETE CASCADE,
  rank_position INTEGER NOT NULL,
  final_score NUMERIC(5, 2) NOT NULL,
  fragrance_score NUMERIC(5, 2) DEFAULT 0,
  occasion_score NUMERIC(5, 2) DEFAULT 0,
  season_score NUMERIC(5, 2) DEFAULT 0,
  budget_score NUMERIC(5, 2) DEFAULT 0,
  time_score NUMERIC(5, 2) DEFAULT 0,
  intensity_score NUMERIC(5, 2) DEFAULT 0,
  gender_score NUMERIC(5, 2) DEFAULT 0,
  notes_score NUMERIC(5, 2) DEFAULT 0,
  matched_preferences JSONB, -- detailed match info
  unmatched_preferences JSONB,
  reason_text TEXT, -- human-readable reason
  ai_explanation TEXT, -- LLM-generated explanation
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_recommendations_pref ON recommendations(preference_id);
CREATE INDEX idx_recommendations_user ON recommendations(user_id);
CREATE INDEX idx_recommendations_perfume ON recommendations(perfume_id);
CREATE INDEX idx_recommendations_score ON recommendations(final_score DESC);
CREATE INDEX idx_recommendations_created ON recommendations(created_at);

-- ============================================================================
-- 10. INTERACTIONS — Tracks user events for analytics
-- ============================================================================
CREATE TABLE IF NOT EXISTS interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id VARCHAR(100),
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
    'preference_submitted',
    'recommendation_generated',
    'recommendation_viewed',
    'perfume_clicked',
    'perfume_viewed',
    'perfume_saved',
    'add_to_cart',
    'purchase',
    'feedback_submitted',
    'search_performed',
    'filter_applied'
  )),
  perfume_id UUID REFERENCES perfumes(id) ON DELETE SET NULL,
  recommendation_id UUID REFERENCES recommendations(id) ON DELETE SET NULL,
  preference_id UUID REFERENCES user_preferences(id) ON DELETE SET NULL,
  metadata JSONB, -- flexible extra data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_interactions_user ON interactions(user_id);
CREATE INDEX idx_interactions_session ON interactions(session_id);
CREATE INDEX idx_interactions_event ON interactions(event_type);
CREATE INDEX idx_interactions_perfume ON interactions(perfume_id);
CREATE INDEX idx_interactions_created ON interactions(created_at);
CREATE INDEX idx_interactions_event_created ON interactions(event_type, created_at);

-- ============================================================================
-- 11. REVIEWS — User reviews on perfumes
-- ============================================================================
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  perfume_id UUID NOT NULL REFERENCES perfumes(id) ON DELETE CASCADE,
  rating NUMERIC(3, 2) NOT NULL CHECK (rating >= 0 AND rating <= 5),
  review_text TEXT,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_reviews_user ON reviews(user_id);
CREATE INDEX idx_reviews_perfume ON reviews(perfume_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);

-- ============================================================================
-- 12. AI_EXPLANATIONS_CACHE — Cache LLM responses to reduce API calls
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_explanations_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cache_key VARCHAR(500) UNIQUE NOT NULL, -- hashed input
  input_text TEXT NOT NULL,
  explanation TEXT NOT NULL,
  model_used VARCHAR(100),
  tokens_used INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '30 days'
);

CREATE INDEX idx_ai_cache_key ON ai_explanations_cache(cache_key);
CREATE INDEX idx_ai_cache_expires ON ai_explanations_cache(expires_at);

-- ============================================================================
-- Updated_at trigger function
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_perfumes_updated_at
  BEFORE UPDATE ON perfumes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
