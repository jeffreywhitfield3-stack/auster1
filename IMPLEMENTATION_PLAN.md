# Implementation Plan: Advanced Features

## Overview
This document outlines the implementation of:
1. **BLS Integration** (Bureau of Labor Statistics)
2. **OECD International Data**
3. **Greeks Calculator & Hedging Tool**
4. **Synthetic Position Builder**
5. **Open Interest & Volume Analysis**
6. **Earnings Move Analysis**
7. **Research Workspaces & Public Pages**

---

## 1. BLS Integration (Econ Lab)

### API Configuration
```typescript
// .env.local
BLS_API_KEY=cfe5b3a70cce4a518588c81f898e4130
```

### Endpoint Structure
```
POST https://api.bls.gov/publicAPI/v2/timeseries/data/
```

### Key Series IDs
```typescript
const BLS_SERIES = {
  // Employment
  unemploymentRate: 'LNS14000000',           // Unemployment Rate
  laborForceParticipation: 'LNS11300000',   // Labor Force Participation Rate
  employmentPopRatio: 'LNS12300000',         // Employment-Population Ratio

  // Wages
  avgHourlyEarnings: 'CES0500000003',        // Average Hourly Earnings
  avgWeeklyEarnings: 'CES0500000011',        // Average Weekly Earnings

  // CPI Components
  cpiAllItems: 'CUUR0000SA0',                // CPI All Items
  cpiFood: 'CUUR0000SAF1',                   // CPI Food
  cpiEnergy: 'CUUR0000SA0E',                 // CPI Energy
  cpiHousing: 'CUUR0000SAH',                 // CPI Housing

  // Industry Employment
  manufacturingJobs: 'CES3000000001',        // Manufacturing Employment
  retailJobs: 'CES4200000001',               // Retail Employment
  techJobs: 'CES5051000001',                 // Information Technology Employment
};
```

### New Lab Section: `/products/econ/labor`
**Features:**
- Employment trends by sector
- Wage growth analysis
- Labor force participation trends
- Phillips Curve explorer (unemployment vs inflation)

### API Route: `/api/econ/bls/series`
```typescript
// Query params: series_id, start_year, end_year
// Returns: [{year, period, value, footnotes}]
```

---

## 2. OECD International Data

### API Configuration
```
Base URL: https://sdmx.oecd.org/public/rest/data/
No API key required (public access)
```

### Key Datasets
```typescript
const OECD_DATASETS = {
  gdp: 'QNA',              // Quarterly National Accounts
  prices: 'MEI_PRICES',    // Main Economic Indicators - Prices
  unemp: 'MIG',            // Migration and Labour Market
  gini: 'IDD',             // Income Distribution Database
  health: 'HEALTH_STAT',   // Health Statistics
};
```

### Example Query
```
GET https://sdmx.oecd.org/public/rest/data/OECD.SDD.NAD,DSD_NAMAIN1@DF_QNA_EXPENDITURE_CAPITA,1.0/USA+GBR+DEU.Q.B1GQ.....?startPeriod=2020-Q1
```

### New Lab Section: `/products/econ/international`
**Features:**
- Country comparison charts
- US vs Europe vs Asia macro trends
- International inequality analysis
- Cross-country policy effectiveness

### API Route: `/api/econ/oecd/indicator`
```typescript
// Query params: indicator, countries[], start_date, end_date
// Returns: [{country, date, value}]
```

---

## 3. Greeks Calculator & Hedging Tool (Derivatives Lab)

### Data Source
**Polygon.io Massive Plan** provides:
- Real-time options data
- Greeks (delta, gamma, theta, vega)
- Implied volatility
- Historical options prices

### Endpoint
```
GET https://api.polygon.io/v3/snapshot/options/{underlyingAsset}
```

### Features to Build

#### A. Position Greeks Dashboard
**Route:** `/products/derivatives/greeks`

**Display:**
- Portfolio-level Greeks (sum of all positions)
- Individual position Greeks
- Delta-neutral suggestions
- Gamma/theta trade-off analysis

#### B. Hedging Suggestions
- **Delta hedging:** Calculate shares needed to neutralize delta
- **Gamma hedging:** Suggest options to add for gamma neutrality
- **Vega hedging:** Cross-expiry vol hedging strategies

#### C. Greeks Simulator
- Adjust underlying price, time, volatility
- See real-time impact on position value
- Break-even analysis

### New Components
```
src/app/(protected)/products/derivatives/greeks/
├── page.tsx
├── GreeksClient.tsx
├── components/
│   ├── PositionGreeksTable.tsx
│   ├── PortfolioGreeksCard.tsx
│   ├── HedgingSuggestions.tsx
│   └── GreeksSimulator.tsx
```

