const pg = require('pg');

async function run() {
  console.log('Connecting to database...');
  const client = new pg.Client({
    host: '127.0.0.1', port: 5432,
    database: 'chatbot_platform',
    user: 'postgres', password: '495johar'
  });
  await client.connect();

  console.log('Loading embedding model...');
  const transformers = await import('@xenova/transformers');
  transformers.env.allowLocalModels = true;
  
  const extractor = await transformers.pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', { quantized: true });

  console.log('Fetching products...');
  // Force embedding generation even if not null, just to ensure all have it (in case some were missed)
  const res = await client.query('SELECT id, name, description FROM products WHERE embedding IS NULL');
  const products = res.rows;
  console.log(`Found ${products.length} products to embed.`);

  let count = 0;
  for (const p of products) {
    const text = `${p.name} ${p.description || ''}`.replace(/\n/g, ' ').trim();
    if (!text) continue;
    
    const output = await extractor(text, { pooling: 'mean', normalize: true });
    const embedding = Array.from(output.data);
    
    await client.query('UPDATE products SET embedding = $1 WHERE id = $2', [embedding, p.id]);
    
    count++;
    if (count % 100 === 0) console.log(`Embedded ${count} / ${products.length}`);
  }

  console.log(`Successfully embedded ${count} products.`);
  await client.end();
}

run().catch(console.error);
