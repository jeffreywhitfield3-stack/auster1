// src/lib/market-data/index.ts
// Market Data Gateway - Main entry point

export * from "./types";
export * from "./gateway";
export * from "./cache";
export { MassiveProvider, createMassiveProvider } from "./providers/massive-provider";
export { YahooProvider, createYahooProvider } from "./providers/yahoo-provider";

import { MarketDataGateway } from "./gateway";
import { createCache } from "./cache";
import { createMassiveProvider } from "./providers/massive-provider";
import { createYahooProvider } from "./providers/yahoo-provider";

/**
 * Create default market data gateway instance
 * - Primary: Polygon (Massive)
 * - Fallback: Yahoo Finance
 * - Cache: Memory (60 second default TTL)
 * - Request coalescing: Enabled
 */
let defaultGatewayInstance: MarketDataGateway | null = null;

export function createDefaultGateway(): MarketDataGateway {
  // Return existing instance if already created (singleton pattern)
  if (defaultGatewayInstance) {
    return defaultGatewayInstance;
  }

  try {
    const primaryProvider = createMassiveProvider();
    const fallbackProvider = createYahooProvider();
    const cache = createCache(60);

    defaultGatewayInstance = new MarketDataGateway({
      primaryProvider,
      fallbackProvider,
      cache,
      coalesceRequests: true,
    });

    console.log("[Gateway] Initialized with Polygon primary, Yahoo fallback");
    return defaultGatewayInstance;
  } catch (error) {
    console.error("[Gateway] Failed to create gateway:", error);
    throw error;
  }
}

/**
 * Get the default gateway instance (creates it if needed)
 */
export function getDefaultGateway(): MarketDataGateway {
  return defaultGatewayInstance || createDefaultGateway();
}

/**
 * Reset the default gateway instance (useful for testing)
 */
export function resetDefaultGateway(): void {
  defaultGatewayInstance = null;
}
