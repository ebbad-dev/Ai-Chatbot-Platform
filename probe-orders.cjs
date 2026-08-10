const https = require('https');

function checkOrder(id) {
  return new Promise(resolve => {
    https.get(`https://www.printez.com/index.php?route=agentapi/order|get&order_id=${id}`, {
      headers: { 'Authorization': 'Bearer 5c4faefcfc742ee848f1aa2f385f237aec5e70c6fcd7d5b3c8e082e426c51b54' }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.success && json.order) {
            resolve(id);
          } else {
            resolve(null);
          }
        } catch {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

async function main() {
  console.log('Probing for valid order IDs...');
  // OpenCart usually starts at 1, but active stores might be in the tens of thousands.
  // Let's try some ranges: 1-100, 10000-10100, 50000-50100, 100000-100100
  
  const ranges = [
    [1, 100],
    [500, 600],
    [1000, 1100],
    [5000, 5100],
    [10000, 10200],
    [25000, 25200],
    [50000, 50200],
    [75000, 75200],
    [100000, 100200]
  ];

  for (const [start, end] of ranges) {
    console.log(`Checking range ${start} to ${end}...`);
    const promises = [];
    for (let i = start; i <= end; i++) {
      promises.push(checkOrder(i));
    }
    const results = await Promise.all(promises);
    const valid = results.filter(id => id !== null);
    if (valid.length > 0) {
      console.log('FOUND VALID ORDERS:', valid);
      return;
    }
  }
  
  console.log('No valid orders found in the probed ranges.');
}

main();
