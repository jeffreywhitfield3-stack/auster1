// Test getting underlying price from Polygon
// Run with: node test-polygon-price.js

const apiKey = "n7WD_SLjdlJld5MPws5QAc7cyPip6tlz";
const symbol = "SPY";

async function testPrevClose() {
  console.log("\n=== Testing /v2/aggs/ticker/{symbol}/prev ===");

  const url = `https://api.polygon.io/v2/aggs/ticker/${symbol}/prev?adjusted=true&apiKey=${apiKey}`;
  console.log("URL:", url);

  const response = await fetch(url);
  const data = await response.json();

  console.log("\nStatus:", response.status);
  console.log("\nFull response:");
  console.log(JSON.stringify(data, null, 2));
}

testPrevClose().catch(err => console.error("Error:", err));
