/**
 * ScentWise — Synthetic Perfume Dataset Generator
 * ================================================
 * 
 * This script generates a realistic synthetic perfume dataset.
 * 
 * IMPORTANT: This is clearly labeled SYNTHETIC / SEED data.
 * No real product data was scraped or copied from any website.
 * Brand names used are real brand names for realism, but all 
 * product names, prices, ratings, and other attributes are
 * fictional and generated programmatically.
 * 
 * The generator uses realistic distributions for:
 * - Price ranges per brand tier
 * - Rating distributions (skewed towards 3.5-4.5)
 * - Fragrance family distributions
 * - Seasonal and occasion suitability based on fragrance family
 * - Note combinations that make olfactory sense
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// ============================================================================
// REFERENCE DATA
// ============================================================================

const BRANDS = {
  luxury: [
    'Chanel', 'Dior', 'Tom Ford', 'Creed', 'Maison Margiela',
    'Byredo', 'Le Labo', 'Acqua di Parma', 'Amouage', 'Penhaligon\'s',
    'Diptyque', 'Frederic Malle', 'Xerjoff', 'Parfums de Marly',
    'Tiziana Terenzi', 'Roja Parfums'
  ],
  premium: [
    'Versace', 'Dolce & Gabbana', 'Prada', 'Gucci', 'Yves Saint Laurent',
    'Giorgio Armani', 'Burberry', 'Calvin Klein', 'Hugo Boss', 'Ralph Lauren',
    'Givenchy', 'Hermès', 'Valentino', 'Carolina Herrera', 'Bvlgari',
    'Issey Miyake', 'Jean Paul Gaultier', 'Montblanc'
  ],
  affordable: [
    'Zara', 'Ajmal', 'Rasasi', 'Al Rehab', 'Lattafa',
    'Armaf', 'Paris Corner', 'Nautica', 'David Beckham', 'Jaguar',
    'Davidoff', 'Guess', 'United Colors of Benetton', 'Wild Stone',
    'Park Avenue', 'Denver', 'Fogg', 'Titan Skinn', 'Bella Vita Luxury'
  ]
};

const PRICE_RANGES = {
  luxury: { min: 8000, max: 35000 },
  premium: { min: 3000, max: 12000 },
  affordable: { min: 500, max: 4000 }
};

const GENDERS = ['male', 'female', 'unisex'];

const FRAGRANCE_FAMILIES = [
  'citrus', 'floral', 'woody', 'oriental', 'fresh',
  'aquatic', 'gourmand', 'aromatic', 'chypre', 'fougere',
  'leather', 'musk', 'green', 'fruity', 'spicy'
];

const SEASONS = ['spring', 'summer', 'autumn', 'winter'];
const OCCASIONS = ['office', 'casual', 'formal', 'date_night', 'party', 'outdoor', 'wedding', 'sport'];
const INTENSITIES = ['light', 'moderate', 'strong', 'intense'];
const LONGEVITIES = ['short', 'moderate', 'long', 'very_long'];
const SILLAGES = ['intimate', 'moderate', 'strong', 'enormous'];
const TIMES = ['day', 'night', 'both'];

// Fragrance notes organized by category
const NOTES = {
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

// Which note categories are typical for each fragrance family
const FAMILY_NOTE_AFFINITY = {
  citrus:    { top: ['citrus', 'herbal'], middle: ['floral', 'fresh'], base: ['woody', 'earthy'] },
  floral:    { top: ['citrus', 'fruity'], middle: ['floral'], base: ['woody', 'earthy', 'sweet'] },
  woody:     { top: ['citrus', 'spicy'], middle: ['floral', 'spicy'], base: ['woody', 'earthy'] },
  oriental:  { top: ['spicy', 'citrus'], middle: ['floral', 'spicy'], base: ['sweet', 'earthy', 'woody'] },
  fresh:     { top: ['citrus', 'fresh', 'herbal'], middle: ['floral', 'fresh'], base: ['woody', 'earthy'] },
  aquatic:   { top: ['citrus', 'fresh'], middle: ['fresh', 'floral'], base: ['woody', 'earthy'] },
  gourmand:  { top: ['fruity', 'citrus'], middle: ['sweet', 'floral'], base: ['sweet', 'earthy'] },
  aromatic:  { top: ['herbal', 'citrus'], middle: ['herbal', 'floral'], base: ['woody', 'earthy'] },
  chypre:    { top: ['citrus', 'fruity'], middle: ['floral'], base: ['woody', 'earthy'] },
  fougere:   { top: ['herbal', 'citrus'], middle: ['floral', 'herbal'], base: ['woody', 'earthy'] },
  leather:   { top: ['spicy', 'citrus'], middle: ['floral', 'spicy'], base: ['earthy', 'woody'] },
  musk:      { top: ['citrus', 'fresh'], middle: ['floral'], base: ['earthy', 'sweet'] },
  green:     { top: ['herbal', 'citrus', 'fresh'], middle: ['floral', 'herbal'], base: ['woody', 'earthy'] },
  fruity:    { top: ['fruity', 'citrus'], middle: ['floral', 'fruity'], base: ['sweet', 'woody'] },
  spicy:     { top: ['spicy', 'citrus'], middle: ['spicy', 'floral'], base: ['woody', 'earthy', 'sweet'] }
};

// Season suitability by fragrance family
const FAMILY_SEASON_AFFINITY = {
  citrus:    ['spring', 'summer'],
  floral:    ['spring', 'summer'],
  woody:     ['autumn', 'winter'],
  oriental:  ['autumn', 'winter'],
  fresh:     ['spring', 'summer'],
  aquatic:   ['spring', 'summer'],
  gourmand:  ['autumn', 'winter'],
  aromatic:  ['spring', 'summer', 'autumn'],
  chypre:    ['spring', 'autumn'],
  fougere:   ['spring', 'summer'],
  leather:   ['autumn', 'winter'],
  musk:      ['spring', 'autumn', 'winter'],
  green:     ['spring', 'summer'],
  fruity:    ['spring', 'summer'],
  spicy:     ['autumn', 'winter']
};

const FAMILY_OCCASION_AFFINITY = {
  citrus:    ['office', 'casual', 'sport', 'outdoor'],
  floral:    ['office', 'casual', 'date_night', 'wedding'],
  woody:     ['office', 'formal', 'date_night'],
  oriental:  ['formal', 'date_night', 'party', 'wedding'],
  fresh:     ['office', 'casual', 'sport', 'outdoor'],
  aquatic:   ['casual', 'sport', 'outdoor'],
  gourmand:  ['casual', 'date_night', 'party'],
  aromatic:  ['office', 'casual', 'outdoor'],
  chypre:    ['office', 'formal', 'date_night'],
  fougere:   ['office', 'casual'],
  leather:   ['formal', 'date_night', 'party'],
  musk:      ['casual', 'date_night'],
  green:     ['office', 'casual', 'outdoor'],
  fruity:    ['casual', 'party', 'outdoor'],
  spicy:     ['formal', 'date_night', 'party', 'wedding']
};

const FAMILY_TIME_AFFINITY = {
  citrus: 'day', floral: 'both', woody: 'both', oriental: 'night',
  fresh: 'day', aquatic: 'day', gourmand: 'night', aromatic: 'day',
  chypre: 'both', fougere: 'day', leather: 'night', musk: 'night',
  green: 'day', fruity: 'day', spicy: 'night'
};

// Perfume name parts for generating realistic names
const NAME_PREFIXES = [
  'Noir', 'Blanc', 'Royal', 'Velvet', 'Crystal', 'Golden', 'Silver',
  'Dark', 'Pure', 'Mystic', 'Eternal', 'Wild', 'Secret', 'Divine',
  'Midnight', 'Sunset', 'Dawn', 'Twilight', 'Azure', 'Crimson',
  'Emerald', 'Amber', 'Ivory', 'Obsidian', 'Sapphire', 'Coral'
];

const NAME_SUFFIXES = [
  'Elixir', 'Essence', 'Oud', 'Intense', 'Absolue', 'Parfum',
  'Mist', 'Dream', 'Bloom', 'Wave', 'Storm', 'Legend', 'Heritage',
  'Spirit', 'Soul', 'Aura', 'Voyage', 'Journey', 'Desire', 'Passion',
  'Charm', 'Grace', 'Enigma', 'Whisper', 'Echo', 'Reverie'
];

const NAME_MIDDLE = [
  'de', 'pour', 'en', 'du', 'la', 'le', 'des', 'et', 'of', 'in', ''
];

const SINGLE_NAMES = [
  'Aventus', 'Sauvage', 'Ombre', 'Santal', 'Cedrat', 'Vetiver',
  'Neroli', 'Bergamote', 'Tubereuse', 'Iris', 'Jasmin', 'Ambre',
  'Cuir', 'Bois', 'Fleur', 'Rose', 'Musc', 'Agar', 'Tonka',
  'Patchouli', 'Vanille', 'Cannelle', 'Cardamome', 'Pivoine',
  'Magnolia', 'Orchidee', 'Gardenia', 'Freesia', 'Lotus'
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max, decimals = 2) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomChoices(arr, min, max) {
  const count = randomInt(min, max);
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, arr.length));
}

function weightedChoice(options, weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let rand = Math.random() * total;
  for (let i = 0; i < options.length; i++) {
    rand -= weights[i];
    if (rand <= 0) return options[i];
  }
  return options[options.length - 1];
}

function generatePerfumeName() {
  const style = randomInt(1, 5);
  switch (style) {
    case 1: return `${randomChoice(NAME_PREFIXES)} ${randomChoice(NAME_SUFFIXES)}`;
    case 2: return randomChoice(SINGLE_NAMES);
    case 3: return `${randomChoice(SINGLE_NAMES)} ${randomChoice(NAME_SUFFIXES)}`;
    case 4: {
      const mid = randomChoice(NAME_MIDDLE);
      return mid
        ? `${randomChoice(NAME_PREFIXES)} ${mid} ${randomChoice(SINGLE_NAMES)}`
        : `${randomChoice(NAME_PREFIXES)} ${randomChoice(SINGLE_NAMES)}`;
    }
    case 5: return `${randomChoice(SINGLE_NAMES)} No. ${randomInt(1, 33)}`;
    default: return `${randomChoice(NAME_PREFIXES)} ${randomChoice(NAME_SUFFIXES)}`;
  }
}

function generateRating() {
  // Realistic: most perfumes rated 3.0-4.5, few below 2.5 or at 5.0
  const distribution = weightedChoice(
    ['low', 'medium', 'high', 'top'],
    [5, 25, 55, 15]
  );
  switch (distribution) {
    case 'low': return randomFloat(2.0, 3.0);
    case 'medium': return randomFloat(3.0, 3.7);
    case 'high': return randomFloat(3.7, 4.5);
    case 'top': return randomFloat(4.5, 5.0);
    default: return randomFloat(3.5, 4.2);
  }
}

function generateReviewCount(brandTier) {
  const base = { luxury: [50, 2000], premium: [100, 5000], affordable: [20, 3000] };
  const [min, max] = base[brandTier];
  // Log-normal-ish distribution (most have low reviews, few have many)
  const raw = Math.exp(randomFloat(Math.log(min), Math.log(max)));
  return Math.round(raw);
}

function getNotesForFamily(family, layer) {
  const affinities = FAMILY_NOTE_AFFINITY[family];
  if (!affinities) return [];
  const categories = affinities[layer] || ['citrus'];
  const allNotes = categories.flatMap(cat => NOTES[cat] || []);
  const count = layer === 'top' ? randomInt(2, 4)
    : layer === 'middle' ? randomInt(2, 3)
    : randomInt(1, 3);
  return randomChoices([...new Set(allNotes)], count, count);
}

function getSeasonsForFamily(family) {
  const primary = FAMILY_SEASON_AFFINITY[family] || ['spring', 'summer'];
  // Sometimes add extra seasons
  if (Math.random() > 0.6) {
    const extras = SEASONS.filter(s => !primary.includes(s));
    if (extras.length > 0) {
      return [...primary, randomChoice(extras)];
    }
  }
  return [...primary];
}

function getOccasionsForFamily(family) {
  const primary = FAMILY_OCCASION_AFFINITY[family] || ['casual'];
  // Sometimes add extra occasions
  if (Math.random() > 0.5) {
    const extras = OCCASIONS.filter(o => !primary.includes(o));
    if (extras.length > 0) {
      return [...primary, ...randomChoices(extras, 1, 2)];
    }
  }
  return [...primary];
}

function getTimeForFamily(family) {
  const primary = FAMILY_TIME_AFFINITY[family] || 'both';
  // 70% follow affinity, 30% are "both"
  return Math.random() > 0.3 ? primary : 'both';
}

function getIntensityForFamily(family) {
  const intensityMap = {
    citrus: ['light', 'moderate'],
    floral: ['light', 'moderate'],
    woody: ['moderate', 'strong'],
    oriental: ['strong', 'intense'],
    fresh: ['light', 'moderate'],
    aquatic: ['light', 'moderate'],
    gourmand: ['moderate', 'strong'],
    aromatic: ['light', 'moderate'],
    chypre: ['moderate', 'strong'],
    fougere: ['moderate'],
    leather: ['strong', 'intense'],
    musk: ['moderate', 'strong'],
    green: ['light', 'moderate'],
    fruity: ['light', 'moderate'],
    spicy: ['moderate', 'strong', 'intense']
  };
  return randomChoice(intensityMap[family] || ['moderate']);
}

function getLongevityForIntensity(intensity) {
  const map = {
    light: ['short', 'moderate'],
    moderate: ['moderate', 'long'],
    strong: ['long', 'very_long'],
    intense: ['long', 'very_long']
  };
  return randomChoice(map[intensity] || ['moderate']);
}

function getSillageForIntensity(intensity) {
  const map = {
    light: ['intimate', 'moderate'],
    moderate: ['moderate', 'strong'],
    strong: ['strong', 'enormous'],
    intense: ['strong', 'enormous']
  };
  return randomChoice(map[intensity] || ['moderate']);
}

// ============================================================================
// GENERATE DATASET
// ============================================================================

function generatePerfumes(count = 800) {
  const perfumes = [];
  const allNotes = new Set();
  const usedNames = new Set();

  // Distribution: 20% luxury, 40% premium, 40% affordable
  const tierDistribution = { luxury: 0.20, premium: 0.40, affordable: 0.40 };

  for (let i = 0; i < count; i++) {
    const tier = weightedChoice(
      ['luxury', 'premium', 'affordable'],
      [tierDistribution.luxury, tierDistribution.premium, tierDistribution.affordable]
    );

    const brand = randomChoice(BRANDS[tier]);

    // Generate unique name
    let name;
    let attempts = 0;
    do {
      name = generatePerfumeName();
      attempts++;
    } while (usedNames.has(`${brand}-${name}`) && attempts < 50);
    usedNames.add(`${brand}-${name}`);

    const gender = weightedChoice(GENDERS, [35, 30, 35]);
    const fragranceFamily = weightedChoice(
      FRAGRANCE_FAMILIES,
      [12, 15, 14, 10, 10, 8, 5, 8, 3, 4, 2, 3, 3, 5, 3]
    );

    const { min: priceMin, max: priceMax } = PRICE_RANGES[tier];
    const price = randomFloat(priceMin, priceMax, 0);

    const rating = generateRating();
    const reviewCount = generateReviewCount(tier);

    const intensity = getIntensityForFamily(fragranceFamily);
    const longevity = getLongevityForIntensity(intensity);
    const sillage = getSillageForIntensity(intensity);

    const topNotes = getNotesForFamily(fragranceFamily, 'top');
    const middleNotes = getNotesForFamily(fragranceFamily, 'middle');
    const baseNotes = getNotesForFamily(fragranceFamily, 'base');

    [...topNotes, ...middleNotes, ...baseNotes].forEach(n => allNotes.add(n));

    const seasons = getSeasonsForFamily(fragranceFamily);
    const occasions = getOccasionsForFamily(fragranceFamily);
    const timeOfDay = getTimeForFamily(fragranceFamily);

    const id = uuidv4();

    perfumes.push({
      id,
      brand,
      perfume_name: name,
      gender,
      price: parseFloat(price),
      rating: parseFloat(rating),
      review_count: reviewCount,
      fragrance_family: fragranceFamily,
      intensity,
      longevity,
      sillage,
      top_notes: topNotes,
      middle_notes: middleNotes,
      base_notes: baseNotes,
      seasons,
      occasions,
      time_of_day: timeOfDay,
      tier, // for reference, not stored in DB
      description: null,
      image_url: null,
      product_url: `https://example.com/perfume/${id}`,
      created_at: new Date(Date.now() - randomInt(0, 365 * 24 * 60 * 60 * 1000)).toISOString()
    });
  }

  return { perfumes, allNotes: [...allNotes].sort() };
}

function generateUsers(count = 200) {
  const users = [];
  const firstNames = [
    'Aarav', 'Aditi', 'Akshay', 'Ananya', 'Arjun', 'Diya', 'Ishaan',
    'Kavya', 'Krishna', 'Meera', 'Neha', 'Priya', 'Rahul', 'Rishi',
    'Saanvi', 'Sahil', 'Shreya', 'Tanvi', 'Varun', 'Vihaan', 'Zara',
    'Aisha', 'Kabir', 'Nisha', 'Rohan', 'Sanya', 'Ayush', 'Divya',
    'Harsh', 'Jiya', 'Karan', 'Lavanya', 'Manav', 'Nikita', 'Om',
    'Pooja', 'Ritika', 'Siddharth', 'Tara', 'Uday', 'Vivaan', 'Yash',
    'Alex', 'Sam', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley'
  ];
  const usedEmails = new Set();

  for (let i = 0; i < count; i++) {
    const firstName = randomChoice(firstNames);
    const suffix = randomInt(1, 9999);
    const username = `${firstName.toLowerCase()}${suffix}`;

    let email = `${username}@${randomChoice(['gmail.com', 'outlook.com', 'yahoo.com', 'proton.me'])}`;
    while (usedEmails.has(email)) {
      email = `${username}${randomInt(1, 999)}@gmail.com`;
    }
    usedEmails.add(email);

    users.push({
      id: uuidv4(),
      username,
      email,
      display_name: `${firstName} ${String.fromCharCode(65 + randomInt(0, 25))}.`,
      gender_preference: weightedChoice(['male', 'female', 'unisex', 'any'], [30, 30, 25, 15]),
      created_at: new Date(Date.now() - randomInt(0, 180 * 24 * 60 * 60 * 1000)).toISOString()
    });
  }
  return users;
}

function generateInteractions(users, perfumes, count = 3000) {
  const interactions = [];
  const eventTypes = [
    'preference_submitted', 'recommendation_generated', 'recommendation_viewed',
    'perfume_clicked', 'perfume_viewed', 'perfume_saved', 'add_to_cart',
    'purchase', 'feedback_submitted', 'search_performed'
  ];
  const eventWeights = [10, 8, 15, 20, 25, 8, 5, 3, 2, 4];

  for (let i = 0; i < count; i++) {
    const user = randomChoice(users);
    const perfume = randomChoice(perfumes);
    const eventType = weightedChoice(eventTypes, eventWeights);

    interactions.push({
      id: uuidv4(),
      user_id: user.id,
      session_id: `sess_${uuidv4().slice(0, 8)}`,
      event_type: eventType,
      perfume_id: ['perfume_clicked', 'perfume_viewed', 'perfume_saved', 'add_to_cart', 'purchase'].includes(eventType)
        ? perfume.id : null,
      metadata: eventType === 'search_performed'
        ? JSON.stringify({ query: randomChoice(['fresh', 'woody', 'floral', 'budget', 'summer', 'office', 'gift', 'date night']) })
        : null,
      created_at: new Date(Date.now() - randomInt(0, 90 * 24 * 60 * 60 * 1000)).toISOString()
    });
  }
  return interactions;
}

function generateReviews(users, perfumes, count = 500) {
  const reviews = [];
  const reviewTexts = [
    'Amazing scent, lasts all day!',
    'Good value for money but fades quickly.',
    'Perfect for office wear.',
    'Love the opening but the dry down is average.',
    'Received many compliments wearing this.',
    'Too strong for my taste.',
    'Beautiful bottle and great fragrance.',
    'Synthetic smelling, would not repurchase.',
    'Great for summer days.',
    'Perfect date night fragrance.',
    'Versatile scent that works everywhere.',
    'A bit too sweet for my preference.',
    'Elegant and sophisticated.',
    'Smells like a luxury fragrance at half the price.',
    'Projection is excellent.',
    'Very unique, unlike anything I\'ve tried.',
    'Classic scent, never goes out of style.',
    'Great gift option.',
    'Batch variation is noticeable.',
    'Absolutely love it, my signature scent now!'
  ];

  for (let i = 0; i < count; i++) {
    reviews.push({
      id: uuidv4(),
      user_id: randomChoice(users).id,
      perfume_id: randomChoice(perfumes).id,
      rating: generateRating(),
      review_text: Math.random() > 0.3 ? randomChoice(reviewTexts) : null,
      helpful_count: randomInt(0, 50),
      created_at: new Date(Date.now() - randomInt(0, 120 * 24 * 60 * 60 * 1000)).toISOString()
    });
  }
  return reviews;
}

// ============================================================================
// MAIN EXPORT / EXECUTION
// ============================================================================

function generateFullDataset() {
  console.log('🧪 Generating synthetic ScentWise dataset...');

  const { perfumes, allNotes } = generatePerfumes(800);
  console.log(`  ✅ Generated ${perfumes.length} perfumes`);
  console.log(`  ✅ Found ${allNotes.length} unique fragrance notes`);

  const users = generateUsers(200);
  console.log(`  ✅ Generated ${users.length} users`);

  const interactions = generateInteractions(users, perfumes, 3000);
  console.log(`  ✅ Generated ${interactions.length} interactions`);

  const reviews = generateReviews(users, perfumes, 500);
  console.log(`  ✅ Generated ${reviews.length} reviews`);

  const dataset = {
    _meta: {
      generated_at: new Date().toISOString(),
      type: 'SYNTHETIC_SEED_DATA',
      disclaimer: 'This is synthetic data generated for development and demonstration purposes. Brand names are used for realism but all product names, prices, ratings, and attributes are fictional.',
      counts: {
        perfumes: perfumes.length,
        notes: allNotes.length,
        users: users.length,
        interactions: interactions.length,
        reviews: reviews.length
      }
    },
    perfumes,
    fragrance_notes: allNotes,
    users,
    interactions,
    reviews
  };

  // Write to data/raw
  const outputDir = path.resolve(__dirname, '../../data/raw');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'seed_dataset.json');
  fs.writeFileSync(outputPath, JSON.stringify(dataset, null, 2));
  console.log(`\n📁 Dataset written to: ${outputPath}`);
  console.log(`   File size: ${(fs.statSync(outputPath).size / 1024 / 1024).toFixed(2)} MB`);

  return dataset;
}

// Run if executed directly
if (require.main === module) {
  generateFullDataset();
}

module.exports = { generateFullDataset, generatePerfumes, generateUsers };
