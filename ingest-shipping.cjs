const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CHATBOT_ID = '2d94a11c-9bf7-4c31-9fbd-c6375bc8beea';

async function main() {
  const client = new Client({
    user: 'postgres',
    host: '127.0.0.1',
    database: 'chatbot_platform',
    password: '495johar',
    port: 5432,
  });

  await client.connect();

  // Read shipping.md
  const shippingPath = path.join(__dirname, 'apps', 'api', 'src', 'knowledge', 'data', 'shipping.md');
  const content = fs.readFileSync(shippingPath, 'utf-8');

  // Split into sections by ## headings
  const sections = [];
  const lines = content.split('\n');
  let currentSection = null;
  let currentContent = [];

  for (const line of lines) {
    const headingMatch = line.match(/^##\s+(.+)/);
    if (headingMatch) {
      if (currentSection) {
        sections.push({
          heading: currentSection,
          content: currentContent.join('\n').trim(),
        });
      }
      currentSection = headingMatch[1].trim();
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }
  // Push last section
  if (currentSection) {
    sections.push({
      heading: currentSection,
      content: currentContent.join('\n').trim(),
    });
  }

  console.log(`Parsed ${sections.length} shipping knowledge sections`);

  // Delete any existing shipping chunks
  const deleted = await client.query(
    `DELETE FROM knowledge_chunks WHERE chatbot_id = $1 AND page_title = 'PrintEZ Shipping Policy'`,
    [CHATBOT_ID]
  );
  console.log(`Deleted ${deleted.rowCount} existing shipping chunks`);

  // Insert each section as a knowledge chunk
  let order = 0;
  for (const section of sections) {
    const id = crypto.randomUUID();
    const contentHash = crypto.createHash('sha256').update(section.content).digest('hex');
    order++;
    await client.query(
      `INSERT INTO knowledge_chunks (id, chatbot_id, page_title, heading_path, content, content_hash, source_url, source_type, chunk_order, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
       ON CONFLICT (chatbot_id, content_hash) DO UPDATE SET content = EXCLUDED.content, heading_path = EXCLUDED.heading_path, updated_at = NOW()`,
      [
        id,
        CHATBOT_ID,
        'PrintEZ Shipping Policy',
        section.heading,
        section.content,
        contentHash,
        'https://www.printez.com/shipping-policy',
        'owner_input',
        order,
      ]
    );
    console.log(`  ✓ Inserted: "${section.heading}" (${section.content.length} chars)`);
  }

  // Also insert the full document as one comprehensive chunk for broad matching
  const fullId = crypto.randomUUID();
  const fullHash = crypto.createHash('sha256').update(content).digest('hex');
  await client.query(
    `INSERT INTO knowledge_chunks (id, chatbot_id, page_title, heading_path, content, content_hash, source_url, source_type, chunk_order, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
     ON CONFLICT (chatbot_id, content_hash) DO UPDATE SET content = EXCLUDED.content, updated_at = NOW()`,
    [
      fullId,
      CHATBOT_ID,
      'PrintEZ Shipping Policy',
      'Complete Shipping & Tax Reference',
      content,
      fullHash,
      'https://www.printez.com/shipping-policy',
      'owner_input',
      0,
    ]
  );
  console.log(`  ✓ Inserted full document chunk (${content.length} chars)`);

  // Verify
  const verify = await client.query(
    `SELECT COUNT(*)::int as cnt FROM knowledge_chunks WHERE chatbot_id = $1 AND page_title = 'PrintEZ Shipping Policy'`,
    [CHATBOT_ID]
  );
  console.log(`\nTotal shipping knowledge chunks: ${verify.rows[0].cnt}`);

  await client.end();
}

main().catch(console.error);
