// Clear Redis cache
// Run with: node clear-cache.js

import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: "https://apparent-camel-23025.upstash.io",
  token: "AVnxAAIncDE2NzY4MjIxMmY4Y2Q0ODNmYTFmMzc0NDVlYmY0Y2ViM3AxMjMwMjU",
});

async function clearCache() {
  console.log("Clearing cache keys for SPY...");

  const keys = [
    "quote:SPY",
    "expirations:SPY",
    "chain:SPY:2026-02-13:694.07:20"
  ];

  for (const key of keys) {
    console.log(`Deleting: ${key}`);
    await redis.del(key);
  }

  console.log("\nCache cleared! You can now test with fresh API calls.");
}

clearCache().catch(console.error);
