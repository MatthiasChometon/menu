import { unwrapResolverError } from '@apollo/server/errors';
import { HttpException, HttpStatus } from '@nestjs/common';
import type { GraphQLFormattedError } from 'graphql';

const CODE_BY_STATUS: Partial<Record<number, string>> = {
  [HttpStatus.BAD_REQUEST]: 'BAD_USER_INPUT',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHENTICATED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.CONFLICT]: 'CONFLICT',
  [HttpStatus.TOO_MANY_REQUESTS]: 'TOO_MANY_REQUESTS',
};

const FALLBACK_CODE = 'INTERNAL_SERVER_ERROR';

export const codeOfStatus = (status: number): string => CODE_BY_STATUS[status] ?? FALLBACK_CODE;

// What reaches here without being an HttpException either carries a code of its
// own (a malformed query, the rate limiter) or escaped the filter, which guards
// resolvers only — a failure in the context factory, a plugin. The latter has
// no code worth trusting and a message nobody vetted.
const withoutLeakedMessage = (formatted: GraphQLFormattedError): GraphQLFormattedError => {
  const code = formatted.extensions?.code;
  if (code !== undefined && code !== FALLBACK_CODE) return formatted;

  return {
    ...formatted,
    message: 'Internal server error.',
    extensions: { ...formatted.extensions, code: FALLBACK_CODE },
  };
};

// Gives every error thrown by a resolver or a guard a stable `extensions.code`
// a client can switch on. Replaces the driver's own mapping (which knew four
// statuses and called the rest INTERNAL_SERVER_ERROR) so a 404 or a 409 is not
// indistinguishable from a crash. Errors that are not HttpExceptions (parse and
// validation errors of the query itself, the rate limiter) already carry a code.
export const formatGraphqlError = (
  formatted: GraphQLFormattedError,
  error: unknown,
): GraphQLFormattedError => {
  const original = unwrapResolverError(error);
  if (!(original instanceof HttpException)) return withoutLeakedMessage(formatted);

  return {
    ...formatted,
    message: original.message,
    extensions: {
      ...formatted.extensions,
      code: codeOfStatus(original.getStatus()),
      // What the exception chose to tell the client, e.g. the list of fields a
      // validation pipe rejected.
      originalError: original.getResponse(),
    },
  };
};
