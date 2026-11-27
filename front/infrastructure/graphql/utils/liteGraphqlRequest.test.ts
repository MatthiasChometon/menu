import { afterEach, describe, expect, it, vi } from 'vitest';
import { ClientError, GraphQLClient, gql } from './liteGraphqlRequest';

const answer = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status });

describe('liteGraphqlRequest', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('glues the fragments of a document into one string', () => {
    const name = 'me';

    expect(gql`query { ${name} { id } }`).toBe('query { me { id } }');
  });

  it('posts the document and returns the data, after the middleware has had its say', async () => {
    const fetchMock = vi.fn().mockResolvedValue(answer({ data: { me: { id: '1' } } }));
    vi.stubGlobal('fetch', fetchMock);
    const client = new GraphQLClient('https://api.test/graphql', {
      requestMiddleware: (request): typeof request => ({
        ...request,
        credentials: 'include',
        headers: { ...request.headers, 'x-test': 'yes' },
      }),
    });

    const result = await client.request({ document: 'query { me { id } }', variables: { a: 1 } });

    expect(result).toEqual({ me: { id: '1' } });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.test/graphql');
    expect(init.credentials).toBe('include');
    expect(init.headers).toMatchObject({ 'x-test': 'yes' });
    expect(JSON.parse(init.body as string)).toEqual({
      query: 'query { me { id } }',
      variables: { a: 1 },
    });
  });

  it('sends the name of the operation, as graphql-request does', async () => {
    const fetchMock = vi.fn().mockResolvedValue(answer({ data: {} }));
    vi.stubGlobal('fetch', fetchMock);

    await new GraphQLClient('https://api.test/graphql').request({
      document: 'fragment F on User { id } query Weeks($a: Int) { weeks { ...F } }',
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string).operationName).toBe('Weeks');
  });

  it('throws the answer, status included, when the API reports errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          answer({ errors: [{ message: 'no', extensions: { code: 'UNAUTHENTICATED' } }] }, 200),
        ),
    );
    const client = new GraphQLClient('https://api.test/graphql');

    const failure = await client
      .request({ document: 'query { me { id } }' })
      .catch((error: unknown): unknown => error);

    expect(failure).toBeInstanceOf(ClientError);
    expect((failure as ClientError).response.errors?.[0]?.extensions?.code).toBe('UNAUTHENTICATED');
  });

  it('throws with the status when the answer is not JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>', { status: 502 })));
    const client = new GraphQLClient('https://api.test/graphql');

    const failure = await client
      .request({ document: 'query { me { id } }' })
      .catch((error: unknown): unknown => error);

    expect((failure as ClientError).response.status).toBe(502);
  });
});
