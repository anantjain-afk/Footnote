import { supabase, authConfigurationError } from '../lib/supabase';
import { responseError } from './apiError';

export async function getAuthHeaders() {
  if (!supabase) throw new Error(authConfigurationError);
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (session?.access_token) {
    return {
      'Authorization': `Bearer ${session.access_token}`
    };
  }
  throw new Error('Please sign in to continue.');
}

export async function fetchWithAuth(url, options = {}) {
  const headers = await getAuthHeaders();
  
  if (options.signal?.aborted) throw options.signal.reason;
  const mergedHeaders = new Headers(options.headers);
  Object.entries(headers).forEach(([name, value]) => mergedHeaders.set(name, value));
  const response = await fetch(url, { ...options, headers: mergedHeaders });
  if (response.status === 401) {
    throw await responseError(response, 'Your session could not be verified. Please sign in again.');
  }
  if (response.status === 429 || response.status === 503) throw await responseError(response);
  return response;
}
