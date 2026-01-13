// Quick test script to check Polygon API responses
// Run with: node test-polygon-api.js

const apiKey = "n7WD_SLjdlJld5MPws5QAc7cyPip6tlz";
const symbol = "SPY";
const expiration = "2026-02-13";

async function testSnapshot() {
  console.log("\n=== Testing /v3/snapshot/options/${symbol} ===");

  const url = `https://api.polygon.io/v3/snapshot/options/${symbol}?limit=10&apiKey=${apiKey}`;
  console.log("URL:", url);

  const response = await fetch(url);
  const data = await response.json();

  console.log("\nStatus:", response.status);
  console.log("Results count:", data.results?.length || 0);

  if (data.results && data.results.length > 0) {
    const sample = data.results[0];
    console.log("\nSample option:");
    console.log("  Ticker:", sample.details?.ticker);
    console.log("  Expiration:", sample.details?.expiration_date);
    console.log("  Strike:", sample.details?.strike_price);
    console.log("  Type:", sample.details?.contract_type);
    console.log("  Bid:", sample.last_quote?.bid);
    console.log("  Ask:", sample.last_quote?.ask);
    console.log("  IV:", sample.implied_volatility);
    console.log("  Delta:", sample.greeks?.delta);
    console.log("  Gamma:", sample.greeks?.gamma);
    console.log("  Underlying price:", sample.underlying_asset?.price);

    // Check unique expirations
    const expirations = new Set();
    data.results.forEach(opt => {
      if (opt.details?.expiration_date) {
        expirations.add(opt.details.expiration_date);
      }
    });
    console.log("\nUnique expirations in first 10 results:", Array.from(expirations).sort());
  }
}

async function testSnapshotWithExpiration() {
  console.log("\n\n=== Testing /v3/snapshot/options/${symbol} with expiration filter ===");

  const url = `https://api.polygon.io/v3/snapshot/options/${symbol}?limit=10&expiration_date=${expiration}&apiKey=${apiKey}`;
  console.log("URL:", url);

  const response = await fetch(url);
  const data = await response.json();

  console.log("\nStatus:", response.status);
  console.log("Results count:", data.results?.length || 0);

  if (data.error) {
    console.log("ERROR:", data.error);
  }

  if (data.results && data.results.length > 0) {
    console.log("\nFirst 3 options with expiration filter:");
    data.results.slice(0, 3).forEach((opt, i) => {
      console.log(`\n  Option ${i + 1}:`);
      console.log("    Ticker:", opt.details?.ticker);
      console.log("    Expiration:", opt.details?.expiration_date);
      console.log("    Strike:", opt.details?.strike_price);
      console.log("    Type:", opt.details?.contract_type);
      console.log("    Delta:", opt.greeks?.delta);
    });
  }
}

async function main() {
  try {
    await testSnapshot();
    await testSnapshotWithExpiration();
  } catch (err) {
    console.error("Error:", err.message);
  }
}

main();
