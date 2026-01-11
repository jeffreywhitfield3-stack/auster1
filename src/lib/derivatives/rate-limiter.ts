// src/lib/derivatives/rate-limiter.ts
/**
 * Simple in-memory rate limiter with request queuing
 * Prevents hitting API rate limits by controlling request frequency
 */

type QueuedRequest<T> = {
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
};

export class RateLimiter {
  private queue: QueuedRequest<any>[] = [];
  private processing = false;
  private lastRequestTime = 0;

  constructor(
    private readonly requestsPerMinute: number,
    private readonly burstSize: number = 3
  ) {}

  /**
   * Enqueue a request to be executed with rate limiting
   */
  async enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({ execute: fn, resolve, reject });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    while (this.queue.length > 0) {
      const now = Date.now();
      const minInterval = (60 * 1000) / this.requestsPerMinute;
      const timeSinceLastRequest = now - this.lastRequestTime;

      // Wait if we need to throttle
      if (timeSinceLastRequest < minInterval) {
        const waitTime = minInterval - timeSinceLastRequest;
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }

      const item = this.queue.shift();
      if (!item) break;

      try {
        this.lastRequestTime = Date.now();
        const result = await item.execute();
        item.resolve(result);
      } catch (error) {
        item.reject(error as Error);
      }
    }

    this.processing = false;
  }

  /**
   * Get current queue length
   */
  queueLength(): number {
    return this.queue.length;
  }
}

// Singleton instance for Polygon API (free tier: 5 requests/minute)
export const polygonRateLimiter = new RateLimiter(5, 2);
