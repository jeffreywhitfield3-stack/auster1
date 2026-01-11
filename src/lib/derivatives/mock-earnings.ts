// src/lib/derivatives/mock-earnings.ts

export type EarningsEvent = {
  ticker: string;
  companyName: string;
  date: string; // YYYY-MM-DD
  time: "AMC" | "BMC"; // After Market Close / Before Market Close
  currentPrice: number;
  atmStraddle: number; // ATM straddle price
  expectedMove: number; // ATM straddle × 0.85
  expectedMovePct: number; // expectedMove / currentPrice
};

/**
 * Mock earnings data for popular tickers
 * In production, this would come from an API
 */
export const mockEarningsEvents: EarningsEvent[] = [
  {
    ticker: "AAPL",
    companyName: "Apple Inc.",
    date: "2026-01-28",
    time: "AMC",
    currentPrice: 180.5,
    atmStraddle: 10.0,
    expectedMove: 8.5,
    expectedMovePct: 4.71,
  },
  {
    ticker: "MSFT",
    companyName: "Microsoft Corporation",
    date: "2026-01-30",
    time: "AMC",
    currentPrice: 385.2,
    atmStraddle: 14.5,
    expectedMove: 12.33,
    expectedMovePct: 3.2,
  },
  {
    ticker: "GOOGL",
    companyName: "Alphabet Inc.",
    date: "2026-02-04",
    time: "AMC",
    currentPrice: 151.3,
    atmStraddle: 7.3,
    expectedMove: 6.21,
    expectedMovePct: 4.1,
  },
  {
    ticker: "AMZN",
    companyName: "Amazon.com Inc.",
    date: "2026-02-06",
    time: "AMC",
    currentPrice: 178.9,
    atmStraddle: 9.8,
    expectedMove: 8.33,
    expectedMovePct: 4.66,
  },
  {
    ticker: "TSLA",
    companyName: "Tesla Inc.",
    date: "2026-01-22",
    time: "AMC",
    currentPrice: 245.0,
    atmStraddle: 18.5,
    expectedMove: 15.73,
    expectedMovePct: 6.42,
  },
  {
    ticker: "NVDA",
    companyName: "NVIDIA Corporation",
    date: "2026-02-14",
    time: "AMC",
    currentPrice: 520.8,
    atmStraddle: 28.0,
    expectedMove: 23.8,
    expectedMovePct: 4.57,
  },
  {
    ticker: "META",
    companyName: "Meta Platforms Inc.",
    date: "2026-02-01",
    time: "AMC",
    currentPrice: 475.2,
    atmStraddle: 22.5,
    expectedMove: 19.13,
    expectedMovePct: 4.03,
  },
  {
    ticker: "NFLX",
    companyName: "Netflix Inc.",
    date: "2026-01-18",
    time: "AMC",
    currentPrice: 685.4,
    atmStraddle: 42.0,
    expectedMove: 35.7,
    expectedMovePct: 5.21,
  },
  {
    ticker: "AMD",
    companyName: "Advanced Micro Devices",
    date: "2026-01-29",
    time: "AMC",
    currentPrice: 142.3,
    atmStraddle: 9.5,
    expectedMove: 8.08,
    expectedMovePct: 5.68,
  },
  {
    ticker: "BABA",
    companyName: "Alibaba Group",
    date: "2026-02-11",
    time: "BMC",
    currentPrice: 92.5,
    atmStraddle: 6.8,
    expectedMove: 5.78,
    expectedMovePct: 6.25,
  },
];

/**
 * Get earnings event by ticker
 */
export function getEarningsForTicker(ticker: string): EarningsEvent | undefined {
  return mockEarningsEvents.find(
    (e) => e.ticker.toLowerCase() === ticker.toLowerCase()
  );
}

/**
 * Get all earnings events within next N days
 */
export function getUpcomingEarnings(daysAhead = 30): EarningsEvent[] {
  const today = new Date();
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() + daysAhead);

  return mockEarningsEvents
    .filter((e) => {
      const eventDate = new Date(e.date);
      return eventDate >= today && eventDate <= cutoff;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

/**
 * Calculate days until earnings
 */
export function daysUntilEarnings(eventDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const event = new Date(eventDate);
  event.setHours(0, 0, 0, 0);
  const diffTime = event.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Format earnings date for display
 */
export function formatEarningsDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
