const pg = require('pg'); 
const c = new pg.Client({
  host:'127.0.0.1',
  port:5432,
  database:'chatbot_platform',
  user:'postgres',
  password:'495johar'
}); 

c.connect().then(async()=>{ 
  await c.query('UPDATE chatbots SET website_origin = $1 WHERE public_key = $2', ['http://localhost:5174', 'demo-key']); 
  console.log('Updated origin successfully.');
  await c.end();
}).catch(e=>console.error(e.message));
