import assert from 'node:assert/strict';
import test from 'node:test';
import { responseError, ApiError } from '../src/api/apiError.js';

test('retains server rate-limit message, status, and retry timing', async () => {
  const response = Response.json({ message: 'Report limit reached', reset_in_seconds: 1380 },
    { status: 429, headers: { 'Retry-After': '1380' } });
  const error = await responseError(response);
  assert.ok(error instanceof ApiError);
  assert.equal(error.message, 'Report limit reached');
  assert.equal(error.status, 429);
  assert.equal(error.retryAfter, 1380);
});

test('handles non-JSON responses, Retry-After fallback, and unavailable service', async () => {
  const error = await responseError(new Response('proxy error', { status: 429, headers: { 'Retry-After': '3' } }));
  assert.equal(error.retryAfter, 3);
  const unavailable = await responseError(new Response('', { status: 503 }));
  assert.match(unavailable.message, /Temporarily unavailable/);
  assert.equal(unavailable.status, 503);
  assert.equal(unavailable.retryAfter, 0);
});

test('preserves authentication messages and ignores invalid retry values', async () => {
  const error = await responseError(Response.json({ detail: 'Sign in again' }, { status: 401 }));
  assert.equal(error.message, 'Sign in again');
  for (const reset of [-1, 'bad', null]) {
    const error = await responseError(Response.json({ reset_in_seconds: reset }, { status: 429 }));
    assert.equal(error.retryAfter, 0);
  }
});