### API Routes
```
/api/derivatives/greeks/position    - Calculate Greeks for position
/api/derivatives/greeks/portfolio   - Aggregate portfolio Greeks
/api/derivatives/greeks/hedge       - Generate hedging suggestions
```

---

## 4. Synthetic Position Builder

### Concept
Create synthetic positions using put-call parity:
- **Synthetic Long:** Long Call + Short Put = Long Stock
- **Synthetic Short:** Short Call + Long Put = Short Stock
- **Synthetic Call:** Long Stock + Long Put = Long Call
- **Synthetic Put:** Short Stock + Long Call = Long Put

### Features
**Route:** `/products/derivatives/synthetic`

- Input: Desired position (long stock, short stock, etc.)
- Output: Multiple synthetic alternatives
- Comparison table:
  - Capital required
  - Margin requirements
  - Dividend exposure
  - Assignment risk
  - Cost comparison

### Calculator Logic
```typescript
function calculateSyntheticLong(strike: number, callPrice: number, putPrice: number) {
  const syntheticCost = callPrice - putPrice;
  const stockCost = strike;
  const savings = stockCost - syntheticCost;
  const leverage = stockCost / Math.abs(syntheticCost);

  return {
    syntheticCost,
    stockCost,
    savings,
    leverage,
    marginRequired: calculateMargin(strike, putPrice),
  };
}
```

---

## 5. Open Interest & Volume Analysis

### Data Source
**Polygon.io** provides:
- Open interest by strike/expiry
- Daily volume
- Greeks
- Bid/ask spreads

### Endpoint
```
GET https://api.polygon.io/v3/snapshot/options/{underlyingAsset}/{optionContract}
```

### Features
**Route:** `/products/derivatives/oi-analysis`

#### A. Max Pain Calculator
- Calculate price where most options expire worthless
- Visualize OI concentration

#### B. Gamma Exposure Levels
- Net gamma by strike
- Identify "gamma walls"
- Market maker positioning

#### C. Put/Call Ratio Trends
- Historical P/C ratio
- Sentiment indicator
- Compare to historical levels

#### D. Unusual Options Activity
- Large OI changes
- Volume > 2x avg volume
- Directional bets identification

### Visualization
```typescript
<BarChart data={oiByStrike}>
  <Bar dataKey="callOI" fill="#10b981" />
  <Bar dataKey="putOI" fill="#ef4444" />
  <Line dataKey="maxPain" stroke="#f59e0b" />
</BarChart>
```

---

## 6. Earnings Move Analysis

### Data Sources
1. **Polygon**: Historical stock prices, options IV
2. **Your database**: Track earnings events

### Features
**Route:** `/products/derivatives/earnings`

#### A. Historical Earnings Moves
- Last 8 quarters actual moves
- Current quarter implied move
- Beat rate vs move direction
- Expected move accuracy (implied vs realized)

#### B. Earnings Strategy Analyzer
- Straddle profitability
- Strangle positioning
- Iron condor around earnings
- Calendar spread opportunities

#### C. Earnings Calendar Integration
- Upcoming earnings with IV rank
- Historical move patterns
- Implied move vs historical average

### Algorithm
```typescript
function calculateEarningsMove(
  preEarningsPrice: number,
  postEarningsPrice: number
): number {
  return ((postEarningsPrice - preEarningsPrice) / preEarningsPrice) * 100;
}

function calculateImpliedMove(
  atmCallPrice: number,
  atmPutPrice: number,
  stockPrice: number
): number {
  const straddle = atmCallPrice + atmPutPrice;
  return (straddle / stockPrice) * 100;
}
```

### Backtest Feature
```typescript
// Compare historical implied moves vs actual moves
function analyzeEarningsAccuracy(symbol: string, lookback: number = 8) {
  const events = getEarningsHistory(symbol, lookback);

  return events.map(event => ({
    date: event.date,
    impliedMove: event.impliedMove,
    actualMove: event.actualMove,
    accuracy: (1 - Math.abs(event.impliedMove - event.actualMove) / event.impliedMove) * 100,
    profitable: event.actualMove > event.impliedMove,
  }));
}
```

---

## 7. Research Workspaces & Public Pages

### Architecture

#### A. Workspace System
**Purpose:** Save and version control analyses

**Features:**
- Save current analysis state (charts, parameters, results)
- Add notes and annotations
- Version history
- Return to past work
- Fork others' public workspaces

**Routes:**
```
/app/workspaces              - My workspaces list
/app/workspaces/new          - Create new workspace
/app/workspaces/{id}         - Edit workspace
/app/workspaces/{id}/history - Version history
```

#### B. Public Research Pages
**Purpose:** Publish and share research findings

**Features:**
- Public URL: `/research/{username}/{slug}`
- Embedded interactive charts
- Methodology section
- Comments and discussion
- Star/like system
- Fork to own workspace

**Routes:**
```
/research                    - Browse public research
/research/{username}         - User's research profile
/research/{username}/{slug}  - Individual research page
```

