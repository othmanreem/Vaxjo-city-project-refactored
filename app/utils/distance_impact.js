import { DATA_PATHS } from '../config/dataPaths.js';
import { loadJson } from '../services/dataService.js';
import { getDrivingMatrix } from '../services/routingService.js';

// The source is the SAME dataset used to draw the residential buildings.
// GeoJSON polygons may be Polygon or MultiPolygon, with variable nesting.
function collectRing(feature) {
  const geometry = feature?.geometry;
  if (!geometry) return null;
  if (geometry.type === 'Point') return [geometry.coordinates];
  if (geometry.type === 'Polygon') return geometry.coordinates?.[0];
  if (geometry.type === 'MultiPolygon') return geometry.coordinates?.[0]?.[0];
  return null;
}
function centroid(feature) {
  const ring = collectRing(feature);
  if (!Array.isArray(ring)) return null;
  const coords = ring.filter(p => Array.isArray(p) && Number.isFinite(+p[0]) && Number.isFinite(+p[1]));
  if (!coords.length) return null;
  // Ignore duplicate closing vertex if present.
  const points = coords.length > 1 && coords[0][0] === coords.at(-1)[0] && coords[0][1] === coords.at(-1)[1]
    ? coords.slice(0, -1) : coords;
  return [points.reduce((sum, p) => sum + +p[0], 0) / points.length,
    points.reduce((sum, p) => sum + +p[1], 0) / points.length];
}
function haversineKm(a, b) {
  const rad = Math.PI / 180;
  const dLat = (b[1] - a[1]) * rad;
  const dLon = (b[0] - a[0]) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(dLon / 2) ** 2;
  return 6371.0088 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}
function setMetrics(rows, method) {
  const valid = rows.map(r => r[2]).filter(Number.isFinite);
  const fairness = document.getElementById('fairness');
  const discrimination = document.getElementById('discrimination');
  if (valid.length) {
    const sum = valid.reduce((a, b) => a + b, 0);
    const sumSquares = valid.reduce((a, b) => a + b * b, 0);
    const equality = sumSquares ? sum * sum / (valid.length * sumSquares) : 1;
    if (fairness) fairness.textContent = `Fairness Index: ${(1 - equality).toFixed(4)}`;
    if (discrimination) discrimination.textContent = `Discrimination Index: ${equality.toFixed(4)}`;
  }
  const status = document.getElementById('distance-method-status') || document.createElement('p');
  status.id = 'distance-method-status';
  status.style.cssText = 'font-size:12px;line-height:1.5;margin-top:8px;';
  status.textContent = `${valid.length.toLocaleString()} residential buildings · ${method === 'driving' ? 'Driving distance (km)' : 'Straight-line distance (km; routing unavailable)'}`;
  document.getElementById('indexes')?.appendChild(status);
}

// Return [longitude, latitude, distanceInKm]. Show fast geographic results first;
// optional driving calculations update the plot progressively.
export async function fetchHouses(lon, lat, geojson, { driving = false, onProgress = () => {}, signal } = {}) {
  const origin = [Number(lon), Number(lat)];
  if (!origin.every(Number.isFinite)) throw new Error('Invalid simulated-building coordinates.');
  const data = geojson || await loadJson(DATA_PATHS.houses);
  if (!Array.isArray(data?.features)) throw new Error('Residential building GeoJSON is invalid.');
  const points = data.features
    .filter(f => ['house', 'yes', 'residential', 'apartments', 'detached', 'semidetached_house', 'terrace'].includes(String(f.properties?.building).toLowerCase()))
    .map(centroid).filter(Boolean);
  if (!points.length) throw new Error('No residential buildings found in updated_houses.geojson.');
  const direct = points.map(point => haversineKm(origin, point));
  let rows = points.map((point, i) => [...point, direct[i]]);
  setMetrics(rows, 'straight-line');
  onProgress({ rows, done: 0, total: points.length, method: 'straight-line', complete: !driving });
  if (!driving) return rows;

  const distances = [...direct];
  const batchSize = 40;
  let done = 0;
  try {
    for (let i = 0; i < points.length; i += batchSize) {
      if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
      const chunk = points.slice(i, i + batchSize);
      const result = await getDrivingMatrix([origin, ...chunk], { signal });
      const matrix = result?.distances?.[0];
      if (!Array.isArray(matrix) || matrix.length !== chunk.length + 1) {
        throw new Error('Incomplete routing matrix response');
      }
      for (let j = 0; j < chunk.length; j++) {
        if (Number.isFinite(matrix[j + 1])) distances[i + j] = matrix[j + 1];
      }
      done += chunk.length;
      rows = points.map((point, index) => [...point, distances[index]]);
      onProgress({ rows, done, total: points.length, method: 'mixed', complete: false });
    }
    rows = points.map((point, index) => [...point, distances[index]]);
    setMetrics(rows, 'driving');
    onProgress({ rows, done, total: points.length, method: 'driving', complete: true });
    return rows;
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    // Never present a partially computed matrix as a full driving-distance map.
    console.warn('Driving matrix unavailable; retaining straight-line distances:', error);
    rows = points.map((point, i) => [...point, direct[i]]);
    setMetrics(rows, 'straight-line');
    onProgress({ rows, done, total: points.length, method: 'straight-line', complete: true, error: error.message });
    return rows;
  }
}
