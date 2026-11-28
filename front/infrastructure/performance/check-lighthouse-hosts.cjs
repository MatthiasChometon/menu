/* eslint-disable @typescript-eslint/explicit-function-return-type -- plain CommonJS script run by node in CI */
// The deployed site's Content-Security-Policy allows no host but its own and its API: a Lighthouse
// run that reaches anywhere else measures a page that would be blocked in production (an icon
// fetched from the Iconify API, an error report sent to Sentry because a request failed).
// Every request of every report must go to localhost.
const fs = require('node:fs');

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);

const externalRequests = (dirs) => {
  const found = [];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir).filter((name) => /report\.json$/.test(name))) {
      const report = JSON.parse(fs.readFileSync(`${dir}/${file}`, 'utf8'));
      for (const request of report.audits['network-requests'].details.items) {
        const { protocol, hostname } = new URL(request.url);
        if (protocol.startsWith('http') && !LOCAL_HOSTS.has(hostname))
          found.push(`${report.finalUrl} -> ${request.url.slice(0, 120)}`);
      }
    }
  }
  return found;
};

if (require.main === module) {
  const found = externalRequests(process.argv.slice(2));
  for (const line of new Set(found)) console.error(`LH-EXTERNAL ${line}`);
  if (found.length > 0) process.exit(1);
  console.log('No request left localhost.');
}

module.exports = { externalRequests };
