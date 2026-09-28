const { run } = require('../../lib/ai');
exports.handler = async (event) => {
  const h = { 'content-type': 'application/json' };
  try {
    return { statusCode: 200, headers: h, body: JSON.stringify(await run(JSON.parse(event.body || '{}'))) };
  } catch (e) {
    return { statusCode: 500, headers: h, body: JSON.stringify({ error: e.message }) };
  }
};
