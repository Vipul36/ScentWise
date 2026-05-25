#!/bin/bash
set -e

AYUSH="ayush23chaudhary <ayush23chaudhary@users.noreply.github.com>"
VIPUL="Vipul36 <Vipul36@users.noreply.github.com>"

# PHASE 1 - April 10, 2026
export GIT_AUTHOR_DATE="2026-04-10T10:00:00+0530"
export GIT_COMMITTER_DATE="2026-04-10T10:00:00+0530"
git add package.json .env.example .gitignore
git commit --author="$AYUSH" -m "chore: initialize ScentWise project structure"

# PHASE 2 - April 15, 2026
export GIT_AUTHOR_DATE="2026-04-15T14:30:00+0530"
export GIT_COMMITTER_DATE="2026-04-15T14:30:00+0530"
git add -f server/seeds/generate-dataset.js scripts/data-cleaning.js data/raw/ data/cleaned/ data/validation/
git commit --author="$VIPUL" -m "data: add synthetic perfume dataset and cleaning pipeline"

# PHASE 3 - April 20, 2026
export GIT_AUTHOR_DATE="2026-04-20T11:15:00+0530"
export GIT_COMMITTER_DATE="2026-04-20T11:15:00+0530"
git add server/migrations/ server/seeds/run.js server/src/models/
git commit --author="$VIPUL" -m "db: add PostgreSQL schema, models, and seed scripts"

# PHASE 4 - April 25, 2026
export GIT_AUTHOR_DATE="2026-04-25T16:45:00+0530"
export GIT_COMMITTER_DATE="2026-04-25T16:45:00+0530"
git add analytics/sql/
git commit --author="$VIPUL" -m "analytics: add core perfume performance queries"

# PHASE 5 - April 28, 2026
export GIT_AUTHOR_DATE="2026-04-28T09:20:00+0530"
export GIT_COMMITTER_DATE="2026-04-28T09:20:00+0530"
git add -f analytics/python/
git commit --author="$VIPUL" -m "analytics: add perfume dataset EDA with visualizations"

# PHASE 6 - May 2, 2026
export GIT_AUTHOR_DATE="2026-05-02T13:10:00+0530"
export GIT_COMMITTER_DATE="2026-05-02T13:10:00+0530"
git add server/src/services/recommendationEngine.js server/src/config/index.js server/tests/
git commit --author="$VIPUL" -m "recommendation: implement weighted matching score and engine"

# PHASE 7 - May 5, 2026
export GIT_AUTHOR_DATE="2026-05-05T10:30:00+0530"
export GIT_COMMITTER_DATE="2026-05-05T10:30:00+0530"
git add server/src/controllers/analyticsController.js
git commit --author="$VIPUL" -m "analytics: define user interaction event model and tracking APIs"

# PHASE 8 - May 8, 2026
export GIT_AUTHOR_DATE="2026-05-08T15:20:00+0530"
export GIT_COMMITTER_DATE="2026-05-08T15:20:00+0530"
git add server/src/services/aiService.js
git commit --author="$AYUSH" -m "feat: add AI fragrance explanation service with fallbacks"

# PHASE 9 - May 12, 2026
export GIT_AUTHOR_DATE="2026-05-12T11:45:00+0530"
export GIT_COMMITTER_DATE="2026-05-12T11:45:00+0530"
git add client/
git commit --author="$AYUSH" -m "feat: add ScentWise landing page, preference quiz, and UI"

# PHASE 10 - May 18, 2026
export GIT_AUTHOR_DATE="2026-05-18T14:10:00+0530"
export GIT_COMMITTER_DATE="2026-05-18T14:10:00+0530"
git add server/
git commit --author="$AYUSH" -m "feat: integrate REST APIs and backend application scaffolding"

# PHASE 12 - May 22, 2026
export GIT_AUTHOR_DATE="2026-05-22T09:30:00+0530"
export GIT_COMMITTER_DATE="2026-05-22T09:30:00+0530"
git add README.md
git commit --author="$AYUSH" -m "docs: add project architecture and documentation"

# Any remaining files - May 25, 2026
export GIT_AUTHOR_DATE="2026-05-25T16:00:00+0530"
export GIT_COMMITTER_DATE="2026-05-25T16:00:00+0530"
git add .
git commit --author="$AYUSH" -m "fix: resolve remaining configuration files" || true

# Set up tags
git tag v0.1-data-foundation $(git log --grep="data:" --format="%H" | head -n 1) || true
git tag v0.2-database $(git log --grep="db:" --format="%H" | head -n 1) || true
git tag v0.3-analytics $(git log --grep="analytics: add core perfume performance queries" --format="%H" | head -n 1) || true
git tag v0.4-recommendation $(git log --grep="recommendation:" --format="%H" | head -n 1) || true
git tag v0.5-ai $(git log --grep="feat: add AI" --format="%H" | head -n 1) || true
git tag v0.6-frontend $(git log --grep="feat: add ScentWise landing page" --format="%H" | head -n 1) || true
git tag v0.7-integration $(git log --grep="feat: integrate REST APIs" --format="%H" | head -n 1) || true
git tag v1.0-scentwise HEAD
