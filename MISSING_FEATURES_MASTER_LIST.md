# Missing Features - Complete Master List
**Date:** 2026-01-13
**Purpose:** Comprehensive list of all features documented but not implemented
**Priority:** To be implemented based on user needs

---

## CRITICAL - Documented as "Complete" but DON'T EXIST ❌

### 1. Advanced Derivatives Features (ADVANCED_FEATURES_COMPLETE.md)
**Document Claims:** "✅ All Features Implemented!"
**Reality:** 0% implemented

#### 1.1 Risk Graph Component ❌
**File Claimed:** `src/components/derivatives/shared/RiskGraph.tsx`
**Status:** Does not exist

**Features Documented:**
- Black-Scholes option pricing model
- P&L curve at expiration (green line)
- P&L curve before expiration (orange dashed line)
- Theta decay visualization
- Interactive sliders (price and days)
- Real-time P&L calculation
- Max profit/loss/breakeven display
- Probability of profit estimation

**Usage Documented:**
```tsx
<RiskGraph
  contract={optionContract}
  underlying={stockPrice}
  daysToExpiration={30}
  onClose={() => setShowRiskGraph(false)}
/>
```

**Effort Estimate:** Medium (2-3 days)
**Dependencies:** None (client-side Black-Scholes math)

---

#### 1.2 Watchlist Component ❌
**File Claimed:** `src/components/derivatives/shared/Watchlist.tsx`
**Status:** Does not exist

**Features Documented:**
- Add/remove symbols
- Create custom alerts (IV Rank, Delta, Vol/OI, Price)
- Alerts saved to localStorage (persistent)
- Alert conditions: "above" or "below" threshold
- Triggered alerts highlighted with 🔥
- Browser notification support
- Quick navigation to symbol

**Alert Types:**
1. IV Rank alerts
2. Delta threshold alerts
3. Vol/OI unusual activity alerts
4. Price target alerts

**Usage Documented:**
```tsx
<Watchlist
  onSymbolClick={(symbol) => {
    setSymbol(symbol);
    setActiveTab("chain");
  }}
/>
```

**Effort Estimate:** Medium (2-3 days)
**Dependencies:** None (localStorage + browser notifications)

---

#### 1.3 Vol Term Structure Component ❌
**File Claimed:** `src/components/derivatives/chain/VolTermStructure.tsx`
**Status:** Does not exist

**Features Documented:**
- Fetches IV across all expirations
- Visual curve chart showing IV term structure
- Identifies contango vs. backwardation
- Put/call skew analysis
- Trading opportunity suggestions
- Data table with IV for each expiration

**Key Insights Documented:**
- Contango detection (back-month IV > front-month)
- Backwardation detection (front-month IV > back-month)
- High put skew identification

**Usage Documented:**
```tsx
<VolTermStructure symbol={symbol} />
```

**Effort Estimate:** Medium (2-3 days)
**Dependencies:** API calls to fetch multiple expirations

---

#### 1.4 Backtesting Engine Component ❌
**File Claimed:** `src/components/derivatives/shared/BacktestEngine.tsx`
**Status:** Does not exist

**Features Documented:**
- Monte Carlo simulation (100-5000 runs)
- Customizable parameters (days to hold, volatility, initial price)
- Performance metrics:
  - Win rate (% profitable trades)
  - Profit factor (wins/losses ratio)
  - Total P&L
  - Sharpe ratio (risk-adjusted return)
  - Max drawdown (largest loss)
  - Average win/loss
- Interpretation guide
- Visual results display

**Usage Documented:**
```tsx
<BacktestEngine
  symbol={symbol}
  strike={contract.strike}
  type={contract.type}
  onClose={() => setShowBacktest(false)}
/>
```

**Effort Estimate:** High (4-5 days)
**Dependencies:** Web Worker for heavy computation

---

#### 1.5 Auto-Hedging Suggestions Component ❌
**File Claimed:** `src/components/derivatives/shared/HedgeSuggestions.tsx`
**Status:** Does not exist

**Features Documented:**
- Three hedging goals:
  1. Downside Protection (protective puts, collars, put spreads)
  2. Delta Neutral (short calls, long puts)
  3. Minimize Cost (far OTM puts, covered calls)

**For Each Suggestion:**
- Action to take
- Cost (+ means you receive money, - means you pay)
- Protection level
- New Greeks (delta, gamma)
- Pros and cons

**Hedge Types Documented:**
- Protective Put
- Collar
- Put Spread
- Covered Call
- Far OTM Put

