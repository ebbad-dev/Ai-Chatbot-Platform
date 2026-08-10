const https = require('https');

const TOKEN = '5c4faefcfc742ee848f1aa2f385f237aec5e70c6fcd7d5b3c8e082e426c51b54';
const BASE = 'www.printez.com';

function fetchUrl(path) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: BASE,
      path,
      headers: { Authorization: `Bearer ${TOKEN}` }
    };
    https.get(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', reject);
  });
}

(async () => {
  console.log('--- Testing Product API ---');
  try {
    const prod = await fetchUrl('/index.php?route=agentapi/product|list&limit=2&page=1');
    console.log('Status:', prod.status);
    const parsed = JSON.parse(prod.body);
    const items = Array.isArray(parsed) ? parsed : (parsed.data || parsed.products || parsed.items || []);
    console.log(`Products returned: ${items.length}`);
    if (items[0]) console.log('First product name:', items[0].name || items[0].title);
  } catch (e) {
    console.error('Product API error:', e.message);
  }
})();
