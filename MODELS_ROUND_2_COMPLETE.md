# Models System - Round 2: API Routes Complete

## Overview
Round 2 is complete! All core API routes for the Models system have been implemented.

## API Routes Implemented

### 1. `/api/models` (route.ts)
**GET** - List models with filtering, sorting, pagination
- Query params: `lab`, `search`, `tags[]`, `difficulty`, `sort`, `page`, `limit`
- Supports: popular, newest, top_rated sorting
- Returns: models with owner info and latest version
- Auth: Optional (public models for anonymous, user's private models when authenticated)

**POST** - Create new model
- Body: `name`, `description`, `lab_scope`, `dsl_json`, `input_schema`, `visibility`, `tags`, `difficulty`, `is_template`
- Validates DSL before creation
- Creates model + initial version (1.0.0)
- Auth: Required

### 2. `/api/models/[slug]` (route.ts)
**GET** - Get model details
- Returns: model with all versions sorted by date
- Auth: Optional (respects visibility)

**PATCH** - Update model metadata (owner only)
- Fields: `name`, `description`, `tags`, `visibility`, `difficulty`
- Auth: Required (owner only)

**DELETE** - Delete model (owner only)
- Cascade deletes versions, runs, ratings, saves
- Auth: Required (owner only)

### 3. `/api/models/run` (route.ts)
**POST** - Execute a model
- Body: `model_slug`, `inputs`
- Features:
  - Rate limiting (per-user, per-minute, per-day)
  - Input validation against schema
  - DSL execution with timeout
  - Result caching (5 minutes)
  - Run logging to database
  - Returns: `output`, `runId`, `cached`, `runtimeMs`, `warnings`
- Auth: Required
- Max duration: 60 seconds

### 4. `/api/models/fork` (route.ts)
**POST** - Fork a public model
- Body: `model_slug`
- Creates: New model (private) + version (1.0.0)
- Auto-generates unique slug (e.g., `original-fork-2`)
- Auth: Required

### 5. `/api/models/save` (route.ts)
**POST** - Save (bookmark) a model
- Body: `model_id`
- Auth: Required

**DELETE** - Unsave a model
- Query: `model_id`
- Auth: Required

### 6. `/api/models/rate` (route.ts)
**POST** - Rate a model (1-5 stars with optional comment)
- Body: `model_id`, `rating`, `comment`
- Upserts: Updates existing rating or creates new
- Triggers: Updates model avg_rating via database trigger
- Auth: Required

**GET** - Get user's rating for a model
- Query: `model_id`
- Auth: Required

**DELETE** - Delete user's rating
- Query: `model_id`
- Auth: Required

### 7. `/api/models/publish` (route.ts)
**POST** - Publish a run as shareable artifact
- Body: `run_id`, `title`, `description`
- Validates: Run must be successful and owned by user
- Generates: Unique slug from title
- Returns: `artifact`, `url` (e.g., `/artifacts/my-analysis`)
- Auth: Required

**GET** - List user's published artifacts
- Query: `page`, `limit`
- Returns: Artifacts with model and user info
- Auth: Required

## Key Features Implemented

### Rate Limiting
- 100 runs per day (paid tier)
- 3 runs per minute
- Checked on every `/api/models/run` request

### Caching
- Model run results cached for 5 minutes
- Cache key includes model version + inputs hash
- Returns `cached: true` when serving from cache

### Validation
- DSL validation before model creation
- Input validation before execution
- Schema enforcement on all endpoints

### Security
- Authentication on all write operations
- Ownership checks on update/delete
- RLS-friendly queries (OR visibility clauses)
- Visibility rules enforced (public, unlisted, private)

### Error Handling
- Comprehensive try-catch blocks
- Detailed error logging
- User-friendly error messages
- Proper HTTP status codes

## Database Triggers Used
The API routes rely on database triggers created in the schema:
- `update_model_stats_after_run` - Updates total_runs on models table
- `update_model_stats_after_rating` - Updates avg_rating on models table
- `increment_model_usage_daily` - Updates model_usage_daily table

## Next Steps (Round 3)
The next round will implement UI components:
1. ModelCard.tsx - Display model in grid
2. ModelFilters.tsx - Search, filter, sort controls
3. RunPanel.tsx - Input form + run button
4. ResultsPanel.tsx - Display outputs (series, tables, scalars)
5. PublishDialog.tsx - Publish run as artifact
6. ModelsTab.tsx - Tab component for lab integration

## Environment Variables Required
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
POLYGON_API_KEY=...
FRED_API_KEY=...
KV_URL=... (Vercel KV)
KV_REST_API_URL=...
KV_REST_API_TOKEN=...
KV_REST_API_READ_ONLY_TOKEN=...
```

## Testing the API Routes

### Create a Model
```bash
curl -X POST http://localhost:3000/api/models \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Simple Moving Average",
    "description": "Calculate 20-day SMA",
    "lab_scope": "econ",
    "dsl_json": {...},
    "input_schema": {...}
  }'
```

### Run a Model
```bash
curl -X POST http://localhost:3000/api/models/run \
  -H "Content-Type: application/json" \
  -d '{
    "model_slug": "simple-moving-average",
    "inputs": {
      "symbol": "SPY",
      "days": 30
    }
  }'
```

### List Models
```bash
curl "http://localhost:3000/api/models?lab=econ&sort=popular&page=1&limit=24"
```

## Status
✅ Round 1: Core Engine (Complete)
✅ Round 2: API Routes (Complete)
⏳ Round 3: UI Components (Next)