**Usage Documented:**
```tsx
<HedgeSuggestions
  symbol={symbol}
  currentPrice={stockPrice}
  position={{
    type: "stock",
    quantity: 100,
  }}
  onClose={() => setShowHedge(false)}
/>
```

**Effort Estimate:** High (5-7 days)
**Dependencies:** Complex options strategy logic

---

### 2. Derivatives Supporting Components (ADVANCED_FEATURES_IMPLEMENTED.md)
**Document Claims:** Some as "✅ Implemented"

#### 2.1 Greeks Tooltip Component ⚠️ STATUS UNKNOWN
**File Claimed:** `src/components/derivatives/shared/GreeksTooltip.tsx`
**Status:** Need to verify if exists

**Features Documented:**
- Hover over any Bid/Ask price
- Shows all 5 Greeks (Delta, Gamma, Theta, Vega, Rho)
- Educational descriptions for each Greek
- Implied Volatility
- Mid price calculation
- Break-even price
- Volume and Open Interest
- Vol/OI Ratio with unusual activity detection
- 🔥 Fire icon when Vol/OI > 1

**Action Required:** Verify if this component exists

---

#### 2.2 OI Heatmap Component ⚠️ STATUS UNKNOWN
**File Claimed:** `src/components/derivatives/chain/OIHeatmap.tsx`
**Status:** Need to verify if exists

**Features Documented:**
- Visual bar chart showing OI concentration
- Green bars (left) = Call OI
- Red bars (right) = Put OI
- Bar length = relative open interest
- Yellow highlight = ATM strikes
- Fire icons = Unusual activity

**Action Required:** Verify if this component exists

---

## HIGH PRIORITY - Documented as "Implementation" or "Complete"

### 3. Research Stage System (RESEARCH_STAGE_IMPLEMENTATION.md)
**Document Claims:** "Complete Implementation"
**Reality:** Not verified

#### 3.1 Research Stage Pages ⚠️
**Files Claimed:**
- `src/app/(protected)/research/page.tsx`
- `src/app/(protected)/research/ResearchStageClient.tsx`
- `src/app/(protected)/research/publish/page.tsx`
- `src/app/(protected)/research/publish/PublishResearchClient.tsx`
- `src/types/research.ts`

**Features Documented:**
- Research Stage homepage with 3 views (Recent, Topics, Researchers)
- Publishing flow (4-step wizard)
- Research type selection (6 types)
- Title, abstract, topics input
- Methods and assumptions tracking
- Data sources tracking

**Status:** Need to verify if files exist

---

#### 3.2 Research Stage API Routes ❌
**Files Claimed:**
```
/api/research/objects/create
/api/research/objects/list
/api/research/objects/[id]
/api/research/profiles/create
/api/research/profiles/[slug]
/api/research/discussions/create
/api/research/discussions/list
/api/research/citations/create
/api/research/citations/graph
```

**Status:** Not created according to document
**Priority:** Required if Research Stage pages exist

---

#### 3.3 Research Stage Database Schema ⚠️
**File Claimed:** `supabase_schema_research_stage.sql`
**Tables Documented:**
1. researcher_profiles
2. research_objects
3. discussions
4. referrals
5. citations
6. collections
7. collection_memberships
8. researcher_activity

**Status:** Need to verify if schema exists

---

### 4. Session Save System (SESSION_SAVE_IMPLEMENTATION.md)
**Document Title:** "Session Save Implementation Plan"
**Reality:** Planning document, not implemented

#### 4.1 Unsaved Work Detection ❌
**Features Documented:**
- Track "dirty" state in each lab
- Detect unsaved changes
- Navigate intercept using router events
- beforeunload event handling

**Files Claimed:**
- Reusable hook: `useUnsavedChangesWarning`

**Status:** Not implemented

---

#### 4.2 Save Work Dialog ❌
**File Claimed:** `src/components/SaveWorkDialog.tsx`
**Status:** Does not exist

**Features Documented:**
- Dialog component for save prompts
- Save to project
- Discard changes
- Cancel navigation
- Work types: strategy, screener, positions, analysis

**Status:** Not implemented

---

#### 4.3 Session Save Integration ❌
**Locations Documented:**
- Derivatives Lab Builder Tab
- Derivatives Lab Screeners Tab
- Derivatives Lab Positions Tab
- Econ Lab analysis work

**Status:** Not implemented in any tab

---

### 5. Econ Lab Features (ECON_LAB_REDESIGN.md)
**Document Claims:** "✅ Complete"
**Reality:** Need verification

