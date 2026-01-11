# Derivatives Lab - Complete Build Plan

## 🎯 Objective
Build a complete, production-ready Derivatives Lab with 5 tabs following the DERIVATIVES-LAB-VISION.md blueprint.

---

## 📦 Phase 1: Foundation & Shared Components (Priority 1)

### A. Types & Utilities
**File:** `src/types/derivatives.ts`
- OptionContract type
- OptionChain type
- Strategy types (vertical, iron condor, butterfly, etc.)
- Position types
- Event types (earnings, economic)
- Anomaly types

**File:** `src/lib/derivatives/calculations.ts`
- Max profit/loss calculations
- Breakeven calculations
- Greeks calculations (delta, gamma, theta, vega)
- POP (probability of profit) estimation
- Return on risk calculations

**File:** `src/lib/derivatives/formatting.ts`
- Price formatting
- Percentage formatting
- Date formatting
- Greeks formatting

### B. Shared UI Components
**File:** `src/components/derivatives/shared/LiquidityBadge.tsx`
- Color-coded liquidity indicator (green/yellow/red)
- Based on OI, volume, spread

**File:** `src/components/derivatives/shared/GreeksDisplay.tsx`
- Delta, Gamma, Theta, Vega display
- Collapsible/expandable
- Tooltips for education

**File:** `src/components/derivatives/shared/PayoffChart.tsx`
- P/L diagram at expiration
- Breakevens marked
- Current price indicator

**File:** `src/components/derivatives/shared/HeatmapChart.tsx`
- Price vs Time P/L visualization
- Color gradient (red to green)

---

## 📦 Phase 2: Tab 1 - Chain (Priority 2)

### Components
**File:** `src/components/derivatives/chain/ChainTable.tsx`
- Calls/Puts side-by-side
- Liquidity highlighting
- Click to add to Builder tray
- Delta range filter
- Weekly/monthly toggle

**File:** `src/components/derivatives/chain/IVSmileChart.tsx`
- Implied volatility smile visualization
- Strike price on X-axis, IV on Y-axis

**File:** `src/components/derivatives/chain/QuoteHeader.tsx`
- Underlying price + change
- IV Rank
- Next earnings date
- Event risk warnings

**File:** `src/components/derivatives/chain/ExpirationPicker.tsx`
- No typing dates (button grid)
- DTE calculation
- Weekly vs monthly filtering

---

## 📦 Phase 3: Tab 2 - Strategy Builder (Priority 3)

### Components
**File:** `src/components/derivatives/builder/StrategyTemplates.tsx`
- Template cards (Vertical, Iron Condor, Butterfly, etc.)
- One-click setup
- Template wizard (3 questions)

**File:** `src/components/derivatives/builder/LegsList.tsx`
- Current strategy legs
- Drag to reorder
- Swipe to delete
- Edit quantity
- Flip buy/sell

**File:** `src/components/derivatives/builder/StrategyAnalysis.tsx`
- Auto-calculated metrics:
  - Max profit / Max loss
  - Breakevens
  - Margin estimate
  - Return on risk
  - POP estimate
  - Theta/day
  - Vega exposure

**File:** `src/components/derivatives/builder/BuilderTray.tsx`
- Right-side collapsible panel
- Strategy summary
- Add leg button
- Save/Clear actions

**File:** `src/components/derivatives/builder/StrategyWizard.tsx`
- 3-step wizard:
  1. Direction (Bullish/Bearish/Neutral)
  2. Risk tolerance (Conservative/Moderate/Aggressive)
  3. Time horizon (7-14d / 30-45d / 60d+)
- Auto-suggests strategies

---

## 📦 Phase 4: Tab 3 - Screeners (Priority 4)

### Components
**File:** `src/components/derivatives/screeners/IronCondorScreener.tsx`
- Filters: DTE, Min POP, Max capital, Liquidity
- Results table with ranking
- Safety scores (1-5 stars)
- [Build] button to load into Strategy Builder

**File:** `src/components/derivatives/screeners/AnomalyDetectionScreener.tsx`
- **NEW:** Polygon's anomaly detection
- Scans popular tickers for volume spikes
- Z-score ranking
- Price change correlation
- [Analyze] button to see options chain

**File:** `src/components/derivatives/screeners/DirectionalScreener.tsx`
- Bull call spreads
- Bear put spreads
- Filter by POP, capital, liquidity

