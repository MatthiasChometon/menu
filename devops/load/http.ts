import { check } from 'k6';
import http from 'k6/http';
import { Trend } from 'k6/metrics';
import type { RefinedResponse, ResponseType } from 'k6/http';
import { BUDGETS, OPERATION_CLASS } from './budgets.ts';
import type { BudgetClass, OperationName } from './budgets.ts';

export const API_URL = (__ENV['API_URL'] ?? 'http://127.0.0.1:3779').replace(/\/$/, '');

export type Who = 'anonymous' | 'reader' | 'admin' | 'device';

/** What one caller carries: a session cookie, and the token of the browser paired with it. */
export type Session = { cookie: string; deviceToken: string };

export const NOBODY: Session = { cookie: '', deviceToken: '' };

/** The operation judged, or `prep` for the calls that only build what a judged call consumes. */
export type Label = OperationName | 'prep';

type Answer = RefinedResponse<ResponseType | undefined>;

// A fresh jar for every request: the session travels in an explicit header, and a cookie the API
// sets (a login, a logout) must never leak into the next request of the same virtual user.
const paramsOf = (
  label: Label,
  headers: Record<string, string>,
  expected: number[],
): Parameters<typeof http.post>[2] => ({
  headers,
  jar: new http.CookieJar(),
  tags: { op: label, class: label === 'prep' ? 'prep' : OPERATION_CLASS[label] },
  responseCallback: http.expectedStatuses(...expected),
});

const headersFor = (who: Who, session: Session): Record<string, string> => {
  if (who === 'device') return { 'x-grocery-device-token': session.deviceToken };
  if (who === 'reader' || who === 'admin') return { cookie: session.cookie };

  return {};
};

export const classTrendName = (budgetClass: BudgetClass): string => `class_${budgetClass}_duration`;

// One trend per class of operation, for the profiles that put no threshold on the latency and
// would otherwise have no figures to report.
const CLASS_TRENDS = Object.fromEntries(
  (Object.keys(BUDGETS) as BudgetClass[]).map((budgetClass) => [
    budgetClass,
    new Trend(classTrendName(budgetClass), true),
  ]),
) as Record<BudgetClass, Trend>;

const verdict = (label: Label, answer: Answer, ok: boolean): boolean => {
  if (label !== 'prep') CLASS_TRENDS[OPERATION_CLASS[label]].add(answer.timings.duration);

  return check(answer, { [`${label} answered as expected`]: () => ok }, { op: label });
};

type GraphqlBody = { data?: Record<string, unknown>; errors?: unknown[] };

/** One GraphQL call. Returns the data, or undefined when the call did not go well. */
export const gql = (
  label: Label,
  who: Who,
  session: Session,
  query: string,
  variables?: object,
): Record<string, unknown> | undefined => {
  const headers = { ...headersFor(who, session), 'content-type': 'application/json' };
  const answer = http.post(
    `${API_URL}/graphql`,
    JSON.stringify({ query, variables }),
    paramsOf(label, headers, [200]),
  );
  const body = answer.status === 200 ? (answer.json() as GraphqlBody) : undefined;
  const data = body?.errors === undefined ? body?.data : undefined;
  verdict(label, answer, data !== undefined);

  return data;
};

export type RestOptions = {
  who?: Who;
  session?: Session;
  /** A JSON body, or the fields of a multipart form when `form` is set. */
  body?: Record<string, unknown>;
  form?: boolean;
};

/** One REST call, with the statuses that are the right answer for it. */
export const rest = (
  label: Label,
  method: 'GET' | 'POST',
  path: string,
  expected: number[],
  options: RestOptions = {},
): Answer => {
  const { who = 'anonymous', session = NOBODY, body, form = false } = options;
  const headers: Record<string, string> = headersFor(who, session);
  if (body !== undefined && !form) headers['content-type'] = 'application/json';
  const payload = body === undefined || form ? body : JSON.stringify(body);
  const params = { ...paramsOf(label, headers, expected), redirects: 0 };
  const answer =
    method === 'GET'
      ? http.get(`${API_URL}${path}`, params)
      : http.post(`${API_URL}${path}`, payload as http.RequestBody, params);
  verdict(label, answer, expected.includes(answer.status));

  return answer;
};

/** The session cookie out of a login answer, as the header the rest of the run sends. */
export const sessionCookieOf = (answer: Answer): string => {
  const value = answer.cookies['session']?.[0]?.value;

  return value === undefined ? '' : `session=${value}`;
};
