# Models System Architecture - Auster Platform

## Overview
A unified Models system powering both Econ Lab and Derivatives Lab, enabling users to discover, run, publish, and eventually build custom analytical models.

## System Design Principles
1. **Lab-Agnostic Core**: Models system is decoupled from specific labs
2. **Progressive Enhancement**: Phase 1 (DSL) → Phase 2 (Builder) → Phase 3 (Code)
3. **Zero Trust Execution**: All model runs are server-side, sandboxed, and audited
4. **Shareability First**: Every model run can become a public artifact
5. **Performance**: Aggressive caching, request coalescing, rate limiting

---

## Phase 1 Architecture (MVP - DSL Runtime)

### File Structure
```
src/
├── types/
│   └── models.ts                    # All TypeScript types
├── lib/
│   ├── models/
│   │   ├── engine/
│   │   │   ├── executeDsl.ts       # Main DSL execution engine
│   │   │   ├── validator.ts        # Schema validation
│   │   │   ├── primitives/
│   │   │   │   ├── index.ts        # Export all primitives
│   │   │   │   ├── math.ts         # add, sub, mul, div
│   │   │   │   ├── stats.ts        # rolling_mean, rolling_std, zscore
│   │   │   │   ├── returns.ts      # percent_change, log_return
│   │   │   │   ├── analysis.ts     # correlation, regression
│   │   │   │   └── filters.ts      # rank, filter, sort ops
│   │   │   └── outputs.ts          # Format outputs (series, tables)
│   │   ├── data/
│   │   │   ├── market.ts           # Market data gateway
│   │   │   ├── macro.ts            # Macro data gateway (FRED)
│   │   │   ├── derivatives.ts      # Options data gateway
│   │   │   └── cache.ts            # Unified caching layer
│   │   └── registry/
│   │       └── seeds.ts            # Seed model templates
│   └── supabase/
│       └── models.ts                # DB query helpers
├── app/
│   ├── models/
│   │   ├── page.tsx                # Global models registry
│   │   ├── ModelsPageClient.tsx   # Client component
│   │   └── [slug]/
│   │       ├── page.tsx            # Model detail page
│   │       └── ModelDetailClient.tsx
│   ├── artifacts/
│   │   └── [slug]/
│   │       ├── page.tsx            # Public artifact view
│   │       └── ArtifactClient.tsx
│   └── api/
│       └── models/
│           ├── route.ts            # GET /api/models (list)
│           ├── [slug]/
│           │   └── route.ts        # GET /api/models/[slug]
│           ├── run/
│           │   └── route.ts        # POST /api/models/run
│           ├── publish/
│           │   └── route.ts        # POST /api/models/publish
│           ├── fork/
│           │   └── route.ts        # POST /api/models/fork
│           ├── save/
│           │   └── route.ts        # POST /api/models/save
│           └── rate/
│               └── route.ts        # POST /api/models/rate
├── components/
│   └── models/
│       ├── ModelCard.tsx           # Model list card
│       ├── ModelFilters.tsx        # Search/filter UI
│       ├── RunPanel.tsx            # Dynamic input form
│       ├── ResultsPanel.tsx        # Charts + tables output
│       ├── PublishDialog.tsx       # Publish modal
│       └── ModelsTab.tsx           # Tab for labs
```

### Database Schema

