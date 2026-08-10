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

  // Test the same search logic that knowledge-search.service.ts uses
  const query = 'Turnaround & shipping';
  const ilike = `%${query}%`;

  const r = await client.query(`
    SELECT id, page_title, heading_path, LEFT(content, 100) as preview,
      ts_rank(coalesce(search_vector, to_tsvector('english', content)), plainto_tsquery('english', $1)) as rank
    FROM knowledge_chunks
    WHERE chatbot_id = $2
    AND (
      coalesce(search_vector, to_tsvector('english', content)) @@ plainto_tsquery('english', $1)
      OR content ILIKE $3
      OR similarity(content, $1) > 0.15
    )
    ORDER BY rank DESC
    LIMIT 5
  `, [query, '2d94a11c-9bf7-4c31-9fbd-c6375bc8beea', ilike]);

  console.log('Results:', r.rows.length);
  r.rows.forEach(row => {
    console.log(`  ${row.page_title} -> ${row.heading_path} (rank: ${row.rank})`);
    console.log(`    ${row.preview}`);
  });

  // Also try just "shipping" as the query
  const r2 = await client.query(`
    SELECT id, page_title, heading_path, LEFT(content, 100) as preview,
      ts_rank(coalesce(search_vector, to_tsvector('english', content)), plainto_tsquery('english', $1)) as rank
    FROM knowledge_chunks
    WHERE chatbot_id = $2
    AND (
      coalesce(search_vector, to_tsvector('english', content)) @@ plainto_tsquery('english', $1)
      OR content ILIKE $3
      OR similarity(content, $1) > 0.15
    )
    ORDER BY rank DESC
    LIMIT 5
  `, ['shipping rates methods', '2d94a11c-9bf7-4c31-9fbd-c6375bc8beea', '%shipping%']);

  console.log('\nResults for "shipping rates methods":', r2.rows.length);
  r2.rows.forEach(row => {
    console.log(`  ${row.page_title} -> ${row.heading_path} (rank: ${row.rank})`);
  });

  await client.end();
}

main().catch(console.error);
