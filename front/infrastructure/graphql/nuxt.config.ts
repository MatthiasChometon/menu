import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// The endpoint is reached from two vantage points, which only diverge under
// Docker (everywhere else both fall back to localhost:3779):
//   - host       : the server-side one; the site is fully prerendered, so
//     nothing ever goes through it
//   - clientHost : the browser, which only knows the published port
const graphqlHost = process.env.GQL_HOST ?? 'http://localhost:3779/graphql';

// Types come from the versioned schema whenever it is reachable, which is the
// case for a checkout and for the Netlify build: the front then compiles with no
// API running at all, and production can keep introspection off — it hands the
// whole schema to anyone who asks.
//
// The front's Docker image is built from ./front alone, so the file sits outside
// its context; there the module falls back to introspecting the API over the
// private compose network, which is why the local stack still enables it.
const monorepoSchema = fileURLToPath(
  new URL('../../../back/infrastructure/graphql/schema.gql', import.meta.url),
);
const schemaPath = process.env.GQL_SCHEMA ?? monorepoSchema;

const client = {
  host: graphqlHost,
  clientHost: process.env.GQL_CLIENT_HOST ?? graphqlHost,
  ...(existsSync(schemaPath) ? { schema: schemaPath } : { introspectionHost: graphqlHost }),
};

export default defineNuxtConfig({
  modules: ['nuxt-graphql-client'],
  'graphql-client': { clients: { default: client } },
  runtimeConfig: { public: { 'graphql-client': { clients: { default: client } } } },
});
