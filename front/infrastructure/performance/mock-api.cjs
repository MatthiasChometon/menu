/* eslint-disable @typescript-eslint/explicit-function-return-type -- plain CommonJS script */
const { createServer } = require('node:http');

// What the API says to a visitor who is not signed in (the one Lighthouse is):
// every operation answers UNAUTHENTICATED at once, and the front falls back on the demo
// week the site ships with. Without anything listening on the API port, the same two
// requests of a page load failed on the network instead, which the front reports to
// monitoring: the error tool was downloaded and run during the measure, a cost the
// deployed site (whose API answers) never pays.
const UNAUTHENTICATED = JSON.stringify({
  data: null,
  errors: [{ message: 'Unauthorized', extensions: { code: 'UNAUTHENTICATED' } }],
});

const handler = (request, response) => {
  response.setHeader('access-control-allow-origin', request.headers.origin ?? '*');
  response.setHeader('access-control-allow-credentials', 'true');
  response.setHeader('access-control-allow-headers', '*');
  response.setHeader('access-control-allow-methods', 'GET, POST, OPTIONS');
  if (request.method === 'OPTIONS') {
    response.writeHead(204).end();
    return;
  }
  response.writeHead(200, { 'content-type': 'application/json' }).end(UNAUTHENTICATED);
};

const mockApi = () => createServer(handler);

if (require.main === module) {
  mockApi().listen(Number(process.env.MOCK_API_PORT ?? '3779'), '127.0.0.1');
}

module.exports = { mockApi };
