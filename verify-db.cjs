const { Client } = require('pg');

async function main() {
  const client = new Client({
    user: 'postgres',
    host: '127.0.0.1',
    database: 'chatbot_platform',
    password: '495johar',
    port: 5432,
  });

  await client.connect();

  // Check shipping chunks
  const r = await client.query(
    `SELECT COUNT(*)::int as cnt FROM knowledge_chunks WHERE chatbot_id = $1 AND page_title = $2`,
    ['2d94a11c-9bf7-4c31-9fbd-c6375bc8beea', 'PrintEZ Shipping Policy']
  );
  console.log('Shipping chunks:', r.rows[0].cnt);

  // Check test products
  const t = await client.query(
    `SELECT COUNT(*)::int as cnt FROM products WHERE chatbot_id = $1 AND name ILIKE '%test%'`,
    ['2d94a11c-9bf7-4c31-9fbd-c6375bc8beea']
  );
  console.log('Test products remaining:', t.rows[0].cnt);

  // Check total products
  const p = await client.query(
    `SELECT COUNT(*)::int as cnt FROM products WHERE chatbot_id = $1`,
    ['2d94a11c-9bf7-4c31-9fbd-c6375bc8beea']
  );
  console.log('Total products:', p.rows[0].cnt);

  await client.end();
}

main().catch(console.error);
