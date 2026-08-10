const http = require('http');

function testChat(message) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      publicKey: 'demo-key',
      sessionId: 'verify-test',
      message: message,
    });
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/v1/public/chat',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          reject(new Error('Failed to parse: ' + data));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  console.log('=== TEST 1: Shipping query (should NOT show products) ===');
  const r1 = await testChat('Turnaround & shipping');
  console.log('Intent:', r1.intent);
  console.log('Products count:', r1.products?.length || 0);
  console.log('Reply preview:', r1.reply?.substring(0, 200));
  console.log('Fallback:', r1.fallbackTriggered);
  console.log('');

  console.log('=== TEST 2: Product search (should show real products, no test) ===');
  const r2 = await testChat('Show me some labels');
  console.log('Intent:', r2.intent);
  console.log('Products count:', r2.products?.length || 0);
  if (r2.products) {
    r2.products.forEach(p => console.log(`  - ${p.name} ($${p.price}) [img: ${p.imageUrl ? 'YES' : 'NO'}]`));
  }
  const hasTest = r2.products?.some(p => /test/i.test(p.name));
  console.log('Contains test products:', hasTest || false);
  console.log('');

  console.log('=== TEST 3: Category browse (Gift Boxed Treats) ===');
  const r3 = await testChat('Show me products in the Gift Boxed Treats category');
  console.log('Intent:', r3.intent);
  console.log('Products count:', r3.products?.length || 0);
  if (r3.products) {
    r3.products.forEach(p => console.log(`  - ${p.name} ($${p.price})`));
  }
  console.log('');

  console.log('=== TEST 4: Order tracking intent ===');
  const r4 = await testChat('I would like to track an order');
  console.log('Intent:', r4.intent);
  console.log('Reply contains "order number below":', r4.reply?.includes('order number below') || r4.reply?.includes('order number') || false);
  console.log('Reply preview:', r4.reply?.substring(0, 200));
  console.log('');

  console.log('=== ALL TESTS COMPLETE ===');
}

main().catch(console.error);
