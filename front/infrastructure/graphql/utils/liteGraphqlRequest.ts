// The slice of graphql-request that the generated SDK and nuxt-graphql-client use,
// without its dependency on the graphql package: that one parses and prints
// documents (about 75 KB before compression) to find an operation's name, for
// documents that are already printed strings. vite.resolve.alias in nuxt.config
// points the client bundle here; the types still come from graphql-request.

type Headers = Record<string, string>;

type RequestInput = {
  url: string;
  method: 'POST';
  headers: Headers;
  body: string;
  signal?: AbortSignal | null;
  [option: string]: unknown;
};

type ClientOptions = {
  requestMiddleware?: (request: RequestInput) => RequestInput | Promise<RequestInput>;
};

type GqlResponse = {
  status: number;
  errors?: { message?: string; extensions?: Record<string, unknown> }[];
  message?: string;
  data?: unknown;
};

export class ClientError extends Error {
  response: GqlResponse;

  constructor(response: GqlResponse) {
    super(response.errors?.[0]?.message ?? response.message ?? `GraphQL error ${response.status}`);
    this.response = response;
  }
}

// Documents are strings already: the tag only glues the fragments together.
export const gql = (chunks: TemplateStringsArray, ...variables: unknown[]): string =>
  chunks.reduce(
    (text, chunk, position): string =>
      `${text}${chunk}${position < variables.length ? String(variables[position]) : ''}`,
    '',
  );

const headersOf = (value: unknown): Headers =>
  value instanceof globalThis.Headers
    ? Object.fromEntries(value.entries())
    : { ...(value as Headers | undefined) };

const bodyOf = async (response: Response): Promise<{ data?: unknown } & GqlResponse> => {
  try {
    return (await response.json()) as { data?: unknown } & GqlResponse;
  } catch {
    return { status: response.status, message: response.statusText };
  }
};

export class GraphQLClient {
  private readonly url: string;
  private readonly options: ClientOptions;

  constructor(url: string, options: ClientOptions = {}) {
    this.url = url;
    this.options = options;
  }

  async request<Result>({
    document,
    variables,
    requestHeaders,
    signal,
  }: {
    document: string;
    variables?: unknown;
    requestHeaders?: unknown;
    signal?: AbortSignal | null;
  }): Promise<Result> {
    const initial: RequestInput = {
      url: this.url,
      method: 'POST',
      headers: headersOf(requestHeaders),
      body: JSON.stringify({ query: document, variables }),
      signal,
    };
    const { url, ...init } = (await this.options.requestMiddleware?.(initial)) ?? initial;

    const response = await fetch(url, init as RequestInit);
    const body = await bodyOf(response);

    if (!response.ok || (body.errors?.length ?? 0) > 0) {
      throw new ClientError({ ...body, status: response.status });
    }

    return body.data as Result;
  }
}
