# ScentWise — AI-Powered Personalized Perfume Discovery & Analytics Platform

<p align="center">
  <strong>A data-driven recommendation platform that helps users discover perfumes based on personal preferences, powered by a transparent scoring engine and AI-generated explanations.</strong>
</p>

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Problem Statement](#problem-statement)
3. [Solution](#solution)
4. [Features](#features)
5. [Architecture](#architecture)
6. [Tech Stack](#tech-stack)
7. [Database Schema](#database-schema)
8. [Recommendation Algorithm](#recommendation-algorithm)
9. [AI Integration](#ai-integration)
10. [Data Pipeline](#data-pipeline)
11. [Analytics & KPIs](#analytics--kpis)
12. [API Documentation](#api-documentation)
13. [Setup Instructions](#setup-instructions)
14. [Environment Variables](#environment-variables)
15. [Testing](#testing)
16. [Project Structure](#project-structure)
17. [Future Improvements](#future-improvements)

---

## Project Overview

**ScentWise** is a full-stack recommendation platform that allows users to discover perfumes by expressing their preferences in plain language — budget, season, occasion, fragrance family, and intensity — rather than needing to understand complex fragrance terminology.

The platform combines:
- **Deterministic weighted scoring** for transparent, explainable recommendations
- **Gemini AI integration** for translating technical fragrance notes into human-friendly descriptions
- **SQL-based analytics** for understanding user behavior and perfume performance
- **Python EDA** for exploratory data analysis with reproducible visualizations

> **Note on Data**: This project uses a **synthetic seed dataset** of 800 perfumes, 200 users, 3000 interactions, and 500 reviews. Brand names are used for realism, but all product names, prices, ratings, and attributes are programmatically generated. No real product data was scraped or copied from any website.

---

## Problem Statement

Choosing a perfume is overwhelming. There are thousands of fragrances, each described in technical terminology (sillage, dry down, chypre, fougère) that most consumers don't understand. Existing platforms expect users to already know what they want.

**Challenge**: How can we help non-expert users find perfumes that match their lifestyle, budget, and preferences — without requiring fragrance expertise?

---

## Solution

ScentWise takes a **data-first approach**:

1. **Collect structured preferences** through a guided quiz (budget, season, occasion, gender, fragrance family, intensity)
2. **Filter unsuitable perfumes** using hard constraints (budget, gender)
3. **Score remaining perfumes** across 8 weighted dimensions
4. **Rank and explain** why each perfume was recommended
5. **Use AI to translate** technical fragrance terms into everyday language
6. **Track interactions** for analytics and continuous improvement

---

## Features

| Feature | Description |
|---------|-------------|
| **Preference Quiz** | 7-step guided quiz collecting budget, gender, occasion, season, time-of-day, fragrance family, and intensity |
| **Recommendation Engine** | Deterministic weighted scoring across 8 dimensions with configurable weights |
| **Score Transparency** | Every recommendation shows matched/unmatched preferences and individual score breakdowns |
| **AI Note Explanations** | Click any fragrance note to get a plain-English explanation via Gemini AI |
| **Perfume Catalog** | Browse 800+ perfumes with search, filtering, sorting, and pagination |
| **Analytics Dashboard** | Real-time KPIs, user preference distributions, perfume performance, and recommendation analytics |
| **Interaction Tracking** | 11 event types tracked for behavioral analysis |
| **Data Pipeline** | Repeatable data generation → cleaning → validation → seeding workflow |
| **SQL Analytics** | 20 pre-built analytical queries answering business questions |
| **Python EDA** | 10 reproducible visualizations with pandas and matplotlib |

---

## Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│   Frontend   │────▶│   REST API       │────▶│ PostgreSQL  │
│  React/Vite  │     │  Express.js      │     │  Database   │
│  Tailwind    │     │                  │     └─────────────┘
└─────────────┘     │  Business Logic  │            │
                    │  ┌────────────┐  │     ┌──────▼──────┐
                    │  │ Rec Engine │  │     │ SQL Queries  │
                    │  └────────────┘  │     │ Python EDA   │
                    │                  │     │ Dashboard    │
                    │  ┌────────────┐  │     └─────────────┘
                    │  │ AI Service │──┼───▶ Gemini API
                    │  └────────────┘  │
                    └──────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Vite, Tailwind CSS v4, React Router, Recharts, Lucide Icons |
| **Backend** | Node.js, Express.js, express-validator, Winston, Helmet |
| **Database** | PostgreSQL with pg driver |
| **AI** | Google Gemini API (@google/generative-ai) |
| **Analytics** | Python 3, pandas, matplotlib |
| **Testing** | Jest, Supertest |

---

## Database Schema

12 tables in a normalized, analytics-friendly schema:

| Table | Purpose |
|-------|---------|
| `users` | Registered platform users |
| `perfumes` | Core perfume catalog (800+ records) |
| `fragrance_notes` | Normalized note dictionary (94 unique notes) |
| `perfume_notes` | Many-to-many: perfumes ↔ notes with layer (top/middle/base) |
| `perfume_seasons` | Which seasons a perfume suits |
| `perfume_occasions` | Which occasions a perfume suits |
| `perfume_time_of_day` | Day/night suitability |
| `user_preferences` | Each preference quiz submission |
| `recommendations` | Generated recommendations with scores and match details |
| `interactions` | User event tracking (11 event types) |
| `reviews` | User reviews on perfumes |
| `ai_explanations_cache` | LLM response cache to reduce API calls |

All tables use UUID primary keys, appropriate foreign keys, indexes, constraints, and timestamps.

---

## Recommendation Algorithm

A **transparent, deterministic, weighted scoring system** — NOT a machine learning model.

### Weights (configurable in `server/src/config/index.js`):

| Dimension | Weight | Description |
|-----------|--------|-------------|
| Fragrance Family | 30% | Match between preferred and perfume's family |
| Occasion | 20% | Match between preferred and suitable occasions |
| Season | 15% | Match between preferred and suitable seasons |
| Fragrance Notes | 10% | Overlap between preferred notes and perfume's note profile |
| Budget | 10% | How well the price fits the budget range |
| Time of Day | 5% | Day/night preference match |
| Intensity | 5% | Intensity preference match |
| Gender | 5% | Gender preference match |

### Process:

1. **Hard constraints** — Budget ceiling, gender filter → exclude mismatches entirely
2. **Feature scoring** — Each dimension scored 0–100 independently
3. **Weighted aggregation** — Apply weights → composite score 0–100
4. **Ranking** — Sort by score, tiebreak by rating
5. **Explanation** — Generate matched/unmatched preference lists and reason text

### Example Output:

```
Perfume: Versace Crystal Dream — Score: 82/100
Strengths: Matches preferred fragrance family: citrus; Within budget (₹3,500); Suitable for summer
```

---

## AI Integration

Uses **Google Gemini API** for three explanation types:

1. **Note Explanations** — "What does vetiver smell like?" → "A clean, earthy and slightly grassy scent..."
2. **Perfume Experience** — "What does this perfume feel like?" grounded in actual note/family data
3. **Recommendation Reasons** — Converts match data into natural-language explanations

### Guardrails:
- LLM does NOT determine rankings or scores
- LLM is grounded in structured database data — cannot invent prices, ratings, or specs
- Responses are cached in `ai_explanations_cache` table (30-day TTL)
- Rate limiting (configurable RPM)
- Timeout handling (configurable)
- **Full fallback** — if API is unavailable, deterministic descriptions are used

---

## Data Pipeline

```
generate-dataset.js → seed_dataset.json → data-cleaning.js → cleaned_dataset.json → run.js → PostgreSQL
     (raw)                                    (cleaned)                                (seeded)
```

### Cleaning Rules Applied:
- Duplicate detection (brand + name)
- Capitalization standardization
- Rating validation and clamping [0, 5]
- Price validation (> 0)
- Fragrance family normalization (synonyms mapped)
- Enum validation (intensity, longevity, sillage, gender)
- Note array normalization (lowercase, deduplicate, sort)
- Season/occasion standardization
- Email validation for users
- Foreign key integrity for interactions/reviews

---

## Analytics & KPIs

### KPI Definitions:

| KPI | Formula | Business Question |
|-----|---------|-------------------|
| **Recommendation CTR** | Clicks / Recommendation Views × 100 | How effectively do recommendations drive engagement? |
| **Conversion Rate** | Purchases / Recommendation Views × 100 | What % of recommendations lead to purchase? |
| **Add-to-Cart Rate** | Cart Adds / Clicks × 100 | How compelling are perfume details? |
| **Active Users (30d)** | Distinct users with interactions in last 30 days | How engaged is the user base? |

### Pre-built SQL Queries (20):

See [`analytics/sql/analytics_queries.sql`](analytics/sql/analytics_queries.sql) for queries covering:
- Most popular perfumes, families, notes, brands
- Price/rating distributions and correlations
- User preference analysis
- Recommendation performance by category
- Seasonal trends
- Hidden gems (high rating, low engagement)
- Repeat user analysis
- Budget match analysis

### Python EDA (10 visualizations):

See [`analytics/python/eda.py`](analytics/python/eda.py) for charts answering:
- Price and rating distributions
- Fragrance family popularity
- Most common notes
- Price vs. rating correlation
- Seasonal/occasion coverage
- Interaction funnel analysis
- Brand distribution

---

## API Documentation

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/perfumes` | List perfumes (paginated, filterable, searchable) |
| GET | `/api/perfumes/:id` | Get perfume details with AI description |
| GET | `/api/perfumes/meta/families` | List distinct fragrance families |
| GET | `/api/perfumes/meta/brands` | List distinct brands |
| GET | `/api/perfumes/meta/notes` | List all fragrance notes |
| GET | `/api/notes/:name/explain` | AI explanation for a fragrance note |
| POST | `/api/preferences` | Submit preferences → generate recommendations |
| GET | `/api/recommendations/:preferenceId` | Get recommendations for a preference set |
| POST | `/api/interactions` | Track a user interaction event |
| GET | `/api/analytics/overview` | Platform KPIs |
| GET | `/api/analytics/preferences` | User preference distributions |
| GET | `/api/analytics/perfumes` | Perfume engagement data |
| GET | `/api/analytics/recommendations` | Recommendation performance |
| GET | `/api/analytics/trends` | Interaction trends (configurable days) |
| GET | `/api/analytics/notes` | Top fragrance notes by usage |
| GET | `/api/analytics/prices` | Price distribution |
| GET | `/api/analytics/ratings` | Rating distribution |

All responses follow: `{ success: boolean, data: any, meta?: { page, limit, total } }`

---

## Setup Instructions

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Python 3.8+ (for EDA)
- Gemini API key (optional — works without it using fallbacks)

### 1. Clone and install

```bash
git clone <repo-url>
cd ScentWise

# Server
cd server && npm install && cd ..

# Client
cd client && npm install && cd ..
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your PostgreSQL credentials and optional Gemini API key
```

### 3. Setup database

```bash
createdb scentwise  # or use your preferred method
cd server
npm run migrate     # Apply schema
```

### 4. Generate and clean data

```bash
npm run seed:generate   # Creates data/raw/seed_dataset.json
npm run clean-data      # Creates data/cleaned/cleaned_dataset.json
npm run seed            # Seeds PostgreSQL
```

### 5. Start development servers

```bash
# Terminal 1: Backend
cd server && npm run dev

# Terminal 2: Frontend
cd client && npm run dev
```

### 6. Run Python EDA (optional)

```bash
pip install pandas matplotlib
python analytics/python/eda.py
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | API server port (default: 3001) |
| `DB_HOST` | Yes | PostgreSQL host |
| `DB_PORT` | No | PostgreSQL port (default: 5432) |
| `DB_NAME` | Yes | Database name |
| `DB_USER` | Yes | Database user |
| `DB_PASSWORD` | Yes | Database password |
| `GEMINI_API_KEY` | No | Google Gemini API key (falls back to deterministic descriptions) |
| `NODE_ENV` | No | Environment (default: development) |

---

## Testing

```bash
cd server
npm test          # Run all tests
npm test -- --verbose  # Verbose output
npm test -- --coverage # With coverage
```

### Test Coverage:

- **28 tests** covering the recommendation engine:
  - Hard constraint tests (budget, gender)
  - Feature scoring tests (all 8 dimensions)
  - Weighted aggregation tests
  - Full recommendation flow tests
  - Edge cases (empty input, no matches, tie scores)
  - Custom weight configuration

---

## Project Structure

```
ScentWise/
├── server/                     # Backend API
│   ├── src/
│   │   ├── config/            # App config, database connection
│   │   ├── controllers/       # Route handlers
│   │   ├── middleware/        # Validation, error handling
│   │   ├── models/            # Data access layer
│   │   ├── routes/            # API routes
│   │   ├── services/          # Recommendation engine, AI service
│   │   ├── utils/             # Logger, response helpers
│   │   └── index.js           # Express server entry
│   ├── migrations/            # SQL schema migrations
│   ├── seeds/                 # Data generation and seeding
│   └── tests/                 # Jest tests
├── client/                     # Frontend React app
│   └── src/
│       ├── components/        # Navbar, shared components
│       ├── pages/             # Home, Quiz, Results, Browse, PerfumeDetail, Dashboard
│       ├── api.js             # API client
│       └── index.css          # Design system
├── analytics/
│   ├── sql/                   # 20 analytical SQL queries
│   └── python/                # EDA script with 10 visualizations
├── data/
│   ├── raw/                   # Generated synthetic dataset
│   ├── cleaned/               # Cleaned dataset
│   └── validation/            # Cleaning report
├── scripts/                   # Data cleaning pipeline
├── docs/                      # Project documentation
└── .env.example               # Environment template
```

---

## Future Improvements

1. **Collaborative filtering** — Add user-to-user similarity for "users like you also liked" recommendations
2. **Content-based ML** — Train an embedding model on note profiles for similarity search
3. **A/B testing framework** — Test different weight configurations and measure CTR impact
4. **User authentication** — JWT-based auth for persistent profiles and preference history
5. **Review sentiment analysis** — NLP on review text to extract sentiment and common themes
6. **Price tracking** — Historical price monitoring for deal alerts
7. **Recommendation feedback loop** — Let users rate recommendations to refine future suggestions
8. **Power BI integration** — Export analytical views as Power BI-compatible datasets
9. **Deployment** — Docker containerization, CI/CD pipeline, cloud deployment

---

Built with ❤️ as a full-stack data engineering project demonstrating data pipelines, SQL analytics, recommendation systems, AI integration, and modern web development.
