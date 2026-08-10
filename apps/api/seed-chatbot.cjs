const pg = require('pg');

const c = new pg.Client({
  host: '127.0.0.1',
  port: 5432,
  database: 'chatbot_platform',
  user: 'postgres',
  password: '495johar'
});

c.connect().then(async () => {
  try {
    const config = JSON.stringify({
      apiBaseUrl: 'https://www.printez.com',
      apiKey: 'Bearer 5c4faefcfc742ee848f1aa2f385f237aec5e70c6fcd7d5b3c8e082e426c51b54',
      endpoints: {
        products: '/index.php?route=agentapi/product|list',
        orders: '/index.php?route=agentapi/order|get'
      }
    });
    await c.query(
      `INSERT INTO chatbots (id, name, public_key, status, platform_type, connector_config, website_origin, welcome_message, fallback_message) 
       VALUES ('2d94a11c-9bf7-4c31-9fbd-c6375bc8beea', 'PrintEZ AI Assistant', 'demo-key', 'active', 'opencart', $1, '*', 'Hi there! I am your PrintEZ AI assistant.', 'Let me alert our specialists.') 
       ON CONFLICT (public_key) DO UPDATE SET platform_type = 'opencart', connector_config = $1, website_origin = '*'`,
      [config]
    );
    console.log('Successfully seeded PrintEZ opencart chatbot demo-key.');
  } catch (err) {
    console.error('Error seeding chatbot:', err.message);
  }
  await c.end();
}).catch(e => console.error(e.message));
