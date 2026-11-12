// All requests go through Vite's same-origin proxy; the API key stays server-side.
const ORS_BASE = '/api/ors/v2';

async function jsonResponse(response, context) {
  if (!response.ok) {
    const raw = await response.text().catch(() => '');
    let detail = raw.slice(0, 300);
    try {
      const parsed = JSON.parse(raw);
      detail = parsed.error?.message || parsed.message || detail;
    } catch {}
    const hint = response.status === 404
      ? ' Check that the Vite proxy is configured and that the ORS endpoint is reachable.'
      : response.status === 401 || response.status === 403
        ? ' Check your ORS_API_KEY, account permissions and quota.' : '';
    throw new Error(`${context}: HTTP ${response.status}${detail ? ` — ${detail}` : ''}.${hint}`);
  }
  return response.json();
}

export async function getDrivingRoute(start, end, { signal } = {}) {
  if (![start, end].every(p => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite))) {
    throw new Error('Route coordinates must be [longitude, latitude] numeric pairs.');
  }
  // Explicit GeoJSON endpoint matches app.js's existing features[0] access.
  // POST avoids ambiguity between the directions JSON and GeoJSON variants.
  const response = await fetch(`${ORS_BASE}/directions/driving-car/geojson`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/geo+json' },
    body: JSON.stringify({ coordinates: [start, end] }),
    signal
  });
  return jsonResponse(response, 'Route request failed');
}

// Preserve the existing matrix API and payload for the distance scatterplots.
export async function getDrivingMatrix(locations, { signal } = {}) {
  const response = await fetch(`${ORS_BASE}/matrix/driving-car`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, signal,
    body: JSON.stringify({ locations, metrics: ['distance'], units: 'km', sources: [0] })
  });
  return jsonResponse(response, 'Distance matrix failed');
}
