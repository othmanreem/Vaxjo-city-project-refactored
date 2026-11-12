import { makeBuildingLayer } from './buildingLayer.js';
export function makeInfrastructureLayer({type, data, height, onClick}) {
  const colors = { schools: [244, 155, 81, 230], hospitals: [230, 95, 118, 230],
    'residential-buildings': [103, 136, 160, 210] };
  const name = {schools:'school',hospitals:'hospital','residential-buildings':'house'}[type];
  return makeBuildingLayer({id:type, data:data.features.filter(f=>f.properties?.building===name),
    height, color:colors[type], onClick});
}
