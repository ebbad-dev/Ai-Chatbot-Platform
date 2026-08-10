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

  // Categories
  const cats = await client.query(
    `SELECT category_name, COUNT(*)::int as cnt 
     FROM products 
     WHERE chatbot_id = $1 
     GROUP BY category_name 
     ORDER BY cnt DESC 
     LIMIT 30`,
    ['2d94a11c-9bf7-4c31-9fbd-c6375bc8beea']
  );
  console.log('=== CATEGORIES ===');
  console.log(JSON.stringify(cats.rows, null, 2));

  // Test products
  const tests = await client.query(
    `SELECT name, price, stock_status, category_name 
     FROM products 
     WHERE chatbot_id = $1 AND name ILIKE '%test%'`,
    ['2d94a11c-9bf7-4c31-9fbd-c6375bc8beea']
  );
  console.log('\\n=== TEST PRODUCTS ===');
  console.log(JSON.stringify(tests.rows, null, 2));

  // Total count
  const total = await client.query(
    `SELECT COUNT(*)::int as total FROM products WHERE chatbot_id = $1`,
    ['2d94a11c-9bf7-4c31-9fbd-c6375bc8beea']
  );
  console.log('\\n=== TOTAL PRODUCTS ===');
  console.log(total.rows[0].total);

  // Knowledge chunks for shipping
  const chunks = await client.query(
    `SELECT id, page_title, heading_path, LEFT(content, 200) as preview 
     FROM knowledge_chunks 
     WHERE chatbot_id = $1 AND (content ILIKE '%shipping%' OR page_title ILIKE '%shipping%')
     LIMIT 5`,
    ['2d94a11c-9bf7-4c31-9fbd-c6375bc8beea']
  );
  console.log('\\n=== SHIPPING KNOWLEDGE CHUNKS ===');
  console.log(JSON.stringify(chunks.rows, null, 2));

  await client.end();
}

main().catch(console.error);
