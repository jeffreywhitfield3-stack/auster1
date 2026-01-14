// Test the massiveChain fix
// This simulates what the code does now

const apiKey = "n7WD_SLjdlJld5MPws5QAc7cyPip6tlz";
const symbol = "SPY";
const expiration = "2026-02-13";

async function testChainFix() {
  console.log("\n=== Testing Chain Fix ===\n");

  // Step 1: Get underlying price (like massiveQuote does)
  console.log("Step 1: Fetching underlying price...");
  const quoteUrl = `https://api.polygon.io/v2/aggs/ticker/${symbol}/prev?adjusted=true&apiKey=${apiKey}`;
  const quoteResp = await fetch(quoteUrl);
  const quoteData = await quoteResp.json();
  const underlyingPrice = quoteData.results?.[0]?.c;
  console.log(`✓ Underlying price: $${underlyingPrice}\n`);

  // Step 2: Get options chain (like massiveChain does)
  console.log("Step 2: Fetching options chain...");
  const chainUrl = `https://api.polygon.io/v3/snapshot/options/${symbol}?limit=250&expiration_date=${expiration}&apiKey=${apiKey}`;
  const chainResp = await fetch(chainUrl);
  const chainData = await chainResp.json();

  console.log(`✓ Got ${chainData.results?.length || 0} options\n`);

  // Step 3: Process options (like the code does)
  console.log("Step 3: Processing options...");
  const calls = [];
  const puts = [];

  for (const opt of chainData.results || []) {
    const exp = opt?.details?.expiration_date;
    if (exp !== expiration) continue;

    const strike = opt?.details?.strike_price;
    if (!strike) continue;

    const leg = {
      strike,
      bid: opt?.last_quote?.bid || null,
      ask: opt?.last_quote?.ask || null,
      delta: opt?.greeks?.delta || null,
      theta: opt?.greeks?.theta || null,
    };

    if (opt?.details?.contract_type === "call") calls.push(leg);
    if (opt?.details?.contract_type === "put") puts.push(leg);
  }

  console.log(`✓ Calls found: ${calls.length}`);
  console.log(`✓ Puts found: ${puts.length}\n`);

  // Show sample data
  if (calls.length > 0) {
    console.log("Sample call:");
    console.log(JSON.stringify(calls[0], null, 2));
  }

  if (puts.length > 0) {
    console.log("\nSample put:");
    console.log(JSON.stringify(puts[puts.length - 1], null, 2));
  }

  // Final result
  console.log("\n=== RESULT ===");
  const result = {
    symbol,
    underlying: underlyingPrice,
    expiration,
    calls: calls.length,
    puts: puts.length,
  };
  console.log(JSON.stringify(result, null, 2));

  if (calls.length > 0 && puts.length > 0 && underlyingPrice) {
    console.log("\n✅ SUCCESS: Chain data is loading correctly!");
  } else {
    console.log("\n❌ FAILURE: Missing data");
  }
}

testChainFix().catch(err => console.error("Error:", err));
