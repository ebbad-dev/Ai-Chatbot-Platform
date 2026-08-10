const pg = require('pg'); 
const c = new pg.Client({
  host:'127.0.0.1',
  port:5432,
  database:'chatbot_platform',
  user:'postgres',
  password:'495johar'
}); 

c.connect().then(async()=>{ 
  const config = JSON.stringify({
    apiBaseUrl: 'https://www.printez.com', 
    apiKey: '5c4faefcfc742ee848f1aa2f385f237aec5e70c6fcd7d5b3c8e082e426c51b54', 
    endpoints: { products: '/index.php?route=agentapi/product|list' }
  }); 
  await c.query('UPDATE chatbots SET connector_config = $1 WHERE public_key = $2', [config, 'demo-key']); 
  console.log('Updated config.'); 
  await c.end();
}).catch(e=>console.error(e.message));
