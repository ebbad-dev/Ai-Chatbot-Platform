const http = require('http');

// Test the internal retrieval route endpoint to see what knowledge chunks come back
function testRetrieval(message) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ message });
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/v1/internal/chatbots/2d94a11c-9bf7-4c31-9fbd-c6375bc8beea/retrieval/route',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), 'X-Admin-Secret': 'admin' },
    }, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { reject(new Error(data)); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  const r = await testRetrieval('Turnaround & shipping');
  console.log('Intent:', r.intent);
  console.log('FAQs:', r.faqs?.length || 0);
  console.log('Chunks:', r.chunks?.length || 0);
  if (r.chunks) {
    r.chunks.forEach((c, i) => console.log(`  Chunk ${i}: ${c.pageTitle} -> ${c.headingPath} (${c.content?.length || 0} chars)`));
  }
  console.log('Products:', r.products?.length || 0);
}

main().catch(console.error);
