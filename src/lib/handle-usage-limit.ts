// src/lib/handle-usage-limit.ts

/**
 * Handle API response and check for usage limit (402 status)
 * Redirects to /usage-limit page if limit exceeded
 *
 * Usage:
 * ```ts
 * const response = await fetch('/api/...');
 * await handleUsageLimit(response);
 * // Continue with normal response handling...
 * ```
 */
export async function handleUsageLimit(response: Response): Promise<void> {
  if (response.status === 402) {
    // Usage limit exceeded - redirect to upgrade page
    if (typeof window !== 'undefined') {
      window.location.href = '/usage-limit';
    }
    throw new Error('Usage limit exceeded');
  }
}

/**
 * Wrapper for fetch that automatically handles 402 redirects
 *
 * Usage:
 * ```ts
 * const data = await fetchWithUsageCheck('/api/derivatives/quote?symbol=SPY');
 * ```
 */
export async function fetchWithUsageCheck<T = any>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(url, options);

  await handleUsageLimit(response);

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}
