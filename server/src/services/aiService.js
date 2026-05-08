/**
 * ScentWise — AI Explanation Service (Gemini API)
 * =================================================
 * 
 * This service uses the Gemini API to generate human-friendly explanations
 * of fragrance notes, perfume characteristics, and recommendation reasons.
 * 
 * IMPORTANT DESIGN PRINCIPLES:
 * 1. The LLM does NOT determine rankings or scores
 * 2. The LLM is grounded in structured data from the database
 * 3. The LLM only explains / translates technical terms into natural language
 * 4. If the API is unavailable, deterministic fallback descriptions are used
 * 5. Responses are cached in the database to reduce API calls
 * 
 * Error handling covers: API errors, rate limits, timeouts, missing API key,
 * invalid responses.
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config');
const logger = require('../utils/logger');
const db = require('../config/database');
const crypto = require('crypto');

class AIExplanationService {
  constructor() {
    this.apiKey = config.gemini.apiKey;
    this.isAvailable = !!this.apiKey;
    this.client = null;
    this.model = null;
    this.requestCount = 0;
    this.lastResetTime = Date.now();
    this.rateLimitRPM = config.gemini.rateLimitRPM;
    this.timeoutMs = config.gemini.timeoutMs;

    if (this.isAvailable) {
      try {
        this.client = new GoogleGenerativeAI(this.apiKey);
        this.model = this.client.getGenerativeModel({ model: 'gemini-2.0-flash' });
        logger.info('✅ Gemini AI service initialized');
      } catch (err) {
        logger.warn('⚠️ Failed to initialize Gemini:', err.message);
        this.isAvailable = false;
      }
    } else {
      logger.warn('⚠️ Gemini API key not configured — using fallback descriptions');
    }
  }

  /**
   * Generate a cache key from input text.
   */
  getCacheKey(input) {
    return crypto.createHash('sha256').update(input).digest('hex');
  }

  /**
   * Check and retrieve cached explanation.
   */
  async getCached(cacheKey) {
    try {
      const { rows } = await db.query(
        `SELECT explanation FROM ai_explanations_cache 
         WHERE cache_key = $1 AND expires_at > NOW()`,
        [cacheKey]
      );
      return rows.length > 0 ? rows[0].explanation : null;
    } catch (err) {
      logger.debug('Cache lookup failed:', err.message);
      return null;
    }
  }

  /**
   * Store explanation in cache.
   */
  async setCache(cacheKey, inputText, explanation) {
    try {
      await db.query(
        `INSERT INTO ai_explanations_cache (cache_key, input_text, explanation, model_used)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (cache_key) DO UPDATE SET explanation = $3, created_at = NOW()`,
        [cacheKey, inputText, explanation, 'gemini-2.0-flash']
      );
    } catch (err) {
      logger.debug('Cache write failed:', err.message);
    }
  }

  /**
   * Check rate limiting.
   */
  checkRateLimit() {
    const now = Date.now();
    if (now - this.lastResetTime > 60000) {
      this.requestCount = 0;
      this.lastResetTime = now;
    }

    if (this.requestCount >= this.rateLimitRPM) {
      return false;
    }

    this.requestCount++;
    return true;
  }

  /**
   * Call Gemini API with timeout and error handling.
   */
  async callGemini(prompt) {
    if (!this.isAvailable || !this.model) {
      return null;
    }

    if (!this.checkRateLimit()) {
      logger.warn('Gemini rate limit reached, using fallback');
      return null;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

      const result = await this.model.generateContent(prompt);
      clearTimeout(timeout);

      const response = result.response;
      const text = response.text();

      if (!text || text.trim().length === 0) {
        logger.warn('Gemini returned empty response');
        return null;
      }

      return text.trim();
    } catch (err) {
      if (err.name === 'AbortError') {
        logger.warn('Gemini request timed out');
      } else if (err.message?.includes('429') || err.message?.includes('RESOURCE_EXHAUSTED')) {
        logger.warn('Gemini rate limit exceeded');
      } else {
        logger.error('Gemini API error:', err.message);
      }
      return null;
    }
  }

  // ============================================================================
  // PUBLIC METHODS
  // ============================================================================

  /**
   * Explain a fragrance note in simple human language.
   * Example: "Vetiver" → "A clean, earthy and slightly grassy scent..."
   */
  async explainNote(noteName) {
    const cacheKey = this.getCacheKey(`note:${noteName}`);
    const cached = await this.getCached(cacheKey);
    if (cached) return cached;

    const prompt = `You are a fragrance expert. Explain the fragrance note "${noteName}" in 1-2 simple sentences that a non-expert would understand. Describe what it smells like using everyday comparisons. Do not mention chemical compounds. Do not invent facts. Keep it under 40 words.`;

    const aiResponse = await this.callGemini(prompt);
    const explanation = aiResponse || this.getFallbackNoteExplanation(noteName);

    await this.setCache(cacheKey, noteName, explanation);
    return explanation;
  }

  /**
   * Generate a "What this perfume feels like" description.
   * GROUNDED in structured perfume data — does not invent specs.
   */
  async describePerfumeExperience(perfume) {
    const cacheKey = this.getCacheKey(`perfume-exp:${perfume.id}`);
    const cached = await this.getCached(cacheKey);
    if (cached) return cached;

    const notesList = [
      ...(perfume.top_notes || []),
      ...(perfume.middle_notes || []),
      ...(perfume.base_notes || [])
    ].join(', ');

    const prompt = `You are a fragrance expert writing for consumers. Based ONLY on the following structured data, describe what wearing this perfume feels like in 2-3 sentences.

Perfume: ${perfume.brand} ${perfume.perfume_name}
Fragrance Family: ${perfume.fragrance_family}
Notes: ${notesList}
Intensity: ${perfume.intensity}
Suitable for: ${(perfume.seasons || []).join(', ')} / ${(perfume.occasions || []).join(', ')}

Rules:
- Only describe the sensory experience based on the given notes and family
- Do NOT invent prices, ratings, availability, or ingredients not listed
- Do NOT say "I" or "this perfume is perfect"
- Keep it under 60 words
- Write in a warm, descriptive tone`;

    const aiResponse = await this.callGemini(prompt);
    const explanation = aiResponse || this.getFallbackPerfumeDescription(perfume);

    await this.setCache(cacheKey, perfume.id, explanation);
    return explanation;
  }

  /**
   * Explain why a perfume was recommended in user-friendly language.
   * Takes the deterministic recommendation data and generates a natural explanation.
   */
  async explainRecommendation(perfume, matchedPreferences, score) {
    const cacheKey = this.getCacheKey(`rec-explain:${perfume.id}:${score}`);
    const cached = await this.getCached(cacheKey);
    if (cached) return cached;

    const matchList = matchedPreferences.join('; ');
    const prompt = `You are a helpful fragrance advisor. A user received a perfume recommendation. Based ONLY on the following match data, explain in 2-3 friendly sentences why this perfume was suggested.

Perfume: ${perfume.brand} ${perfume.perfume_name}
Score: ${Math.round(score)}/100
Match reasons: ${matchList}

Rules:
- Only reference the match reasons provided
- Do NOT invent features, prices, or comparisons
- Be warm and conversational
- Keep it under 50 words`;

    const aiResponse = await this.callGemini(prompt);
    const explanation = aiResponse || this.getFallbackRecommendationExplanation(perfume, matchedPreferences, score);

    await this.setCache(cacheKey, `${perfume.id}:${score}`, explanation);
    return explanation;
  }

  // ============================================================================
  // FALLBACK DESCRIPTIONS — Used when Gemini is unavailable
  // ============================================================================

  getFallbackNoteExplanation(noteName) {
    const fallbacks = {
      'bergamot': 'A bright, slightly bitter citrus scent similar to Earl Grey tea. Fresh and uplifting.',
      'vetiver': 'A clean, earthy and slightly grassy scent that can feel like fresh rain on wet soil.',
      'sandalwood': 'A warm, creamy woody scent that is smooth and slightly sweet.',
      'rose': 'The classic floral scent of fresh rose petals — romantic and elegant.',
      'jasmine': 'A rich, sweet floral scent that is intoxicating and sensual.',
      'vanilla': 'A warm, sweet and comforting scent like freshly baked desserts.',
      'oud': 'A deep, rich woody scent that is complex, slightly smoky and luxurious.',
      'musk': 'A soft, warm skin-like scent that feels clean and intimate.',
      'amber': 'A warm, resinous scent that feels cozy and golden.',
      'patchouli': 'An earthy, slightly sweet woody scent with a hippie-chic character.',
      'lavender': 'A calming, herbal-floral scent that feels clean and relaxing.',
      'cardamom': 'A warm, aromatic spice with a slightly sweet and fresh edge.',
      'saffron': 'A warm, slightly metallic spice that adds richness and depth.',
      'cedarwood': 'A dry, woody scent like a freshly sharpened pencil or a cedar chest.',
      'pepper': 'A sharp, warm spicy note that adds energy and edge.',
      'lemon': 'A bright, zesty citrus scent that feels clean and energizing.',
      'orange': 'A sweet, juicy citrus scent that feels warm and cheerful.',
      'iris': 'A powdery, elegant floral scent with a cool, sophisticated character.',
      'tonka bean': 'A warm, sweet scent similar to vanilla with hints of almond and caramel.',
      'incense': 'A smoky, spiritual scent that feels mysterious and meditative.',
    };

    return fallbacks[noteName.toLowerCase()] ||
      `${noteName.charAt(0).toUpperCase() + noteName.slice(1)} is a distinctive fragrance note that adds character and depth to a perfume composition.`;
  }

  getFallbackPerfumeDescription(perfume) {
    const familyDescriptions = {
      citrus: 'bright and energizing',
      floral: 'elegant and romantic',
      woody: 'warm and sophisticated',
      oriental: 'rich and mysterious',
      fresh: 'clean and invigorating',
      aquatic: 'cool and breezy',
      gourmand: 'warm and indulgent',
      aromatic: 'herbal and refined',
      chypre: 'classic and layered',
      fougere: 'clean and traditional',
      leather: 'bold and luxurious',
      musk: 'soft and intimate',
      green: 'natural and crisp',
      fruity: 'playful and vibrant',
      spicy: 'warm and captivating'
    };

    const feel = familyDescriptions[perfume.fragrance_family] || 'distinctive';
    return `A ${feel} fragrance from ${perfume.brand}. The ${perfume.intensity} intensity makes it suitable for ${(perfume.occasions || ['everyday']).slice(0, 2).join(' and ')} wear.`;
  }

  getFallbackRecommendationExplanation(perfume, matched, score) {
    const topReasons = matched.slice(0, 2).join(' and ');
    return `${perfume.brand} ${perfume.perfume_name} was recommended because it ${topReasons.toLowerCase()}. It scored ${Math.round(score)} out of 100 based on your preferences.`;
  }
}

// Singleton instance
let instance = null;

function getAIService() {
  if (!instance) {
    instance = new AIExplanationService();
  }
  return instance;
}

module.exports = { AIExplanationService, getAIService };