#### 5.1 Econ Lab Research Workflow ⚠️
**Documented Structure:**
1. **Explore** - Discover economic reality
   - Labs: Macro Research, Inequality & Disparities, Labor Market
2. **Structure** - Model relationships
   - Labs: Econometrics
3. **Test** - Validate findings
   - Labs: Micro Research
4. **Communicate** - Share insights
   - Integration with Research Stage

**Status:** Need to verify if redesign was actually applied to pages

---

## MEDIUM PRIORITY - Integration & Enhancement

### 6. Missing Component Integrations (ADVANCED_FEATURES_COMPLETE.md)
**Documented but Not Integrated:**

#### 6.1 Watchlist Tab in Derivatives Lab ❌
**Integration Documented:**
```tsx
// Add to DerivativesClient.tsx
const tabs = [
  // ... existing tabs
  { id: "watchlist", name: "Watchlist", icon: "⭐", description: "Saved symbols with alerts" },
];

{activeTab === "watchlist" && (
  <Watchlist onSymbolClick={(symbol) => { ... }} />
)}
```

**Status:** Not integrated (even if component existed)

---

#### 6.2 Vol Term Structure in ChainTab ❌
**Integration Documented:**
```tsx
// Add to ChainTab.tsx
import VolTermStructure from "./VolTermStructure";
// Add after IVSmileChart
<VolTermStructure symbol={symbol} />
```

