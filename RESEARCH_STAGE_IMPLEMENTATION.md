# Research Stage Implementation Guide

## Overview

This document outlines the complete implementation of Auster's Research Stage—a public research institution where economic and financial analyses become permanent public artifacts.

## Files Created

### Documentation
1. `RESEARCH_STAGE_VISION.md` - Complete vision document (7,000+ words)
2. `RESEARCH_STAGE_IMPLEMENTATION.md` - This implementation guide
3. `supabase_schema_research_stage.sql` - Complete database schema

### Type Definitions
4. `src/types/research.ts` - TypeScript types for all Research Stage entities

### Pages & Components
5. `src/app/(protected)/research/page.tsx` - Research Stage homepage
6. `src/app/(protected)/research/ResearchStageClient.tsx` - Main client component
7. `src/app/(protected)/research/publish/page.tsx` - Publishing page
8. `src/app/(protected)/research/publish/PublishResearchClient.tsx` - Publishing flow

## Database Schema

The schema includes 8 core tables:

1. **researcher_profiles** - Public contributor identities
2. **research_objects** - Published analytical work
3. **discussions** - Structured commentary
4. **referrals** - Attribution tracking
5. **citations** - Cross-research references
6. **collections** - Topic and method collections
7. **collection_memberships** - Many-to-many relationships
8. **researcher_activity** - Activity log for scoring

### Key Features
- Row Level Security (RLS) enabled
- Automatic tier progression triggers
- Referral code generation
- Views for common queries
- Full indexing for performance

## Type System

### Core Types
- `ResearcherProfile` - User public identity
- `ResearchObject` - Published research with full provenance
- `Discussion` - Structured commentary with types
- `Referral` - Attribution chain tracking
- `Citation` - Inter-research references
- `Collection` - Curated research groupings

### Enums
- `ResearcherTier`: observer | contributor | researcher | institution
- `ResearchObjectType`: 6 types of research
- `DiscussionType`: 7 structured discussion categories
- `AttributionType`: 5 ways to earn attribution

## UI Components Implemented

### 1. Research Stage Homepage (`/research`)
**Features:**
- Hero section with mission statement
- 3 view tabs: Recent | Topics | Researchers
- Research object cards with metadata
- Topic collection grid
- Researcher profiles grid

**Design:**
- Research-grade aesthetic (calm, premium)
- Institution-like (not social-media-coded)
- Clear hierarchy and structure
- Engagement metrics without gamification

### 2. Publishing Flow (`/research/publish`)
**Features:**
- 4-step wizard: Type → Content → Methods → Review
- Research type selection (6 types)
- Title, abstract, topics input
- Methods and assumptions (required)
- Data sources tracking
- Final review before publishing

**Design:**
- Clear progress indicators
- Form validation
- Publishing guidelines sidebar
- Attribution messaging

## Next Steps to Complete

### Phase 1: Core Features (Priority)

1. **API Routes** - Create Next.js API routes:
   ```
   /api/research/objects/create
   /api/research/objects/list
   /api/research/objects/[id]
   /api/research/profiles/create
   /api/research/profiles/[slug]
   /api/research/discussions/create
   /api/research/referrals/generate
   ```

2. **Individual Research Object Page** (`/research/[id]`)
   - Full content display
   - Author information
   - Methods & assumptions panel
   - Discussion thread
   - Citation list
   - Share/referral buttons

3. **Researcher Profile Page** (`/researchers/[slug]`)
   - Identity & credentials
   - Published research list
   - Contribution history
   - Attribution score
   - Tier badge
   - Referral link

4. **Discussion System**
   - Threaded comments
   - Discussion type selector
   - Author endorsement
   - Quality voting
   - Thread depth limiting

### Phase 2: Discovery (Next)

5. **Browse Page** (`/research/browse`)
   - Filtering by type, topic, technique
   - Sorting options
   - Pagination
   - Search functionality

6. **Topic Collection Pages** (`/research/topics/[slug]`)
   - Research objects in topic
   - Topic description
   - Related topics
   - Curator information

7. **Search Functionality**
   - Full-text search
   - Filter combinations
   - Results ranking

### Phase 3: Attribution & Referrals (Then)

8. **Referral System**
   - Generate unique referral codes
   - Track attribution chains
   - Calculate attribution points
   - Reward unlocking

9. **Attribution Dashboard** (`/research/attribution`)
   - Personal attribution score
   - Referral statistics
   - Tier progression tracking
   - Unlocked features

