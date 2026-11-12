import { GeoJsonLayer } from '@deck.gl/layers';
export function makeBuildingLayer({id, data, height = 1, color = [82, 119, 141, 210], onClick}) {
  return new GeoJsonLayer({ id, data, filled: true, stroked: true, extruded: true,
    getFillColor: color, getLineColor: [248, 250, 252, 160],
    getElevation: feature => (Number(feature.properties?._mean) || 0) * height,
    pickable: true, autoHighlight: true, highlightColor: [20, 184, 166, 210], onClick });
}
