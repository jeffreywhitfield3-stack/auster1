# Models System - Implementation Plan

## Phase 1 Implementation Checklist

### 1. Database Setup ✅
- [x] Create migration SQL file
- [x] Define types

### 2. Core Engine (Next Priority)
- [ ] DSL validator (`src/lib/models/engine/validator.ts`)
- [ ] DSL executor (`src/lib/models/engine/executeDsl.ts`)
- [ ] DSL primitives:
  - [ ] Math operations (`src/lib/models/engine/primitives/math.ts`)
  - [ ] Statistics (`src/lib/models/engine/primitives/stats.ts`)
  - [ ] Returns calculation (`src/lib/models/engine/primitives/returns.ts`)
  - [ ] Analysis tools (`src/lib/models/engine/primitives/analysis.ts`)
  - [ ] Filters (`src/lib/models/engine/primitives/filters.ts`)
- [ ] Output formatting (`src/lib/models/engine/outputs.ts`)

### 3. Data Gateways
- [ ] Market data gateway (`src/lib/models/data/market.ts`)
- [ ] Macro data gateway (`src/lib/models/data/macro.ts`)
- [ ] Derivatives data gateway (`src/lib/models/data/derivatives.ts`)
- [ ] Unified cache layer (`src/lib/models/data/cache.ts`)

### 4. API Routes
- [ ] GET `/api/models` - List models
- [ ] GET `/api/models/[slug]` - Get model details
- [ ] POST `/api/models/run` - Execute model
- [ ] POST `/api/models/publish` - Publish artifact
- [ ] POST `/api/models/fork` - Fork model
- [ ] POST `/api/models/save` - Save/bookmark
- [ ] POST `/api/models/rate` - Rate model

### 5. UI Components
- [ ] Model card (`src/components/models/ModelCard.tsx`)
- [ ] Model filters (`src/components/models/ModelFilters.tsx`)
- [ ] Run panel (`src/components/models/RunPanel.tsx`)
- [ ] Results panel (`src/components/models/ResultsPanel.tsx`)
- [ ] Publish dialog (`src/components/models/PublishDialog.tsx`)
- [ ] Models tab for labs (`src/components/models/ModelsTab.tsx`)

### 6. Pages
- [ ] Global models page (`src/app/models/page.tsx`)
- [ ] Model detail page (`src/app/models/[slug]/page.tsx`)
- [ ] Artifact view page (`src/app/artifacts/[slug]/page.tsx`)

### 7. Seed Data
- [ ] Create seed script (`src/lib/models/registry/seeds.ts`)
- [ ] Define 5-10 Econ models
- [ ] Define 5-10 Derivatives models
- [ ] Generate DSL JSON for each

### 8. Integration
- [ ] Add Models tab to Econ Lab
- [ ] Add Models tab to Derivatives Lab
- [ ] Update navigation/routing

### 9. Testing
- [ ] Unit tests for DSL primitives
- [ ] Integration tests for data gateways
- [ ] API route tests
- [ ] E2E test for model run flow

### 10. Documentation
- [ ] API documentation
- [ ] DSL specification document
- [ ] User guide for creating models (Phase 2)
- [ ] Deployment checklist

## File Creation Order

### Round 1: Core Engine (This Response)
1. `src/lib/models/engine/validator.ts`
2. `src/lib/models/engine/primitives/math.ts`
3. `src/lib/models/engine/primitives/stats.ts`
4. `src/lib/models/engine/primitives/returns.ts`
5. `src/lib/models/engine/primitives/analysis.ts`
6. `src/lib/models/engine/primitives/index.ts`
7. `src/lib/models/engine/outputs.ts`
8. `src/lib/models/engine/executeDsl.ts`

### Round 2: Data Gateways
1. `src/lib/models/data/cache.ts`
2. `src/lib/models/data/market.ts`
3. `src/lib/models/data/macro.ts`
4. `src/lib/models/data/derivatives.ts`

### Round 3: API Routes
1. `src/app/api/models/route.ts`
2. `src/app/api/models/[slug]/route.ts`
3. `src/app/api/models/run/route.ts`
4. `src/app/api/models/publish/route.ts`
5. Additional routes...

### Round 4: UI Components
1. Model card
2. Filters
3. Run panel
4. Results panel
5. Models tab

### Round 5: Pages & Integration
1. Models page
2. Detail page
3. Artifact page
4. Lab integrations

### Round 6: Seed Data & Testing
1. Seed models
2. Tests
3. Documentation

## Implementation Notes

### DSL Execution Flow
```
1. Parse DSL JSON
2. Validate structure & params
3. Build dependency graph
4. Execute steps in order:
   a. Fetch data (cached)
   b. Transform data
   c. Analyze data
5. Format outputs
6. Cache result
7. Log run
```

### Rate Limiting Strategy
- Per-user limits tracked in existing `user_usage` table
- Product key: `model_runs`
- Free tier: 10/day
- Paid tier: 100/day
- Additional per-model rate limit: 3/min

### Caching Strategy
- L1: In-memory (Node.js process) - 1 min TTL
- L2: Redis/KV - 5-15 min TTL depending on data source
- Cache keys include all input params + version hash

### Security Considerations
- All model runs server-side only
- Input validation against schema
- SQL injection prevention (parameterized queries)
- XSS prevention (sanitize outputs)
- Rate limiting
- Audit logging

## Next Steps After Phase 1

### Phase 2 Features
- Visual model builder UI
- Fork/remix functionality
- Version management UI
- Community comments/discussions
- Analytics dashboard
- Advanced search/discovery

### Phase 3 Features
- Code sandbox worker
- Python runtime
- JS runtime
- Resource limits enforcement
- Code review workflow
- Advanced quotas

## Deployment Checklist

### Environment Variables
✅ Already configured:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `FRED_API_KEY`
- `MASSIVE_API_KEY`
- `KV_URL`, `KV_REST_API_TOKEN`

New (Phase 3 only):
- `MODEL_WORKER_URL`
- `MODEL_WORKER_SECRET`

### Database
1. Run migration: `supabase_schema_models_system.sql`
2. Verify tables created
3. Run seed script

### Application
1. Deploy API routes
2. Deploy UI components
3. Update lab pages
4. Test model execution
5. Monitor error rates

### Monitoring
- Track model run latency (p50, p95, p99)
- Track error rates by model
- Track rate limit hits
- Track cache hit rates
- Monitor data gateway costs

## Success Criteria

### Phase 1 Launch
- [ ] 10+ seed models live
- [ ] Models integrated in both labs
- [ ] Users can run models (<2s p95 latency)
- [ ] Users can publish artifacts
- [ ] Zero security incidents
- [ ] <1% error rate on model runs

### 1 Month Post-Launch
- [ ] 100+ model runs/day
- [ ] 10+ published artifacts
- [ ] 5+ user-created models (Phase 2)
- [ ] Positive user feedback
- [ ] No performance degradation

Let's begin implementation!
