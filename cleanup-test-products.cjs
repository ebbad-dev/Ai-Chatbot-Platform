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

  // Find and delete test products
  const result = await client.query(
    `DELETE FROM products 
     WHERE chatbot_id = $1 
     AND (
       name ILIKE 'test %' 
       OR name ILIKE '% test' 
       OR name ILIKE 'test%' 
       OR name = 'test33'
       OR name ILIKE 'limit test%'
       OR name ILIKE '%Computer Checks Test%'
     )
     RETURNING name`,
    ['2d94a11c-9bf7-4c31-9fbd-c6375bc8beea']
  );

  console.log(`Deleted ${result.rowCount} test products:`);
  result.rows.forEach(r => console.log(`  - ${r.name}`));

  // Verify none remain
  const check = await client.query(
    `SELECT COUNT(*)::int as remaining FROM products 
     WHERE chatbot_id = $1 AND name ILIKE '%test%'`,
    ['2d94a11c-9bf7-4c31-9fbd-c6375bc8beea']
  );
  console.log(`\nRemaining products with 'test' in name: ${check.rows[0].remaining}`);

  await client.end();
}

main().catch(console.error);
