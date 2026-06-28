/**
 * Minimal Amadeus Self-Service API client with in-memory token caching.
 * Used by the flight and hotel tools. Returns `null` when credentials are
 * not configured so callers can gracefully fall back to web search.
 *
 * Get free test credentials at https://developers.amadeus.com
 * Set AMADEUS_CLIENT_ID and AMADEUS_CLIENT_SECRET.
 * Set AMADEUS_ENV=production to hit the production host.
 */

const HOST =
  process.env.AMADEUS_ENV === 'production'
    ? 'https://api.amadeus.com'
    : 'https://test.api.amadeus.com';

let cachedToken: { value: string; expiresAt: number } | null = null;

export function amadeusConfigured(): boolean {
  return Boolean(
    process.env.AMADEUS_CLIENT_ID && process.env.AMADEUS_CLIENT_SECRET,
  );
}

async function getToken(): Promise<string | null> {
  if (!amadeusConfigured()) return null;

  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.value;
  }

  const res = await fetch(`${HOST}/v1/security/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.AMADEUS_CLIENT_ID!,
      client_secret: process.env.AMADEUS_CLIENT_SECRET!,
    }),
  });

  if (!res.ok) {
    throw new Error(`Amadeus auth failed: ${res.status} ${await res.text()}`);
  }

  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    value: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
  return cachedToken.value;
}

/** GET a path on the Amadeus API with auth. `params` are appended as query. */
export async function amadeusGet<T = unknown>(
  path: string,
  params: Record<string, string | number | undefined>,
): Promise<T> {
  const token = await getToken();
  if (!token) throw new Error('Amadeus not configured');

  const url = new URL(`${HOST}${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
  }

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Amadeus ${path} failed: ${res.status} ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}
