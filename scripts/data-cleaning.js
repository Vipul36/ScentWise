/**
 * ScentWise — Data Cleaning Pipeline
 * ====================================
 * 
 * This script takes the raw synthetic dataset and applies a series of
 * data quality transformations to produce a clean, validated dataset.
 * 
 * Cleaning Rules Applied:
 * 1. Remove duplicate perfumes (by brand + name combination)
 * 2. Standardize capitalization (brand names, fragrance families)
 * 3. Validate and clamp ratings to [0, 5]
 * 4. Validate and fix prices (must be > 0)
 * 5. Handle missing/null values with sensible defaults
 * 6. Standardize fragrance family names (lowercase, trimmed)
 * 7. Standardize season and occasion names
 * 8. Normalize note arrays (lowercase, deduplicate, sort)
 * 9. Validate intensity/longevity/sillage enums
 * 10. Remove invalid records that cannot be fixed
 * 11. Validate email formats for users
 * 12. Check review rating consistency
 * 
 * Output:
 * - Cleaned dataset JSON
 * - Cleaning report with statistics
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// VALID ENUM VALUES
// ============================================================================

const VALID_GENDERS = ['male', 'female', 'unisex'];
const VALID_INTENSITIES = ['light', 'moderate', 'strong', 'intense'];
const VALID_LONGEVITIES = ['short', 'moderate', 'long', 'very_long'];
const VALID_SILLAGES = ['intimate', 'moderate', 'strong', 'enormous'];
const VALID_SEASONS = ['spring', 'summer', 'autumn', 'winter'];
const VALID_OCCASIONS = ['office', 'casual', 'formal', 'date_night', 'party', 'outdoor', 'wedding', 'sport'];
const VALID_TIMES = ['day', 'night', 'both'];

const FRAGRANCE_FAMILY_MAP = {
  'citrus': 'citrus', 'citrusy': 'citrus',
  'floral': 'floral', 'flower': 'floral', 'flowers': 'floral',
  'woody': 'woody', 'wood': 'woody', 'woods': 'woody',
  'oriental': 'oriental', 'eastern': 'oriental',
  'fresh': 'fresh', 'clean': 'fresh',
  'aquatic': 'aquatic', 'oceanic': 'aquatic', 'marine': 'aquatic', 'water': 'aquatic',
  'gourmand': 'gourmand', 'sweet': 'gourmand', 'edible': 'gourmand',
  'aromatic': 'aromatic', 'herbal': 'aromatic',
  'chypre': 'chypre', 'cypre': 'chypre',
  'fougere': 'fougere', 'fougère': 'fougere',
  'leather': 'leather', 'leathery': 'leather',
  'musk': 'musk', 'musky': 'musk',
  'green': 'green', 'grassy': 'green',
  'fruity': 'fruity', 'fruit': 'fruity',
  'spicy': 'spicy', 'spice': 'spicy'
};

// ============================================================================
// CLEANING FUNCTIONS
// ============================================================================

class DataCleaningReport {
  constructor() {
    this.stats = {
      perfumes: { total: 0, cleaned: 0, removed: 0, issues: [] },
      users: { total: 0, cleaned: 0, removed: 0, issues: [] },
      interactions: { total: 0, cleaned: 0, removed: 0, issues: [] },
      reviews: { total: 0, cleaned: 0, removed: 0, issues: [] },
      notes: { total: 0, cleaned: 0, issues: [] }
    };
    this.startTime = Date.now();
  }

  addIssue(category, issue) {
    this.stats[category].issues.push(issue);
  }

  getReport() {
    return {
      ...this.stats,
      duration_ms: Date.now() - this.startTime,
      timestamp: new Date().toISOString()
    };
  }
}

function standardizeString(str) {
  if (!str || typeof str !== 'string') return '';
  return str.trim().toLowerCase();
}

function titleCase(str) {
  if (!str) return '';
  return str.replace(/\w\S*/g, txt =>
    txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()
  );
}

function normalizeNoteArray(notes) {
  if (!Array.isArray(notes)) return [];
  return [...new Set(
    notes
      .map(n => standardizeString(n))
      .filter(n => n.length > 0)
  )].sort();
}

