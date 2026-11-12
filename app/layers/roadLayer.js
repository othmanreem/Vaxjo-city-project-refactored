import { GeoJsonLayer } from '@deck.gl/layers';
import { DATA_PATHS } from '../config/dataPaths.js';
export function makeRoadLayer() {
  return new GeoJsonLayer({ id: 'roadLayer', data: DATA_PATHS.roads, stroked: true,
    filled: false, getLineColor: [221, 112, 88, 220], getLineWidth: 3,
    lineWidthMinPixels: 1, pickable: true });
}
