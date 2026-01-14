// src/lib/market-data/cache/index.ts
// Cache factory - creates appropriate cache based on environment

import { IMarketDataCache } from "../types";
import { MemoryCache } from "./memory-cache";

/**
 * Create a cache instance based on configuration
 *
 * In the future, this can support Redis:
 * - CACHE_DRIVER=redis → Use Redis cache
 * - CACHE_DRIVER=memory → Use in-memory cache (default)
 */
export function createCache(ttlSeconds = 60): IMarketDataCache {
  const driver = process.env.CACHE_DRIVER || "memory";

  switch (driver) {
    case "memory":
      return new MemoryCache(ttlSeconds);

    // Future: Add Redis support
    // case "redis":
    //   return new RedisCache(ttlSeconds);

    default:
      console.warn(`Unknown cache driver: ${driver}, falling back to memory`);
      return new MemoryCache(ttlSeconds);
  }
}

// Export cache implementations
export { MemoryCache } from "./memory-cache";
export type { IMarketDataCache } from "../types";