#### Core Tables
```sql
-- models
-- Represents a model with metadata
CREATE TABLE models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  lab_scope TEXT NOT NULL CHECK (lab_scope IN ('econ', 'derivatives', 'both')),
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('private', 'unlisted', 'public')),
  tags TEXT[] DEFAULT '{}',
  difficulty TEXT NOT NULL DEFAULT 'basic' CHECK (difficulty IN ('basic', 'intermediate', 'advanced')),
  is_template BOOLEAN DEFAULT FALSE, -- System-provided models
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- model_versions
-- Versioning for models (DSL, Python, JS)
CREATE TABLE model_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  runtime TEXT NOT NULL DEFAULT 'dsl' CHECK (runtime IN ('dsl', 'python', 'js')),
  dsl_json JSONB, -- DSL definition
  code_bundle TEXT, -- For Phase 3
  dependencies TEXT[], -- For Phase 3
  input_schema JSONB NOT NULL, -- {fields: [{name, type, required, default}]}
  output_schema JSONB NOT NULL, -- {series: [], tables: []}
  changelog TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(model_id, version)
);

-- model_runs
-- Audit log of all executions
CREATE TABLE model_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model_version_id UUID NOT NULL REFERENCES model_versions(id) ON DELETE CASCADE,
  inputs_json JSONB NOT NULL,
  outputs_json JSONB,
  runtime_ms INTEGER,
  status TEXT NOT NULL CHECK (status IN ('success', 'error')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- model_usage_daily
-- Aggregated usage stats
CREATE TABLE model_usage_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  runs INTEGER NOT NULL DEFAULT 0,
  unique_users INTEGER NOT NULL DEFAULT 0,
  UNIQUE(model_id, date)
);

-- model_saves
-- User bookmarks
CREATE TABLE model_saves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, model_id)
);

-- model_ratings
-- User reviews
CREATE TABLE model_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, model_id)
);

-- published_artifacts
-- Shareable run results
CREATE TABLE published_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('model_run', 'research_object')),
  model_run_id UUID REFERENCES model_runs(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  summary TEXT,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('unlisted', 'public')),
  views INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### Indexes
```sql
CREATE INDEX idx_models_lab_scope ON models(lab_scope);
CREATE INDEX idx_models_visibility ON models(visibility);
CREATE INDEX idx_models_tags ON models USING GIN(tags);
CREATE INDEX idx_models_created ON models(created_at DESC);
CREATE INDEX idx_model_versions_model ON model_versions(model_id, version DESC);
CREATE INDEX idx_model_runs_user ON model_runs(user_id, created_at DESC);
CREATE INDEX idx_model_runs_version ON model_runs(model_version_id);
CREATE INDEX idx_model_usage_date ON model_usage_daily(model_id, date DESC);
CREATE INDEX idx_published_artifacts_slug ON published_artifacts(slug);
```

#### RLS Policies
```sql
-- Models: public can see public models, owners see their own
ALTER TABLE models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public models visible to all"
  ON models FOR SELECT
  USING (visibility = 'public' OR owner_id = auth.uid());

CREATE POLICY "Owners can manage their models"
  ON models FOR ALL
  USING (owner_id = auth.uid());

-- Similar policies for other tables...
```

### DSL Specification

#### DSL Format (JSON)
```typescript
interface DslModel {
  version: '1.0';
  steps: DslStep[];
  outputs: {
    series?: OutputSeries[];
    tables?: OutputTable[];
  };
}

interface DslStep {
  id: string;
  operation: string; // 'fetch', 'transform', 'analyze'
  params: Record<string, any>;
  inputs?: string[]; // IDs of previous steps
}

interface OutputSeries {
  id: string;
  source: string; // step ID
  label: string;
  color?: string;
}

interface OutputTable {
  id: string;
  source: string;
  columns: string[];
}
```

#### Example DSL: Expected Move Calculator
```json
{
  "version": "1.0",
  "steps": [
    {
      "id": "fetch_chain",
      "operation": "fetch_options_chain",
      "params": {
        "symbol": "$symbol",
        "expiration": "$expiration"
      }
    },
    {
      "id": "atm_straddle",
      "operation": "find_atm_straddle",
      "params": {},
      "inputs": ["fetch_chain"]
    },
    {
      "id": "expected_move",
      "operation": "calculate_expected_move",
      "params": {
        "confidence": 0.68
      },
      "inputs": ["atm_straddle"]
    }
  ],
  "outputs": {
    "series": [
      {
        "id": "price_range",
        "source": "expected_move",
        "label": "Expected Price Range (1σ)"
      }
    ],
    "tables": [
      {
        "id": "stats",
        "source": "expected_move",
        "columns": ["metric", "value"]
      }
    ]
  }
}
```

### Data Flow

#### Model Run Flow
```
User Input → Validation → Rate Limit Check → Execute DSL → Cache → Return Results → Log Run
```

#### Execution Pipeline
1. **Validate Inputs**: Match against `input_schema`
2. **Fetch Data**: Call data gateways (cached)
3. **Execute Steps**: Run DSL primitives in order
4. **Format Outputs**: Convert to series/tables
5. **Store Run**: Save inputs/outputs to `model_runs`
6. **Update Stats**: Increment `model_usage_daily`

### Caching Strategy
- **Data Layer**: Cache FRED series, market quotes, options chains (5-15 min TTL)
- **Execution Layer**: Cache identical runs (same model version + inputs) for 1 hour
- **Registry Layer**: Cache model list/search results (1 min TTL)

### Rate Limiting
- **Free Tier**: 10 model runs/day
- **Paid Tier**: 100 model runs/day
- **Per-Model**: Max 3 runs/minute/user (prevent spam)

---

## Phase 2 Architecture (Builder UI)

### Additional Components
```
components/
└── models/
    ├── builder/
    │   ├── BuilderCanvas.tsx       # Visual DSL builder
    │   ├── NodePalette.tsx         # Available operations
    │   ├── StepEditor.tsx          # Edit step params
    │   └── OutputMapper.tsx        # Map outputs
    └── versioning/
        ├── VersionHistory.tsx      # Version list
        └── VersionDiff.tsx         # Compare versions
