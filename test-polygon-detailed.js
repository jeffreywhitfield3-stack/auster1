// Detailed test to see full Polygon API response structure
// Run with: node test-polygon-detailed.js

const apiKey = "n7WD_SLjdlJld5MPws5QAc7cyPip6tlz";
const symbol = "SPY";
const expiration = "2026-02-13";

async function testSnapshotDetailed() {
  console.log("\n=== Testing /v3/snapshot/options with expiration filter ===");

  const url = `https://api.polygon.io/v3/snapshot/options/${symbol}?limit=10&expiration_date=${expiration}&apiKey=${apiKey}`;
  console.log("URL:", url);

  const response = await fetch(url);
  const data = await response.json();

  console.log("\nStatus:", response.status);
  console.log("\nFull response structure:");
  console.log(JSON.stringify(data, null, 2));
}

testSnapshotDetailed().catch(err => console.error("Error:", err));