function cleanPerfumes(perfumes, report) {
  report.stats.perfumes.total = perfumes.length;
  const seen = new Map();
  const cleaned = [];

  for (const perfume of perfumes) {
    // 1. Check for required fields
    if (!perfume.brand || !perfume.perfume_name) {
      report.addIssue('perfumes', `Removed: missing brand or name (id: ${perfume.id})`);
      report.stats.perfumes.removed++;
      continue;
    }

    // 2. Standardize brand name
    perfume.brand = titleCase(perfume.brand.trim());

    // 3. Standardize perfume name
    perfume.perfume_name = perfume.perfume_name.trim();

    // 4. Check for duplicates
    const dedupeKey = `${perfume.brand.toLowerCase()}|${perfume.perfume_name.toLowerCase()}`;
    if (seen.has(dedupeKey)) {
      report.addIssue('perfumes', `Removed duplicate: ${perfume.brand} - ${perfume.perfume_name}`);
      report.stats.perfumes.removed++;
      continue;
    }
    seen.set(dedupeKey, true);

    // 5. Validate and fix gender
    perfume.gender = standardizeString(perfume.gender);
    if (!VALID_GENDERS.includes(perfume.gender)) {
      report.addIssue('perfumes', `Fixed gender: "${perfume.gender}" → "unisex" for ${perfume.perfume_name}`);
      perfume.gender = 'unisex';
    }

    // 6. Validate and fix price
    perfume.price = parseFloat(perfume.price);
    if (isNaN(perfume.price) || perfume.price <= 0) {
      report.addIssue('perfumes', `Removed: invalid price for ${perfume.perfume_name}`);
      report.stats.perfumes.removed++;
      continue;
    }
    perfume.price = Math.round(perfume.price * 100) / 100;

    // 7. Validate and clamp rating
    perfume.rating = parseFloat(perfume.rating);
    if (isNaN(perfume.rating)) {
      perfume.rating = null;
      report.addIssue('perfumes', `Set null rating for ${perfume.perfume_name}`);
    } else {
      if (perfume.rating < 0) {
        report.addIssue('perfumes', `Clamped negative rating for ${perfume.perfume_name}`);
        perfume.rating = 0;
      }
      if (perfume.rating > 5) {
        report.addIssue('perfumes', `Clamped rating >5 for ${perfume.perfume_name}`);
        perfume.rating = 5;
      }
      perfume.rating = Math.round(perfume.rating * 100) / 100;
    }

    // 8. Validate review count
    perfume.review_count = parseInt(perfume.review_count, 10);
    if (isNaN(perfume.review_count) || perfume.review_count < 0) {
      perfume.review_count = 0;
    }

    // 9. Standardize fragrance family
    const rawFamily = standardizeString(perfume.fragrance_family);
    perfume.fragrance_family = FRAGRANCE_FAMILY_MAP[rawFamily] || rawFamily;
    if (!Object.values(FRAGRANCE_FAMILY_MAP).includes(perfume.fragrance_family)) {
      report.addIssue('perfumes', `Unknown fragrance family: "${perfume.fragrance_family}" for ${perfume.perfume_name}, defaulting to "fresh"`);
      perfume.fragrance_family = 'fresh';
    }

    // 10. Validate enums
    perfume.intensity = standardizeString(perfume.intensity);
    if (!VALID_INTENSITIES.includes(perfume.intensity)) {
      perfume.intensity = 'moderate';
    }

    perfume.longevity = standardizeString(perfume.longevity);
    if (!VALID_LONGEVITIES.includes(perfume.longevity)) {
      perfume.longevity = 'moderate';
    }

    perfume.sillage = standardizeString(perfume.sillage);
    if (!VALID_SILLAGES.includes(perfume.sillage)) {
      perfume.sillage = 'moderate';
    }

    // 11. Normalize notes
    perfume.top_notes = normalizeNoteArray(perfume.top_notes);
    perfume.middle_notes = normalizeNoteArray(perfume.middle_notes);
    perfume.base_notes = normalizeNoteArray(perfume.base_notes);

    // 12. Normalize seasons
    perfume.seasons = (perfume.seasons || [])
      .map(s => standardizeString(s))
      .filter(s => VALID_SEASONS.includes(s));
    perfume.seasons = [...new Set(perfume.seasons)];
    if (perfume.seasons.length === 0) {
      perfume.seasons = ['spring', 'summer', 'autumn', 'winter'];
    }

    // 13. Normalize occasions
    perfume.occasions = (perfume.occasions || [])
      .map(o => standardizeString(o))
      .filter(o => VALID_OCCASIONS.includes(o));
    perfume.occasions = [...new Set(perfume.occasions)];
    if (perfume.occasions.length === 0) {
      perfume.occasions = ['casual'];
    }

    // 14. Normalize time_of_day
    perfume.time_of_day = standardizeString(perfume.time_of_day);
    if (!VALID_TIMES.includes(perfume.time_of_day)) {
      perfume.time_of_day = 'both';
    }

    report.stats.perfumes.cleaned++;
    cleaned.push(perfume);
  }

  return cleaned;
}

