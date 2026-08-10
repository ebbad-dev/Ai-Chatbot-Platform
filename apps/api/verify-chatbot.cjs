const pg = require('pg');
const c = new pg.Client({
  host: '127.0.0.1', port: 5432,
  database: 'chatbot_platform',
  user: 'postgres', password: '495johar'
});
c.connect().then(async () => {
  const r = await c.query(
    `SELECT id, name, public_key, status, platform_type, connector_config FROM chatbots WHERE public_key = 'demo-key'`
  );
  console.log(JSON.stringify(r.rows[0], null, 2));
  await c.end();
}).catch(e => console.error(e.message));
