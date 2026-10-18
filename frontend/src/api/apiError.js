export class ApiError extends Error {
  constructor(message, status, retryAfter = 0) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

export async function responseError(response, fallback = 'Request failed. Please try again.') {
  const body = await response.clone().json().catch(() => ({})) || {};
  const seconds = Number(body.reset_in_seconds ?? response.headers.get('Retry-After'));
  const retryAfter = Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : 0;
  const message = [body.message, body.detail].find(value => typeof value === 'string')
    || (response.status === 429 ? 'Rate limit reached. Please try again later.'
      : response.status === 503 ? 'Temporarily unavailable. Please try again shortly.' : fallback);
  return new ApiError(message, response.status, retryAfter);
}