**File:** `src/components/derivatives/screeners/VolatilityScreener.tsx`
- High IV opportunities (sell premium)
- Low IV opportunities (buy premium)
- IV rank filtering

**File:** `src/components/derivatives/screeners/ScreenerPresets.tsx`
- Save custom screeners
- One-click run saved presets

---

## 📦 Phase 5: Tab 4 - Events (Priority 5)

### Components
**File:** `src/components/derivatives/events/EarningsCalendar.tsx`
- Next 30 days earnings
- Expected move calculation (from ATM straddle)
- AMC/BMC indicator

**File:** `src/components/derivatives/events/EarningsStrategies.tsx`
- Pre-earnings: Long straddle, Iron condor outside expected move
- Post-earnings: IV crush plays

**File:** `src/components/derivatives/events/EventRiskPanel.tsx`
- Shows in Chain/Builder tabs
- Warning badges
- Expected move overlay

**File:** `src/components/derivatives/events/EconomicEvents.tsx`
- OPTIONAL: FOMC, CPI, NFP
- Market-wide volatility events

---

## 📦 Phase 6: Tab 5 - My Positions (Priority 6)

### Components
**File:** `src/components/derivatives/positions/PositionCard.tsx`
- Individual position display
- Real-time P/L
- Days to expiration
- Greeks summary
- [Adjust] [Close] [Roll] buttons

**File:** `src/components/derivatives/positions/PortfolioSummary.tsx`
- Total P/L today
- Total capital at risk
- Portfolio Greeks (aggregated)
- Buying power remaining

**File:** `src/components/derivatives/positions/PositionAlerts.tsx`
- Approaching breakeven
- 3 days to expiration
- 50% profit target hit

**File:** `src/components/derivatives/positions/TradeHistory.tsx`
- Last 30 days closed positions
- Win rate
- Average return
- Export for taxes

---

## 📦 Phase 7: Integration (Priority 7)

### Main Page
**File:** `src/app/(protected)/products/derivatives/DerivativesClient.tsx`
- Tab navigation (5 tabs)
- Builder tray (collapsible right panel)
- Shared state management
- Usage tracking integration

### API Endpoints (Already Complete)
- ✅ `/api/derivatives/quote`
- ✅ `/api/derivatives/expirations`
- ✅ `/api/derivatives/chain`
- ✅ `/api/derivatives/iron-condor`
- ✅ `/api/derivatives/anomalies` (NEW)
- ✅ `/api/derivatives/screener-anomalies` (NEW)

---

## 📦 Phase 8: Polish & Mobile (Priority 8)

### Mobile Optimization
- Touch-friendly controls
- Swipe gestures
- Responsive breakpoints
- PWA manifest

### Educational Content
- Tooltips on all technical terms
- "First time" onboarding flow
- Strategy guides (modals)

---

## 🔢 Estimation

| Phase | Components | Lines of Code | Time Estimate |
|-------|-----------|---------------|---------------|
| Phase 1 | 7 files | ~800 lines | 2 hours |
| Phase 2 | 4 files | ~600 lines | 2 hours |
| Phase 3 | 5 files | ~800 lines | 3 hours |
| Phase 4 | 5 files | ~700 lines | 3 hours |
| Phase 5 | 4 files | ~500 lines | 2 hours |
| Phase 6 | 4 files | ~600 lines | 2 hours |
| Phase 7 | 1 file | ~400 lines | 1 hour |
| Phase 8 | Various | ~300 lines | 2 hours |
| **TOTAL** | **30 files** | **~4700 lines** | **17 hours** |

---

## 🚀 Execution Strategy

### Option A: Sequential Build (Safe)
Build phase by phase, testing each component

### Option B: Parallel Build (Fast)
Use swarm to build multiple phases simultaneously

### Option C: MVP First (Pragmatic)
Build Phases 1, 2, 4 first (Foundation + Chain + Screeners with anomaly detection)
Then add Phases 3, 5, 6 later

---

## ✅ Success Criteria

- [ ] All 5 tabs functional
- [ ] Mobile responsive
- [ ] Usage tracking integrated
- [ ] Educational tooltips present
- [ ] Anomaly detection working
- [ ] Strategy Builder templates working
- [ ] Iron Condor screener working
- [ ] No TypeScript errors
- [ ] Matches DERIVATIVES-LAB-VISION.md design

---

**Recommendation:** Start with Option C (MVP First) to get core functionality live quickly, then expand.

**Next Step:** Execute Phase 1 (Foundation) to create shared types and utilities that all other phases depend on.
