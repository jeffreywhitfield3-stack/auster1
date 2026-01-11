// src/lib/derivatives/formatting.ts
// Formatting utilities for derivatives data display

/**
 * Format a number as USD currency.
 * Examples:
 *   1234.56 => "$1,234.56"
 *   -500 => "-$500.00"
 *   0.05 => "$0.05"
 */
export function fmtUSD(value: number | null | undefined, decimals: number = 2): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '--';
  }

  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  return `${sign}$${absValue.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

/**
 * Format a number as a compact USD currency (k/M notation).
 * Examples:
 *   1234 => "$1.2k"
 *   1500000 => "$1.5M"
 *   500 => "$500"
 */
export function fmtUSDCompact(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '--';
  }

  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (absValue >= 1_000_000) {
    return `${sign}$${(absValue / 1_000_000).toFixed(1)}M`;
  } else if (absValue >= 1_000) {
    return `${sign}$${(absValue / 1_000).toFixed(1)}k`;
  } else {
    return `${sign}$${absValue.toFixed(0)}`;
  }
}

/**
 * Format a number as a percentage.
 * Examples:
 *   0.1234 => "12.34%"
 *   -0.05 => "-5.00%"
 *   1.5 => "150.00%"
 */
export function fmtPct(value: number | null | undefined, decimals: number = 2): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '--';
  }

  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format a percentage value that's already in percent form (not decimal).
 * Examples:
 *   12.34 => "12.34%"
 *   -5 => "-5.00%"
 */
export function fmtPctRaw(value: number | null | undefined, decimals: number = 2): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '--';
  }

  return `${value.toFixed(decimals)}%`;
}

/**
 * Format a date string or Date object to human-readable format.
 * Examples:
 *   "2024-03-15" => "Mar 15, 2024"
 *   new Date(2024, 2, 15) => "Mar 15, 2024"
 */
export function fmtDate(
  value: string | Date | null | undefined,
  format: 'short' | 'medium' | 'long' = 'medium'
): string {
  if (!value) return '--';

  try {
    const date = typeof value === 'string' ? new Date(value) : value;

    if (isNaN(date.getTime())) return '--';

    const options: Intl.DateTimeFormatOptions = (() => {
      switch (format) {
        case 'short':
          return { month: 'short', day: 'numeric' };
        case 'long':
          return { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
        default:
          return { year: 'numeric', month: 'short', day: 'numeric' };
      }
    })();

    return date.toLocaleDateString('en-US', options);
  } catch {
    return '--';
  }
}

/**
 * Format days to expiration (DTE) with human-friendly labels.
 * Examples:
 *   0 => "Expires today"
 *   1 => "1 day"
 *   7 => "7 days"
 *   45 => "45 days (6w)"
 */
export function fmtDTE(days: number | null | undefined): string {
  if (days === null || days === undefined || isNaN(days)) {
    return '--';
  }

  if (days === 0) return 'Expires today';
  if (days === 1) return '1 day';

  // Add weeks annotation for longer durations
  if (days >= 7 && days < 60) {
    const weeks = Math.floor(days / 7);
    return `${days} days (${weeks}w)`;
  }

  // Add months annotation for very long durations
  if (days >= 60) {
    const months = Math.floor(days / 30);
    return `${days} days (${months}mo)`;
  }

  return `${days} days`;
}

/**
 * Format a Greek value with appropriate precision and label.
 * Examples:
 *   ("delta", 0.65) => "Δ 0.65"
 *   ("theta", -12.5) => "Θ -$12.50/day"
 *   ("vega", 8.2) => "ν $8.20"
 */
export function fmtGreek(
  name: 'delta' | 'gamma' | 'theta' | 'vega' | 'rho',
  value: number | null | undefined
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '--';
  }

  const symbols = {
    delta: 'Δ',
    gamma: 'Γ',
    theta: 'Θ',
    vega: 'ν',
    rho: 'ρ',
  };

  const symbol = symbols[name];

  switch (name) {
    case 'delta':
      // Delta is typically -1 to 1
      return `${symbol} ${value.toFixed(3)}`;

    case 'gamma':
      // Gamma is typically small (0-0.1)
      return `${symbol} ${value.toFixed(4)}`;

    case 'theta':
      // Theta is in dollars per day
      return `${symbol} ${fmtUSD(value)}/day`;

    case 'vega':
      // Vega is in dollars per 1% IV change
      return `${symbol} ${fmtUSD(value)}`;

    case 'rho':
      // Rho is in dollars per 1% interest rate change
      return `${symbol} ${fmtUSD(value)}`;

    default:
      return `${symbol} ${value.toFixed(2)}`;
  }
}

/**
 * Format a Greek value for compact display (just number).
 */
export function fmtGreekCompact(
  name: 'delta' | 'gamma' | 'theta' | 'vega' | 'rho',
  value: number | null | undefined
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '--';
  }

  switch (name) {
    case 'delta':
      return value.toFixed(2);
    case 'gamma':
      return value.toFixed(4);
    case 'theta':
      return fmtUSD(value, 0);
    case 'vega':
      return fmtUSD(value, 0);
    case 'rho':
      return fmtUSD(value, 0);
    default:
      return value.toFixed(2);
  }
}

/**
 * Format implied volatility (IV).
 * Examples:
 *   0.25 => "25%"
 *   0.526 => "52.6%"
 */
export function fmtIV(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '--';
  }

  // IV is typically stored as decimal (0.25 = 25%)
  return `${(value * 100).toFixed(1)}%`;
}

/**
 * Format IV Rank (0-100 scale).
 * Examples:
 *   75 => "75 (High)"
 *   25 => "25 (Low)"
 *   50 => "50 (Mid)"
 */
export function fmtIVRank(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '--';
  }

  const rounded = Math.round(value);

  if (rounded >= 75) return `${rounded} (High)`;
  if (rounded >= 50) return `${rounded} (Mid)`;
  if (rounded >= 25) return `${rounded} (Low)`;
  return `${rounded} (Very Low)`;
}

/**
 * Format open interest or volume with compact notation.
 * Examples:
 *   1234 => "1.2k"
 *   50000 => "50k"
 *   500 => "500"
 */
export function fmtVolume(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '--';
  }

  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  } else if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}k`;
  } else {
    return value.toFixed(0);
  }
}