#### C. Relationship to Blog
**Blog vs Research Pages:**

| Blog | Research Pages |
|------|----------------|
| Long-form narrative | Interactive analysis |
| Written content | Live charts & data |
| Static (Markdown) | Dynamic (saved workspace) |
| General audience | Technical audience |
| SEO-focused | Discovery-focused |

**No Conflict:** They serve different purposes
- Blog: Thought leadership, tutorials, announcements
- Research: Reproducible analysis, data-driven findings

### State Management
Each workspace stores:
```typescript
interface WorkspaceState {
  // Econ Lab state
  econometrics?: {
    datasetId: string;
    xVariable: string;
    yVariable: string;
    regressionResults: OLSResults;
  };

  inequality?: {
    year: number;
    metric: string;
    chartType: string;
  };

  macro?: {
    seriesId: string;
    dateRange: [string, string];
  };

  // Derivatives Lab state
  derivatives?: {
    symbol: string;
    positions: Position[];
    strategyType: string;
    greeks: Greeks;
  };

  // Shared metadata
  charts: ChartConfig[];
  notes: Note[];
  tags: string[];
}
```

### Publishing Flow
```
1. User creates analysis in any lab
2. Clicks "Save as Workspace"
3. Adds title, description, notes
4. (Optional) Clicks "Make Public"
5. System generates slug from title
6. Public URL becomes shareable
7. Others can view, comment, fork
```

---

## Implementation Priority

### Phase 1 (Week 1-2)
1. ✅ **BLS Integration** - High impact, easy implementation
2. ✅ **Greeks Calculator** - Core derivatives feature
3. ✅ **Synthetic Position Builder** - Quick win

### Phase 2 (Week 3-4)
4. ✅ **Open Interest Analysis** - Polygon data already available
5. ✅ **Earnings Move Analysis** - Unique differentiator
6. ✅ **OECD Integration** - International data

### Phase 3 (Week 5-8)
7. ✅ **Research Workspaces** - Foundation for long-term vision
8. ✅ **Public Research Pages** - Community & discovery

---

## Technical Stack

### New Dependencies
```json
{
  "@supabase/supabase-js": "^2.89.0",  // Already installed
  "recharts": "^3.6.0",                 // Already installed
  "d3-format": "^3.1.0",                // Already installed
  "react-hook-form": "^7.50.0",         // For forms (optional)
  "zod": "^4.3.4"                       // Already installed
}
```

### API Routes Structure
```
/api/econ/
  ├── bls/series
  ├── oecd/indicator
/api/derivatives/
  ├── greeks/position
  ├── greeks/portfolio
  ├── synthetic/calculator
  ├── oi/snapshot
  ├── oi/gamma-exposure
  ├── earnings/history
  ├── earnings/implied-move
/api/workspaces/
  ├── create
  ├── update
  ├── publish
  ├── fork
  ├── list
/api/research/
  ├── public
  ├── user/{username}
  ├── {username}/{slug}
```

---

## Database Migration Steps

1. **Run Supabase Schema**
```bash
# Copy supabase_schema_research.sql to Supabase SQL Editor
# Execute all statements
```

2. **Create Indexes**
Already included in schema file

3. **Set up RLS Policies**
Already included in schema file

4. **Test Data Access**
```sql
-- Test workspace creation
INSERT INTO workspaces (user_id, title, lab_type, state)
VALUES (auth.uid(), 'Test Workspace', 'econ', '{}');

-- Test position tracking
INSERT INTO derivatives_positions (user_id, symbol, strategy_type, legs, entry_date)
VALUES (auth.uid(), 'AAPL', 'long_call', '[{"type":"call","strike":150,"expiry":"2024-03-15","quantity":1}]', '2024-01-01');
```

---

## Environment Variables Needed

```bash
# .env.local

# Existing
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
FRED_API_KEY=...

# New
BLS_API_KEY=cfe5b3a70cce4a518588c81f898e4130
POLYGON_API_KEY=...  # Your existing Polygon key

# Optional
OECD_API_URL=https://sdmx.oecd.org/public/rest/data/
```

---

## Success Metrics

### Feature Adoption
- Workspaces created per user
- Public research pages published
- Greeks calculator usage
- Earnings analysis views

### Engagement
- Time spent in labs
- Charts generated
- Positions tracked
- Comments on public research

### Platform Health
- API response times < 500ms
- Database queries < 100ms
- Chart render time < 1s
- Zero data loss

---

## Next Steps

Ready to implement? I recommend starting with:

1. **Run the Supabase schema** first
2. **Add BLS integration** to Econ Lab (quick win)
3. **Build Greeks Calculator** for Derivatives Lab
4. **Then tackle workspaces** as the foundation for everything else

Would you like me to start implementing any of these features?
