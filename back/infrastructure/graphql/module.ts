import { join } from 'node:path';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'infrastructure/graphql/schema.gql'),
      sortSchema: true,
      // Kept on in every environment: the front generates its GraphQL types by
      // introspecting this endpoint, and Apollo disables introspection under
      // NODE_ENV=production by default, which would break the front build.
      introspection: true,
    }),
  ],
})
export class GraphqlInfrastructureModule {}
