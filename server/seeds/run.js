/**
 * ScentWise — Database Seeder
 * ============================
 * 
 * Seeds the PostgreSQL database with cleaned dataset.
 * Run after: migrations → generate-dataset → data-cleaning
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  database: process.env.DB_NAME || 'scentwise',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

async function seed() {
  const client = await pool.connect();
  console.log('🌱 ScentWise Database Seeder');
  console.log('============================\n');

  // Load cleaned dataset
  const dataPath = path.resolve(__dirname, '../../data/cleaned/cleaned_dataset.json');
  if (!fs.existsSync(dataPath)) {
    console.error('❌ Cleaned dataset not found. Run data cleaning first.');
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  try {
    await client.query('BEGIN');

    // 1. Seed users
    console.log('⏳ Seeding users...');
    for (const user of data.users) {
      await client.query(
        `INSERT INTO users (id, username, email, display_name, gender_preference, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO NOTHING`,
        [user.id, user.username, user.email, user.display_name, user.gender_preference, user.created_at]
      );
    }
    console.log(`  ✅ Seeded ${data.users.length} users`);

    // 2. Seed perfumes
    console.log('⏳ Seeding perfumes...');
    for (const p of data.perfumes) {
      await client.query(
        `INSERT INTO perfumes (id, brand, perfume_name, gender, price, rating, review_count, fragrance_family, intensity, longevity, sillage, description, image_url, product_url, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         ON CONFLICT (id) DO NOTHING`,
        [p.id, p.brand, p.perfume_name, p.gender, p.price, p.rating, p.review_count,
         p.fragrance_family, p.intensity, p.longevity, p.sillage,
         p.description, p.image_url, p.product_url, p.created_at]
      );
    }
    console.log(`  ✅ Seeded ${data.perfumes.length} perfumes`);

    // 3. Seed fragrance notes
    console.log('⏳ Seeding fragrance notes...');
    const noteIdMap = new Map();
    for (const note of data.fragrance_notes) {
      const noteId = uuidv4();
      await client.query(
        `INSERT INTO fragrance_notes (id, note_name, category)
         VALUES ($1, $2, $3)
         ON CONFLICT (note_name) DO UPDATE SET category = EXCLUDED.category
         RETURNING id`,
        [noteId, note.note_name, note.category]
      );
      // Get the actual ID (might be existing)
      const { rows } = await client.query(
        'SELECT id FROM fragrance_notes WHERE note_name = $1', [note.note_name]
      );
      if (rows.length > 0) {
        noteIdMap.set(note.note_name, rows[0].id);
      }
    }
    console.log(`  ✅ Seeded ${data.fragrance_notes.length} fragrance notes`);

    // 4. Seed perfume-notes associations
    console.log('⏳ Seeding perfume-note associations...');
    let noteAssocCount = 0;
    for (const p of data.perfumes) {
      for (const note of p.top_notes) {
        const noteId = noteIdMap.get(note);
        if (noteId) {
          await client.query(
            `INSERT INTO perfume_notes (id, perfume_id, note_id, note_layer)
             VALUES ($1, $2, $3, 'top')
             ON CONFLICT DO NOTHING`,
            [uuidv4(), p.id, noteId]
          );
          noteAssocCount++;
        }
      }
      for (const note of p.middle_notes) {
        const noteId = noteIdMap.get(note);
        if (noteId) {
          await client.query(
            `INSERT INTO perfume_notes (id, perfume_id, note_id, note_layer)
             VALUES ($1, $2, $3, 'middle')
             ON CONFLICT DO NOTHING`,
            [uuidv4(), p.id, noteId]
          );
          noteAssocCount++;
        }
      }
      for (const note of p.base_notes) {
        const noteId = noteIdMap.get(note);
        if (noteId) {
          await client.query(
            `INSERT INTO perfume_notes (id, perfume_id, note_id, note_layer)
             VALUES ($1, $2, $3, 'base')
             ON CONFLICT DO NOTHING`,
            [uuidv4(), p.id, noteId]
          );
          noteAssocCount++;
        }
      }
    }
    console.log(`  ✅ Seeded ${noteAssocCount} perfume-note associations`);

    // 5. Seed perfume seasons
    console.log('⏳ Seeding perfume seasons...');
    let seasonCount = 0;
    for (const p of data.perfumes) {
      for (const season of p.seasons) {
        await client.query(
          `INSERT INTO perfume_seasons (id, perfume_id, season)
           VALUES ($1, $2, $3)
           ON CONFLICT DO NOTHING`,
          [uuidv4(), p.id, season]
        );
        seasonCount++;
      }
    }
    console.log(`  ✅ Seeded ${seasonCount} perfume-season associations`);

    // 6. Seed perfume occasions
    console.log('⏳ Seeding perfume occasions...');
    let occasionCount = 0;
    for (const p of data.perfumes) {
      for (const occasion of p.occasions) {
        await client.query(
          `INSERT INTO perfume_occasions (id, perfume_id, occasion)
           VALUES ($1, $2, $3)
           ON CONFLICT DO NOTHING`,
          [uuidv4(), p.id, occasion]
        );
        occasionCount++;
      }
    }
    console.log(`  ✅ Seeded ${occasionCount} perfume-occasion associations`);

    // 7. Seed perfume time of day
    console.log('⏳ Seeding perfume time preferences...');
    for (const p of data.perfumes) {
      await client.query(
        `INSERT INTO perfume_time_of_day (id, perfume_id, time_of_day)
         VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`,
        [uuidv4(), p.id, p.time_of_day]
      );
    }
    console.log(`  ✅ Seeded ${data.perfumes.length} time-of-day preferences`);

    // 8. Seed interactions
    console.log('⏳ Seeding interactions...');
    for (const i of data.interactions) {
      await client.query(
        `INSERT INTO interactions (id, user_id, session_id, event_type, perfume_id, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO NOTHING`,
        [i.id, i.user_id, i.session_id, i.event_type, i.perfume_id,
         i.metadata ? i.metadata : null, i.created_at]
      );
    }
    console.log(`  ✅ Seeded ${data.interactions.length} interactions`);

    // 9. Seed reviews
    console.log('⏳ Seeding reviews...');
    for (const r of data.reviews) {
      await client.query(
        `INSERT INTO reviews (id, user_id, perfume_id, rating, review_text, helpful_count, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO NOTHING`,
        [r.id, r.user_id, r.perfume_id, r.rating, r.review_text, r.helpful_count, r.created_at]
      );
    }
    console.log(`  ✅ Seeded ${data.reviews.length} reviews`);

    await client.query('COMMIT');
    console.log('\n🎉 Database seeding complete!');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seeding failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