function cleanUsers(users, report) {
  report.stats.users.total = users.length;
  const seenEmails = new Set();
  const cleaned = [];

  for (const user of users) {
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!user.email || !emailRegex.test(user.email)) {
      report.addIssue('users', `Removed: invalid email for ${user.username}`);
      report.stats.users.removed++;
      continue;
    }

    // Deduplicate by email
    const normalizedEmail = user.email.toLowerCase().trim();
    if (seenEmails.has(normalizedEmail)) {
      report.addIssue('users', `Removed duplicate email: ${normalizedEmail}`);
      report.stats.users.removed++;
      continue;
    }
    seenEmails.add(normalizedEmail);

    user.email = normalizedEmail;
    user.username = user.username ? user.username.trim().toLowerCase() : normalizedEmail.split('@')[0];
    user.display_name = user.display_name ? user.display_name.trim() : user.username;

    if (user.gender_preference) {
      user.gender_preference = standardizeString(user.gender_preference);
      if (!['male', 'female', 'unisex', 'any'].includes(user.gender_preference)) {
        user.gender_preference = 'any';
      }
    }

    report.stats.users.cleaned++;
    cleaned.push(user);
  }

  return cleaned;
}

function cleanInteractions(interactions, validUserIds, validPerfumeIds, report) {
  report.stats.interactions.total = interactions.length;
  const cleaned = [];

  for (const interaction of interactions) {
    // Validate user
    if (interaction.user_id && !validUserIds.has(interaction.user_id)) {
      report.addIssue('interactions', `Removed: invalid user_id ${interaction.user_id}`);
      report.stats.interactions.removed++;
      continue;
    }

    // Validate perfume if present
    if (interaction.perfume_id && !validPerfumeIds.has(interaction.perfume_id)) {
      interaction.perfume_id = null;
    }

    // Validate event_type
    const validEvents = [
      'preference_submitted', 'recommendation_generated', 'recommendation_viewed',
      'perfume_clicked', 'perfume_viewed', 'perfume_saved', 'add_to_cart',
      'purchase', 'feedback_submitted', 'search_performed', 'filter_applied'
    ];
    if (!validEvents.includes(interaction.event_type)) {
      report.stats.interactions.removed++;
      continue;
    }

    report.stats.interactions.cleaned++;
    cleaned.push(interaction);
  }

  return cleaned;
}

function cleanReviews(reviews, validUserIds, validPerfumeIds, report) {
  report.stats.reviews.total = reviews.length;
  const cleaned = [];

  for (const review of reviews) {
    if (!review.perfume_id || !validPerfumeIds.has(review.perfume_id)) {
      report.stats.reviews.removed++;
      continue;
    }

    if (review.user_id && !validUserIds.has(review.user_id)) {
      review.user_id = null;
    }

    // Validate rating
    review.rating = parseFloat(review.rating);
    if (isNaN(review.rating) || review.rating < 0 || review.rating > 5) {
      report.stats.reviews.removed++;
      continue;
    }
    review.rating = Math.round(review.rating * 100) / 100;

    review.helpful_count = Math.max(0, parseInt(review.helpful_count, 10) || 0);

    report.stats.reviews.cleaned++;
    cleaned.push(review);
  }

  return cleaned;
}

function extractUniqueNotes(perfumes) {
  const noteSet = new Map();

  const noteCategories = {
    citrus: ['bergamot', 'lemon', 'lime', 'orange', 'grapefruit', 'mandarin', 'yuzu', 'neroli', 'petitgrain', 'citron'],
    floral: ['rose', 'jasmine', 'lily', 'tuberose', 'iris', 'violet', 'peony', 'gardenia', 'magnolia', 'ylang-ylang', 'lotus', 'cherry blossom', 'orange blossom', 'frangipani', 'lavender', 'geranium'],
    woody: ['sandalwood', 'cedarwood', 'oud', 'vetiver', 'patchouli', 'guaiacwood', 'birch', 'teak', 'ebony', 'driftwood', 'rosewood'],
    spicy: ['cardamom', 'cinnamon', 'pepper', 'saffron', 'clove', 'ginger', 'nutmeg', 'pink pepper', 'star anise', 'cumin'],
    sweet: ['vanilla', 'caramel', 'honey', 'tonka bean', 'praline', 'chocolate', 'brown sugar', 'maple', 'marshmallow'],
    fresh: ['mint', 'eucalyptus', 'sea salt', 'cucumber', 'green tea', 'bamboo', 'aloe vera', 'water lily'],
    fruity: ['apple', 'peach', 'raspberry', 'blackcurrant', 'fig', 'coconut', 'pineapple', 'mango', 'pear', 'plum', 'lychee', 'pomegranate', 'watermelon'],
    earthy: ['moss', 'amber', 'musk', 'incense', 'myrrh', 'benzoin', 'labdanum', 'tobacco', 'suede', 'leather'],
    herbal: ['basil', 'rosemary', 'thyme', 'sage', 'chamomile', 'artemisia', 'tarragon']
  };

  // Reverse lookup
  const noteToCat = {};
  for (const [cat, notes] of Object.entries(noteCategories)) {
    for (const note of notes) {
      noteToCat[note] = cat;
    }
  }

  for (const p of perfumes) {
    for (const note of [...p.top_notes, ...p.middle_notes, ...p.base_notes]) {
      if (!noteSet.has(note)) {
        noteSet.set(note, noteToCat[note] || 'other');
      }
    }
  }

  return [...noteSet.entries()].map(([name, category]) => ({
    note_name: name,
    category
  }));
}

