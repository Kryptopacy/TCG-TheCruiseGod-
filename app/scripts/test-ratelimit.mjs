/**
 * Test Script for Upstash Rate Limiting and Redis Caching
 * 
 * Run with: node scripts/test-ratelimit.mjs
 */

export async function testSearchAPI() {
  const url = 'http://localhost:3001/api/search';
  const payload = {
    query: "hidden gem cocktail bars",
    location: "Downtown Austin",
    type: "locations"
  };

  console.log("🚀 Testing Upstash Redis Cache...");
  
  // Request 1: Should hit Firecrawl (slow)
  console.time('Request 1 (Firecrawl)');
  let res1 = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  console.timeEnd('Request 1 (Firecrawl)');
  let data1 = await res1.json();
  console.log("Response 1:", data1.success ? "Success" : data1.error);

  // Request 2: Should hit Upstash Redis (fast)
  console.time('Request 2 (Redis Cache)');
  let res2 = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  console.timeEnd('Request 2 (Redis Cache)');
  let data2 = await res2.json();
  console.log("Response 2:", data2.success && data2.from_cache ? "Cache Hit! ⚡" : "Missed cache.");

  console.log("\n🛑 Testing Rate Limiter (Spamming endpoint)...");
  
  // Unauthenticated users are limited to 5 requests per hour. 
  // Let's fire 6 requests to trigger the 429 Too Many Requests response.
  for (let i = 1; i <= 6; i++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: "bars", type: "locations" })
    });
    
    if (res.status === 429) {
      console.log(`Request ${i}: 🛑 Blocked! (429 Too Many Requests)`);
      const body = await res.json();
      console.log("Reason:", body.error);
      break;
    } else {
      console.log(`Request ${i}: Allowed (${res.status})`);
    }
  }
}

testSearchAPI().catch(console.error);