**Status:** Not integrated (component doesn't exist)

---

#### 6.3 Risk Graph Modal in ChainTable ❌
**Integration Documented:**
- Add buttons to open Risk Graph when clicking on contracts
- Modal opens with risk graph
- Close handler

**Status:** Not integrated (component doesn't exist)

---

#### 6.4 Action Buttons in Greeks Tooltip ❌
**Integration Documented:**
```tsx
// At bottom of tooltip
<div className="mt-3 flex gap-2">
  <button onClick={() => showRiskGraph()}>Risk Graph</button>
  <button onClick={() => showBacktest()}>Backtest</button>
  <button onClick={() => showHedge()}>Hedge</button>
</div>
```

**Status:** Not integrated (components don't exist)

---

## LOW PRIORITY - Nice-to-Have Features

### 7. Historical IV Analysis (ADVANCED_FEATURES_IMPLEMENTED.md)
**Status:** Documented as "Roadmap"

**Features:**
- IV percentile chart (current IV vs. 30/60/90 day range)
- "IV Rank" metric (0-100 scale)
- Alert when IV is in extreme percentiles (>80 or <20)
- Historical IV chart overlaid on price action

**Blocker:** Requires Polygon Advanced plan ($99/mo) or alternative data source
**Alternative:** Use historical stock volatility as proxy

---

### 8. Enhanced Features (Various docs)

#### 8.1 Email Verification Status ❌
**Document:** SETTINGS_SYSTEM.md Phase 2
**Feature:** Display email verification status in settings
**Status:** Not implemented

#### 8.2 Two-Factor Authentication ❌
**Document:** SETTINGS_SYSTEM.md Phase 2
**Feature:** 2FA for account security
**Status:** Not implemented

#### 8.3 API Key Management ❌
**Document:** SETTINGS_SYSTEM.md Phase 2
**Feature:** Generate and manage API keys for developers
**Status:** Not implemented

#### 8.4 Session History ❌
**Document:** SETTINGS_SYSTEM.md Phase 2
**Feature:** View session history with IP addresses and devices
**Status:** Not implemented

#### 8.5 Export Account Data ❌
**Document:** SETTINGS_SYSTEM.md Phase 2
**Feature:** Export all account data (GDPR compliance)
**Status:** Not implemented

#### 8.6 Account Activity Log ❌
**Document:** SETTINGS_SYSTEM.md Phase 2
**Feature:** View all account activities
**Status:** Not implemented

#### 8.7 Profile Picture Upload ❌
**Document:** SETTINGS_SYSTEM.md Phase 3
**Feature:** Upload and manage profile picture
**Status:** Not implemented

#### 8.8 Display Name Customization ❌
**Document:** SETTINGS_SYSTEM.md Phase 3
**Feature:** Set custom display name
**Status:** Not implemented

#### 8.9 Theme Toggle ❌
**Document:** SETTINGS_SYSTEM.md Phase 3
**Feature:** Dark/light theme toggle
**Status:** Not implemented

---

## INFRASTRUCTURE - May Already Exist

### 9. Gateway System (GATEWAY_COMPLETE.md)
**Document Claims:** "Implementation Complete ✅"
**Status:** Need verification

**Files Claimed:**
```
src/lib/market-data/
├── types.ts
├── gateway.ts
├── cache/
│   ├── index.ts
│   ├── interface.ts
│   ├── memory-cache.ts
│   └── redis-cache.ts
└── providers/
    └── massive-provider.ts
```

**Features Documented:**
- Provider Abstraction
- Request Coalescing
- Redis Caching
- Chain Windowing

**Action Required:** Verify these files exist and are being used

---

## VERIFICATION NEEDED

### 10. Components Claimed to Exist (Need Manual Check)

**From ADVANCED_FEATURES_IMPLEMENTED.md:**
- `GreeksTooltip.tsx` - ⚠️ Need to check
- `OIHeatmap.tsx` - ⚠️ Need to check

**From DERIVATIVES_LAB_IMPLEMENTATION.md (Core Features):**
All these are verified to exist ✅:
- ChainTab, ChainTable, QuoteHeader, ExpirationPicker, IVSmileChart
- BuilderTab, StrategyTemplates, StrategyWizard, etc.
- All screener components

---

## SUMMARY BY CATEGORY

### ❌ Confirmed Missing (Must Build):
1. **Risk Graph Component** - 0% exists
2. **Watchlist Component** - 0% exists
3. **Vol Term Structure Component** - 0% exists
4. **Backtesting Engine Component** - 0% exists
5. **Auto-Hedging Suggestions Component** - 0% exists
6. **Session Save System** - 0% exists
7. **Save Work Dialog** - 0% exists

**Total:** 7 major features documented but completely missing

---

### ⚠️ Needs Verification:
1. **Greeks Tooltip Component** - Check if exists
2. **OI Heatmap Component** - Check if exists
3. **Research Stage System** (pages, types, API routes)
4. **Gateway System** (lib files)
5. **Econ Lab Redesign** (verify if applied)

**Total:** 5 systems need file existence checks

---

### 📋 Lower Priority (Phase 2/3):
1. Email verification display
2. Two-factor authentication
3. API key management
4. Session history
5. Export account data
6. Account activity log
7. Profile picture upload
8. Display name customization
9. Dark/light theme toggle

**Total:** 9 enhancement features

---

## EFFORT ESTIMATES

### Quick Wins (1-2 days each):
- Watchlist Component (localStorage + notifications)
- Session Save Dialog Component

### Medium Effort (2-3 days each):
- Risk Graph Component
- Vol Term Structure Component
- Greeks Tooltip (if missing)
- OI Heatmap (if missing)

### High Effort (4-7 days each):
- Backtesting Engine (Monte Carlo simulation)
- Auto-Hedging Suggestions (complex strategy logic)
- Research Stage System (if missing)

### Total Estimated Effort:
- Minimum: 7 days (if only building the 5 advanced components)
- Maximum: 30+ days (if building everything including Research Stage and enhancements)

---

## RECOMMENDATIONS

### Immediate Actions:
1. ✅ **Verify existence** of components marked ⚠️
2. ✅ **Fix documentation** - Rename ADVANCED_FEATURES_COMPLETE.md to indicate these are planned, not complete
3. ✅ **Prioritize with user** - Which features are actually needed?

### Build Priority (if implementing):
**Tier 1 (High Value, Medium Effort):**
1. Watchlist with Alerts - Most requested, reasonable effort
2. Risk Graph - Visual appeal, client-side only
3. Session Save System - Prevents user frustration

**Tier 2 (High Value, High Effort):**
4. Vol Term Structure - Professional feature
5. Backtesting Engine - Advanced users want this

**Tier 3 (Advanced):**
6. Auto-Hedging Suggestions - Complex, requires strategy expertise

---

## CONCLUSION

**Critical Finding:**
- **5 major components** documented as "complete" but **0% exist**
- At least **7 major features** documented but completely missing
- **5 systems** need verification to determine if they exist
- Documentation accuracy for "advanced features" is **0%**

**Impact:**
- Users reading ADVANCED_FEATURES_COMPLETE.md will believe features exist
- Developers trying to use these components will get import errors
- Time wasted debugging non-existent features

**Action Required:**
1. User must decide which features to actually build
2. Update documentation to reflect reality
3. Create proper roadmap document for planned features
4. Implement based on user priorities

---

**Report Created:** 2026-01-13
**Method:** Systematic review of all .md files modified in last 30 hours
**Files Reviewed:** 30 documentation files
**Missing Features Found:** 7+ major features
**Status:** Ready for user prioritization