10. **Tier Progression**
    - Automatic tier updates
    - Unlock notifications
    - Feature gates
    - Tier badges

### Phase 4: Engagement (Finally)

11. **Citations**
    - Create citation links
    - Citation context
    - Citation graphs
    - Most-cited research

12. **Extensions & Replications**
    - Fork research objects
    - Track lineage
    - Replication results
    - Extension chains

13. **Collections**
    - Create collections
    - Add/remove research
    - Curate topic areas
    - Share collections

## Integration Points

### With Existing Labs

**Econ Lab Integration:**
- "Publish to Research Stage" button in workspace
- Save workspace state with research object
- Link back to reproduce analysis
- Export charts/tables to research content

**Derivatives Lab Integration:**
- Publish strategy analyses
- Include P&L diagrams
- Attach Greeks calculations
- Link to chain data

### With Authentication
- Supabase auth user_id → researcher_profile
- Tier-based feature gates
- Permission checks via RLS
- Profile creation on first publish

## Design System

### Colors
- **Primary Blue** - Trust, institution (#2563eb)
- **Amber** - Insight, discovery (#f59e0b)
- **Violet** - Analysis, depth (#7c3aed)
- **Emerald** - Communication (#10b981)
- **Zinc** - Structure, clarity (#71717a)

### Typography
- **Headers** - Bold, authoritative
- **Body** - Readable, academic (leading-relaxed)
- **Data** - Monospace, precise (font-mono)

### Components
- Rounded corners (rounded-xl)
- Subtle borders (border-zinc-200)
- Shadow on hover (hover:shadow-md)
- Smooth transitions (transition-all)

## UX Language

### Terminology
- "Publish" not "Post"
- "Research Object" not "Content"
- "Discussion" not "Comments"
- "Attribution" not "Referral"
- "Contributor" not "User"

### Tone
- Academic but accessible
- Rigorous but clear
- Institution-like but modern
- Structured but inviting

## Testing Checklist

### Functional
- [ ] Create researcher profile
- [ ] Publish research object
- [ ] View research object page
- [ ] Create discussion
- [ ] Reply to discussion
- [ ] Generate referral link
- [ ] Track attribution
- [ ] Browse research
- [ ] Filter by topic
- [ ] Search research
- [ ] Create collection
- [ ] Cite research
- [ ] View profile
- [ ] Check tier progression

### Design
- [ ] Responsive on mobile
- [ ] Accessible (ARIA labels)
- [ ] Loading states
- [ ] Error handling
- [ ] Empty states
- [ ] Success messages

### Performance
- [ ] Optimistic updates
- [ ] Pagination
- [ ] Lazy loading
- [ ] Image optimization
- [ ] Query caching

## Deployment Steps

1. **Run Database Migration**
   ```bash
   # In Supabase Dashboard, run:
   supabase_schema_research_stage.sql
   ```

2. **Environment Variables** (none needed for now)

3. **Deploy to Vercel**
   ```bash
   git add .
   git commit -m "Add Research Stage"
   git push
   ```

4. **Test in Production**
   - Create test researcher profile
   - Publish test research object
   - Verify all pages render

## Success Metrics

Track these (not typical engagement metrics):
- Published research objects per month
- Discussion depth (replies per discussion)
- Attribution chains formed
- Replications attempted
- Cross-researcher citations
- Tier progression rate

## Cultural Norms Established

The platform establishes norms through design:
- Questions > Opinions
- Methods > Conclusions
- Attribution > Promotion
- Structure > Noise

## Future Enhancements

### Long-term Features
- API for programmatic access
- Institution pages (multi-author)
- Team workspaces
- White-label options
- Embeddable charts
- Citation graphs
- Replication verification
- Peer review system
- Journal-style publishing

### Advanced Features
- LaTeX support
- Code notebook integration
- Data attachments
- Version control
- Change tracking
- Collaborative editing

## Support & Documentation

For questions about implementation:
1. See `RESEARCH_STAGE_VISION.md` for philosophy
2. See `supabase_schema_research_stage.sql` for data model
3. See `src/types/research.ts` for type definitions
4. See component files for UI patterns

## Conclusion

The Research Stage transforms Auster from analytical tools into a public research institution. This implementation provides the foundation for:
- Permanent public artifacts
- Transparent methods
- Attribution-based growth
- Structured discussion
- Merit-based propagation

This is where serious analytical work lives—and where it is challenged, extended, and shared.
