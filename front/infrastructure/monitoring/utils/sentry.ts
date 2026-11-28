// The two functions the app uses, named. Importing the whole package as a
// namespace (`import('@sentry/vue')`) keeps every export of it in the bundle,
// tracing and replay included; this module is what the lazy chunk is made of.
export { captureException, init } from '@sentry/vue';
