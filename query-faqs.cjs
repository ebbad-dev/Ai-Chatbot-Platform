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
  const r = await client.query('SELECT * FROM knowledge_faqs WHERE chatbot_id = $1', ['2d94a11c-9bf7-4c31-9fbd-c6375bc8beea']);
  console.log(JSON.stringify(r.rows, null, 2));
  await client.end();
}
main().catch(console.error);
