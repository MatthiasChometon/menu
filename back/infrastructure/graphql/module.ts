import { join } from 'node:path';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { depthLimit } from './depth-limit';

// Deep enough for every query the front sends (profile → targets → fields),
// shallow enough that no one can walk a cycle into it later.
const MAX_QUERY_DEPTH = 8;

@Module({
  imports: [
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        autoSchemaFile: join(process.cwd(), 'infrastructure/graphql/schema.gql'),
        sortSchema: true,
        // Both halves of the exchange, named. Guards need the request to know
        // who is calling and the reply to write their headers on; without the
        // reply the rate limiter failed on every resolver it guarded.
        context: ({ req, reply }: { req: FastifyRequest; reply: FastifyReply }) => ({ req, reply }),
        // The front generates its types by introspecting this endpoint, so the
        // build needs it — but a public deployment must not hand its whole
        // schema to anyone who asks. Opt in explicitly when building.
        introspection: config.get<string>('GRAPHQL_INTROSPECTION') === 'true',
        // The landing page is a whole HTML app served from our origin; an API
        // that only answers JSON has no business shipping one.
        playground: false,
        validationRules: [depthLimit(MAX_QUERY_DEPTH)],
        // Errors reach the client without the stack trace that produced them.
        includeStacktraceInErrorResponses: false,
        // Apollo's unbounded APQ cache is a documented memory-exhaustion vector,
        // and the front does not use persisted queries.
        persistedQueries: false,
      }),
    }),
  ],
})
export class GraphqlInfrastructureModule {}
