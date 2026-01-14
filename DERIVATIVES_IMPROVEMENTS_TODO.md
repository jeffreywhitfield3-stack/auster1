# Derivatives Lab Improvements - In Progress

## Completed
- ✅ Added financial disclaimer banner to main Derivatives Lab page
- ✅ Created DisclaimerBanner component

## Remaining Tasks

### 1. Improve Iron Condor Screener Validation
**Issue**: Screener suggests strategies with 0% POP
**Fix Needed**:
- Add minimum POP filter by default (>= 30% minimum)
- Show prominent warning when POP < 40%
- Add data quality indicator showing if IV data is missing
- Filter out strategies where breakevens are too tight (< 2% from spot)
- Add disclaimer directly in Iron Condor screener

### 2. Fix Quick Nav at Bottom
**Issue**: Quick nav buttons don't work
**Location**: Check DerivativesClient.tsx and look for BuilderTray or bottom navigation
**Fix**: Make sure buttons actually trigger tab changes

### 3. Add Strategy Builder to Chain Page
**Current**: Chain page allows contract selection
**Enhancement**: Add "Build Strategy" panel that lets users:
- Select multiple contracts
- Choose strategy type (spread, iron condor, butterfly, etc.)
- See risk graph for custom strategy
- Send to strategy builder

### 4. Add Image Upload to Research Publishing
**Location**: `/src/app/(protected)/research/publish/PublishResearchClient.tsx`
**Implementation**:
- Add image upload field in ContentStep
- Store images in Supabase Storage
- Add image sections to ResearchObjectContent type
- Display images in research view page

### 5. Improve Screener Data Quality
- Add real-time data timestamps
- Show when quotes are stale (> 15 minutes old)
- Add liquidity score indicator
- Show bid-ask spread warnings

## Files to Modify

1. `/src/components/derivatives/screeners/IronCondorScreener.tsx`
   - Add POP validation
   - Add data quality warnings
   - Add disclaimer

2. `/src/lib/derivatives/ironCondor.ts`
   - Improve POP calculation
   - Add validation for tight breakevens
   - Filter unrealistic strategies

3. `/src/components/derivatives/chain/ChainTab.tsx`
   - Add multi-contract selection
   - Add strategy builder panel

4. `/src/app/(protected)/research/publish/PublishResearchClient.tsx`
   - Add image upload
   - Update content model

5. Find and fix quick nav (need to locate the component)