```

### New Features
- Visual DSL builder (no-code model creation)
- Fork public models (duplicate to user's workspace)
- Version management UI
- Community features (comments, discussions)
- Usage analytics dashboard

---

## Phase 3 Architecture (Code Sandbox)

### Sandbox Worker
```
workers/
└── model-executor/
    ├── sandbox.ts              # Isolated execution
    ├── python-runtime.ts       # Python sandbox
    ├── js-runtime.ts           # JS sandbox
    └── limits.ts               # Resource limits
```

### Security Model
- **Isolated Processes**: Each code model runs in separate container
- **Network Isolation**: No outbound network by default
- **Resource Limits**: CPU, memory, timeout caps
- **Allowlist Dependencies**: Pre-approved packages only
- **Code Review**: All code models reviewed before public listing

### Deployment
- Use Vercel serverless functions for DSL (Phase 1)
- Use dedicated worker service for code execution (Phase 3)
- Queue system (BullMQ/Inngest) for async runs

---

## Integration Points

### Econ Lab Integration
```typescript
// Add "Models" tab
<Tab id="models">
  <ModelsTab
    labScope="econ"
    prefillInputs={{
      dateStart: econContext.dateStart,
      dateEnd: econContext.dateEnd,
      series: econContext.selectedSeries
    }}
  />
</Tab>
```

### Derivatives Lab Integration
```typescript
// Add "Models" tab
<Tab id="models">
  <ModelsTab
    labScope="derivatives"
    prefillInputs={{
      symbol: derivativesContext.symbol,
      expiration: derivativesContext.expiration,
      spotPrice: derivativesContext.quote?.price
    }}
  />
</Tab>
```

---

## Environment Variables

### Required
```
# Supabase (already configured)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Data Providers
FRED_API_KEY=                  # Already configured
MASSIVE_API_KEY=               # Already configured (Polygon)

# Redis/KV (already configured)
KV_URL=
KV_REST_API_TOKEN=
KV_REST_API_READ_ONLY_TOKEN=
```

### Optional (Phase 3)
```
# Worker Service
MODEL_WORKER_URL=
MODEL_WORKER_SECRET=

# Sandbox Limits
MODEL_MAX_RUNTIME_MS=30000
MODEL_MAX_MEMORY_MB=512
MODEL_MAX_OUTPUT_KB=1024
```

---

## Migration Path

### Deploy Phase 1
1. Run database migrations
2. Seed initial models
3. Deploy API routes
4. Add Models tab to labs
5. Launch /models page

### Deploy Phase 2
1. Add builder UI
2. Enable forking
3. Add community features
4. Analytics dashboard

### Deploy Phase 3
1. Set up worker service
2. Deploy sandbox runtime
3. Enable code model uploads (gated)
4. Add review workflow

---

## Success Metrics

### Phase 1 (MVP)
- 10+ seed models live
- Models integrated into both labs
- Users can run models and share artifacts
- <500ms p95 latency for DSL execution

### Phase 2 (Community)
- Users creating custom models
- Fork/remix functionality working
- Community discussions active

### Phase 3 (Power Users)
- Code models running safely
- Advanced users uploading Python/JS
- No security incidents

---

## Testing Strategy

### Unit Tests
- DSL primitives (math, stats, analysis)
- Input validation
- Output formatting

### Integration Tests
- Model run end-to-end
- Data gateway mocking
- Rate limiting

### Security Tests
- Input sanitization
- SQL injection prevention
- XSS prevention
- Code sandbox escape attempts (Phase 3)

---

This architecture provides a solid foundation for all three phases while ensuring Phase 1 ships safely and can be extended without rewrites.
