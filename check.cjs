const pg = require('pg'); 
const c = new pg.Client({
  host:'127.0.0.1',
  port:5432,
  database:'chatbot_platform',
  user:'postgres',
  password:'495johar'
}); 

c.connect().then(async()=>{ 
  const p = await c.query('SELECT website_origin FROM chatbots WHERE public_key = $1', ['demo-key']); 
  console.log('WEBSITE_ORIGIN:', p.rows[0].website_origin);
  
  // Actually, if it's '*', let's just bypass the check by setting it to *
  // Wait, if it's '*', normalizeOrigin('*') throws BadRequestException!
  // Because new URL('https://*') might be invalid in Node?
  console.log('URL for *: ', new URL('https://*').hostname);
  
  await c.end();
}).catch(e=>console.error(e.message));