// ============================================================================
// MAIN
// ============================================================================

function runCleaning() {
  console.log('🧹 ScentWise Data Cleaning Pipeline');
  console.log('====================================\n');

  // Load raw data
  const rawPath = path.resolve(__dirname, '../data/raw/seed_dataset.json');
  if (!fs.existsSync(rawPath)) {
    console.error('❌ Raw dataset not found. Run `npm run seed:generate` first.');
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(rawPath, 'utf-8'));
  console.log(`📂 Loaded raw dataset:`);
  console.log(`   Perfumes:     ${raw.perfumes.length}`);
  console.log(`   Users:        ${raw.users.length}`);
  console.log(`   Interactions: ${raw.interactions.length}`);
  console.log(`   Reviews:      ${raw.reviews.length}\n`);

  const report = new DataCleaningReport();

  // Clean each entity
  console.log('⏳ Cleaning perfumes...');
  const cleanedPerfumes = cleanPerfumes(raw.perfumes, report);

  console.log('⏳ Cleaning users...');
  const cleanedUsers = cleanUsers(raw.users, report);

  const validUserIds = new Set(cleanedUsers.map(u => u.id));
  const validPerfumeIds = new Set(cleanedPerfumes.map(p => p.id));

  console.log('⏳ Cleaning interactions...');
  const cleanedInteractions = cleanInteractions(raw.interactions, validUserIds, validPerfumeIds, report);

  console.log('⏳ Cleaning reviews...');
  const cleanedReviews = cleanReviews(raw.reviews, validUserIds, validPerfumeIds, report);

  console.log('⏳ Extracting unique fragrance notes...');
  const uniqueNotes = extractUniqueNotes(cleanedPerfumes);
  report.stats.notes.total = uniqueNotes.length;
  report.stats.notes.cleaned = uniqueNotes.length;

  // Build cleaned dataset
  const cleanedDataset = {
    _meta: {
      ...raw._meta,
      cleaned_at: new Date().toISOString(),
      cleaning_pipeline_version: '1.0.0',
      counts: {
        perfumes: cleanedPerfumes.length,
        notes: uniqueNotes.length,
        users: cleanedUsers.length,
        interactions: cleanedInteractions.length,
        reviews: cleanedReviews.length
      }
    },
    perfumes: cleanedPerfumes,
    fragrance_notes: uniqueNotes,
    users: cleanedUsers,
    interactions: cleanedInteractions,
    reviews: cleanedReviews
  };

  // Write outputs
  const cleanedDir = path.resolve(__dirname, '../data/cleaned');
  if (!fs.existsSync(cleanedDir)) {
    fs.mkdirSync(cleanedDir, { recursive: true });
  }

  const cleanedPath = path.join(cleanedDir, 'cleaned_dataset.json');
  fs.writeFileSync(cleanedPath, JSON.stringify(cleanedDataset, null, 2));

  const validationDir = path.resolve(__dirname, '../data/validation');
  if (!fs.existsSync(validationDir)) {
    fs.mkdirSync(validationDir, { recursive: true });
  }

  const reportPath = path.join(validationDir, 'cleaning_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report.getReport(), null, 2));

  // Print summary
  const r = report.stats;
  console.log('\n✅ Cleaning Complete!\n');
  console.log('📊 Summary:');
  console.log(`   Perfumes:     ${r.perfumes.total} → ${r.perfumes.cleaned} (${r.perfumes.removed} removed)`);
  console.log(`   Users:        ${r.users.total} → ${r.users.cleaned} (${r.users.removed} removed)`);
  console.log(`   Interactions: ${r.interactions.total} → ${r.interactions.cleaned} (${r.interactions.removed} removed)`);
  console.log(`   Reviews:      ${r.reviews.total} → ${r.reviews.cleaned} (${r.reviews.removed} removed)`);
  console.log(`   Notes:        ${r.notes.total} unique notes extracted`);
  console.log(`\n📁 Cleaned data: ${cleanedPath}`);
  console.log(`📋 Report:       ${reportPath}`);

  return cleanedDataset;
}

// Run if executed directly
if (require.main === module) {
  runCleaning();
}

module.exports = { runCleaning };
