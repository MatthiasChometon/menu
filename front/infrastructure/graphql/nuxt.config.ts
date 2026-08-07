import { fileURLToPath } from 'node:url';

// The endpoint is reached from two different vantage points, which only diverge
// under Docker (everywhere else they both fall back to localhost:3779):
//   - host       : the server-side one; the site is fully prerendered, so
//     nothing ever goes through it
//   - clientHost : the browser, which only knows the published port
const graphqlHost = process.env.GQL_HOST ?? 'http://localhost:3779/graphql';

// Types are generated from the versioned schema rather than by introspecting a
// running API. That is what lets introspection stay off in production — it
// hands the whole schema to anyone who asks — and it means the front builds
// without the back being up at all. The file is written by the back at boot, so
// it follows the resolvers; commit it when the API changes.
const schemaPath = fileURLToPath(
  new URL('../../../back/infrastructure/graphql/schema.gql', import.meta.url),
);

export default defineNuxtConfig({
  modules: ['nuxt-graphql-client'],
  'graphql-client': {
    clients: {
      default: {
        host: graphqlHost,
        schema: schemaPath,
        clientHost: process.env.GQL_CLIENT_HOST ?? graphqlHost,
      },
    },
  },
  runtimeConfig: {
    public: {
      'graphql-client': {
        clients: {
          default: {
            host: graphqlHost,
            schema: schemaPath,
            clientHost: process.env.GQL_CLIENT_HOST ?? graphqlHost,
          },
        },
      },
    },
  },
});
