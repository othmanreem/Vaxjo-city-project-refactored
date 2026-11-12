// Vite serves files under public/ from the site root. Do not include "public" in URLs.
export const DATA_PATHS = Object.freeze({
  polygon: '/data/buildings/polygon.geojson',
  houses: '/data/buildings/updated_houses.geojson',
  // Optional legacy dataset: the simulated-building heatmap no longer requires it.
  buildingHeights: '/data/buildings/wgs84-vaxjo-osm-building-heights-ym-subtract-mhm-15-11-2024.geojson',
  roads: '/data/roads/roads2.geojson',
  scores: '/data/scores/output.json',
  tiles: '/tiles/{z}/{x}/{-y}.png'
});
