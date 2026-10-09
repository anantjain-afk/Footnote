import { fetchWithAuth } from './authFetch'

const BASE = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'}/api/user/settings`

async function settingsResponse(response, fallback) {
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    const error = new Error(typeof body.detail === 'string' ? body.detail : fallback)
    error.status = response.status
    throw error
  }
  return response.json()
}

export async function getUserSettings() {
  return settingsResponse(await fetchWithAuth(BASE), 'Could not load your settings.')
}

export async function saveFirecrawlKey(firecrawlApiKey) {
  const response = await fetchWithAuth(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ firecrawl_api_key: firecrawlApiKey }),
  })
  return settingsResponse(response, 'Could not save your Firecrawl key.')
}

export async function deleteFirecrawlKey() {
  const response = await fetchWithAuth(`${BASE}/firecrawl`, { method: 'DELETE' })
  return settingsResponse(response, 'Could not remove your Firecrawl key.')
}