/**
 * Format bid-ask spread.
 * Examples:
 *   (1.50, 1.60) => "$1.55 ± $0.05"
 */
export function fmtSpread(
  bid: number | null | undefined,
  ask: number | null | undefined
): string {
  if (bid === null || bid === undefined || ask === null || ask === undefined) {
    return '--';
  }

  const mid = (bid + ask) / 2;
  const width = ask - bid;

  return `${fmtUSD(mid)} ± ${fmtUSD(width / 2)}`;
}

/**
 * Format probability of profit (POP).
 * Examples:
 *   0.65 => "65%"
 *   0.852 => "85%"
 */
export function fmtPOP(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '--';
  }

  // If value is already in percent form (> 1), don't multiply
  const percent = value > 1 ? value : value * 100;

  return `${Math.round(percent)}%`;
}

/**
 * Format moneyness label.
 * Examples:
 *   (100, 95, "call") => "ITM $5.00"
 *   (100, 105, "call") => "OTM $5.00"
 *   (100, 100, "call") => "ATM"
 */
export function fmtMoneyness(
  underlyingPrice: number,
  strike: number,
  type: 'CALL' | 'PUT' | 'call' | 'put'
): string {
  const normalizedType = type.toUpperCase();
  const diff = Math.abs(underlyingPrice - strike);

  // ATM threshold: within $0.50
  if (diff < 0.5) {
    return 'ATM';
  }

  const isITM =
    normalizedType === 'CALL'
      ? underlyingPrice > strike
      : underlyingPrice < strike;

  const label = isITM ? 'ITM' : 'OTM';
  return `${label} ${fmtUSD(diff)}`;
}

/**
 * Format a number with sign prefix (+ or -).
 * Examples:
 *   1234 => "+1,234"
 *   -500 => "-500"
 *   0 => "0"
 */
export function fmtSigned(value: number | null | undefined, decimals: number = 0): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '--';
  }

  const sign = value > 0 ? '+' : value < 0 ? '-' : '';
  const absValue = Math.abs(value);

  return `${sign}${absValue.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

/**
 * Format a number with color class based on positive/negative.
 * Returns object with formatted value and Tailwind color class.
 */
export function fmtColoredUSD(value: number | null | undefined): {
  formatted: string;
  className: string;
} {
  const formatted = fmtUSD(value);

  if (value === null || value === undefined || isNaN(value)) {
    return { formatted, className: 'text-zinc-500' };
  }

  if (value > 0) {
    return { formatted, className: 'text-emerald-600' };
  } else if (value < 0) {
    return { formatted, className: 'text-rose-600' };
  } else {
    return { formatted, className: 'text-zinc-900' };
  }
}

/**
 * Format a number with color class based on positive/negative percentage.
 */
export function fmtColoredPct(value: number | null | undefined): {
  formatted: string;
  className: string;
} {
  const formatted = fmtPct(value);

  if (value === null || value === undefined || isNaN(value)) {
    return { formatted, className: 'text-zinc-500' };
  }

  if (value > 0) {
    return { formatted: `+${formatted}`, className: 'text-emerald-600' };
  } else if (value < 0) {
    return { formatted, className: 'text-rose-600' };
  } else {
    return { formatted, className: 'text-zinc-900' };
  }
}

/**
 * Calculate and format time until expiration.
 * Examples:
 *   "2024-03-20" (5 days away) => "5d"
 *   "2024-04-15" (35 days away) => "5w"
 *   "2024-06-20" (90 days away) => "3mo"
 */
export function fmtTimeToExpiration(expirationDate: string | Date): string {
  try {
    const exp = typeof expirationDate === 'string' ? new Date(expirationDate) : expirationDate;
    const now = new Date();

    // Set to end of day for expiration
    exp.setHours(23, 59, 59, 999);

    const diffMs = exp.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Expired';
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return '1d';
    if (diffDays < 7) return `${diffDays}d`;
    if (diffDays < 60) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks}w`;
    }

    const months = Math.floor(diffDays / 30);
    return `${months}mo`;
  } catch {
    return '--';
  }
}

/**
 * Format a strategy name from legs.
 * This is a helper to create human-readable strategy descriptions.
 */
export function fmtStrategyName(legCount: number, type?: string): string {
  if (type) return type;

  if (legCount === 1) return 'Single Leg';
  if (legCount === 2) return 'Spread';
  if (legCount === 3) return 'Butterfly';
  if (legCount === 4) return 'Condor';

  return 'Custom Strategy';
}
