import { DATA_PATHS } from './config/dataPaths.js';
import { API_CONFIG } from './config/api.js';
import { loadJson } from './services/dataService.js';
import { getDrivingRoute } from './services/routingService.js';
import { makeRoadLayer } from './layers/roadLayer.js';
import { makeInfrastructureLayer } from './layers/infrastructureLayers.js';
import { makeBuildingLayer } from './layers/buildingLayer.js';
import { Deck } from "@deck.gl/core";
import { TileLayer } from "@deck.gl/geo-layers";
import { BitmapLayer } from "@deck.gl/layers";
import { GeoJsonLayer } from "@deck.gl/layers";
import { TextLayer } from "@deck.gl/layers";
import { ScatterplotLayer } from "@deck.gl/layers";
import { CollisionFilterExtension } from "@deck.gl/extensions";
import { PathLayer } from "@deck.gl/layers";
import { fetchHouses } from "./utils/distance_impact.js";
import { fetchSchools } from "./utils/school_hospital_scores.js";


// Global variables and constants
async function initializeApp() {
const slider = document.getElementById("filter-slider");
const valueElem = document.getElementById("value-display");
const fromElem = document.getElementById("formId");
//const colorPicker = document.getElementById("picked-color");
const buildingBtn = document.getElementById("building-btn");

var geoJsonCheckboxes = document.getElementById("geojson");
var schoolsCheckboxes = document.getElementById("schools");
var hospitalsCheckboxes = document.getElementById("hospitals");
var latitudeElem = document.getElementById("latitude");
var longitudeElem = document.getElementById("longitude");
var radiusElem = document.getElementById("radius");
var buildingHightElem = document.getElementById("height");
var sidesElem = document.getElementById("sides");
var pathBtn = document.getElementById("path-btn");
var twoPointsPath = document.getElementById("distance");
var buildingDetailsElem = document.getElementById("new-building-form")
document.getElementById("info-elem").style.visibility = "hidden"

var HeatmapLayerCounter = 0;
let lastSimulationKey = null;
let lastSimulationRows = null;
var distance = 0;
var buildingHight = 0;
var longitude = 0;
var latitude = 0;
var newValue = 1;
var polygonCoordinates;
var latStart = 0;
var lonStart = 0;
var latEnd = 0;
var lonEnd = 0;
var pathLayerIdCounter = 0;
const CARTO_API_KEY = API_CONFIG.cartoKey;

var house = null;
var houseLat = 0;
var houseLon = 0;

var color = null;
var oneBuilding = null;
var path = null;
var schoolPathLayer = null;
var hospitalPathLayer = null;

var pathCreated = false;
var oneBuildingCreated = false;
var pathIsCreatting = false;
var scoreLayerActive = false;
var residentialsActive = false;
let legendCreated = false;

var buildingsColors = [];
var rgbColorArray = [6, 40, 140, 180];
var hightValues = [];
var selectedLayers = [];
var createdLayers = [];
var pathCoordinates = [];

slider.value = 0;
valueElem.textContent = 1;

const viridisColors = [
  [68, 1, 84],
  [72, 35, 116],
  [64, 67, 135],
  [52, 94, 141],
  [41, 120, 142],
  [32, 144, 140],
  [34, 167, 132],
  [68, 190, 112],
  [121, 209, 81],
  [181, 222, 43],
];
// Function to create a color scale
function getViridisColor(value) {
  let index = Math.floor(value * (viridisColors.length - 1));
  return viridisColors[index] || viridisColors[viridisColors.length - 1];
}
function createScatterPlotLegend() {
  const container = document.getElementById("indexes");
  if (!container) {
    console.error("Container with ID 'indexes' not found.");
    return;
  }

  const legendWrapper = document.createElement("div");
  legendWrapper.id = "legend-bar";
  legendWrapper.style.display = "flex";
  legendWrapper.style.alignItems = "center";
  legendWrapper.style.gap = "10px";
  legendWrapper.style.marginTop = "10px";

  const nearestLabel = document.createElement("span");
  nearestLabel.textContent = "Nearest";
  nearestLabel.style.fontSize = "14px";

  const legendBar = document.createElement("div");
  legendBar.style.width = "200px";
  legendBar.style.height = "20px";
  legendBar.style.borderRadius = "4px";
  legendBar.style.border = "1px solid #ccc";

  const gradientColors = viridisColors
    .map((rgb, index) => `rgb(${rgb.join(",")}) ${(index / (viridisColors.length - 1)) * 100}%`)
    .join(", ");
  legendBar.style.background = `linear-gradient(to right, ${gradientColors})`;

  const farthestLabel = document.createElement("span");
  farthestLabel.textContent = "Farthest";
  farthestLabel.style.fontSize = "14px";

  legendWrapper.appendChild(nearestLabel);
  legendWrapper.appendChild(legendBar);
  legendWrapper.appendChild(farthestLabel);
  container.appendChild(legendWrapper);
}

pathBtn.addEventListener("click", () => {
  if (document.getElementById("mapLayer").checked == false) {
    alert("Please select the map layer first.");
    return;
  }
  twoPointsPath.innerHTML = ""
  pathIsCreatting = true;
});

// Fetches a geojaon object to use it as tampla to create single polygons (buildings)
const [polygon, data] = await Promise.all([
  loadJson(DATA_PATHS.polygon),
  loadJson(DATA_PATHS.houses)
]);
    var houseData = data.features
    .filter((d) => d.properties.building === "house")

const tooltip = document.createElement("div");
tooltip.style.position = "absolute";
tooltip.style.zIndex = 1;
tooltip.style.pointerEvents = "none";
tooltip.style.backgroundColor = "#bbff00";
document.body.append(tooltip);

// Function to render information about the building when the user clicks on it
async function updateTooltip() {
  let bar = document.createElement("div");
  bar.style.backgroundColor = "#f00";
  bar.style.width = "100%";
  tooltip.appendChild(bar);
 
  if (house) {
    tooltip.style.display = "block";
    tooltip.style.left = `${houseLat}px`;
    tooltip.style.top = `${houseLon}px`;


    let address = "Address not provided";

    if (house.properties?.other_tags) {
      // Parse `other_tags` string to extract address fields
      const tags = house.properties.other_tags
        .split(",") // Split key-value pairs
        .map((tag) => tag.replace(/\"/g, "").trim()) // Remove quotes and trim spaces
        .reduce((acc, tag) => {
          const [key, value] = tag.split("=>");
          if (key && value) acc[key.trim()] = value.trim();
          return acc;
        }, {});

      // Construct the formatted address
      const city = tags["addr:city"] || "Unknown City";
      const houseNumber = tags["addr:housenumber"] || "N/A";
      const postcode = tags["addr:postcode"] || "N/A";
      const street = tags["addr:street"] || "N/A";

      address = `${city}, ${street}. ${houseNumber}, ${postcode}, `;
    }
    tooltip.innerHTML =
      house.geometry.coordinates[0][0][0] + "<br/>" + house.properties.building + "<br/>" +
      address;
  } else {
    tooltip.style.display = "none";
  }
  if (house && (
    house.properties.building === "house"
  )) {
    // hospitalPathLayer = null;
    // schoolPathLayer = null;
    let distanceArraySchool = await fetchSchools(
      house.geometry.coordinates[0][0][0][0],
      house.geometry.coordinates[0][0][0][1],
      "school"
    );
    let distanceArrayHospital = await fetchSchools(
      house.geometry.coordinates[0][0][0][0],
      house.geometry.coordinates[0][0][0][1],
      "hospital"
    );

    lonStart = house.geometry.coordinates[0][0][0][0];
    latStart = house.geometry.coordinates[0][0][0][1];
    lonEnd = distanceArraySchool.lon;
    latEnd = distanceArraySchool.lat;

    await getPathCoordinates("schoolPath", [219, 52, 71]);
    lonEnd = distanceArrayHospital.lon;
    latEnd = distanceArrayHospital.lat;

    await getPathCoordinates("hospitalPath", [52, 152, 219]);
    lonStart = 0;
    latStart = 0;
    lonEnd = 0;
    latEnd = 0;
  }
}
async function objectData({ object, x, y }) {
  
  house = object;
  houseLat = x;
  houseLon = y;
  //updateTooltip()
  if (scoreLayerActive == true){
   
   await updateTooltip()
   scoreLayerActive = false
  } else if (residentialsActive == true) {
    console.log('objectDATA is invoked')
    updateLayers();
  }
 
}
// Creates path between two points using a Deckgl layer
function creatPath(pathType, color) {
  pathLayerIdCounter += 1;

  const pathLayer = new PathLayer({
    id: "." + pathLayerIdCounter,
    data: [
      {
        pathCoordinates,
      },
    ],
    getColor: color,
    getPath: (d) => d.pathCoordinates,
    getWidth: 1,
    widthMinPixels: 4,
    parameters: {
      depthMask: false,
    },
    pickable: true,
  });
  if (pathType == "schoolPath") {
    schoolPathLayer = pathLayer;
  } else if (pathType == "hospitalPath") {
    hospitalPathLayer = pathLayer;
  } else if (pathType == "twoPointspath") {
    path = pathLayer;
    pathCreated = true;
  }
  if (pathIsCreatting == true) {
  twoPointsPath.innerHTML = distance.toFixed(2) + " km";
 }
  //updateLayers();
}

// Function to fetch the lat and lon coordinates at the necessary route nodes to create a path
async function getPathCoordinates(pathType, color) {
  return getDrivingRoute([lonStart, latStart], [lonEnd, latEnd])
    .then(async (JSONresponse) => {
      
      pathCoordinates = JSONresponse.features[0].geometry.coordinates;
      distance = JSONresponse.features[0].properties.summary.distance / 1000;
      
      await creatPath(pathType, color);
     
      // return creatPath(pathType, color);
    })
    .catch((error) => {
      console.error("Fetch Error:", error);
      return null;
    });
}

// Function to create the geometry for a single building from given coordinates
function generatePolygonCoordinates(radius, sides) {
  const coordinates = [];
  const earthRadius = 6371000;
  const centerLatRad = (Math.PI / 180) * latitude;
  const centerLonRad = (Math.PI / 180) * longitude;

  for (let i = 0; i < sides; i++) {
    const angle = (2 * Math.PI * i) / sides;

    const vertexLat = Math.asin(
      Math.sin(centerLatRad) * Math.cos(radius / earthRadius) +
        Math.cos(centerLatRad) *
          Math.sin(radius / earthRadius) *
          Math.cos(angle)
    );
    const vertexLon =
      centerLonRad +
      Math.atan2(
        Math.sin(angle) *
          Math.sin(radius / earthRadius) *
          Math.cos(centerLatRad),
        Math.cos(radius / earthRadius) -
          Math.sin(centerLatRad) * Math.sin(vertexLat)
      );

    coordinates.push([
      (180 / Math.PI) * vertexLon,
      (180 / Math.PI) * vertexLat,
    ]);
  }

  coordinates.push(coordinates[0]);

  return coordinates;
}
// Function to create a layer with a single builing using a Deckgl layer
function creatBuilding(buildingHight) {
  polygon.geometry.coordinates[0][0] = polygonCoordinates;
  let layerId = String(polygonCoordinates[0][0]);
  const layer = makeBuildingLayer({id: layerId, data: structuredClone(polygon),
    height: buildingHight, color: [21, 184, 166, 235]});
  oneBuildingCreated = true;
  //updateLayers()
  return layer;
}
// Function to create a layer with all the buildings in Växjö using a Deckgl layer
function createGeoJson(h) {
  buildingsColors = [];
  const geoJsonLayer = new GeoJsonLayer({
    id: "GeoJsonLayer",
    data: data,
    filled: true,
    bounds: [
      14.67096260846214, 56.82092301173761, 14.91808548180801,
      56.97853903724722,
    ],

    getFillColor: (f) => {
      let currentBuildingColor = [];
      let r = rgbColorArray[0];
      let b = rgbColorArray[1];
      let g = rgbColorArray[2];
      let a = rgbColorArray[3];
      let hight = Math.round(f.properties._mean);
      let dynamicRValue = hight * r;
      if (dynamicRValue > 255) {
        dynamicRValue = 255;
      } else if (dynamicRValue < 0 || dynamicRValue == -0) {
        dynamicRValue = 0;
      }

      currentBuildingColor.push(dynamicRValue, b, g, 255);
      hightValues.push(f.properties._mean);

      buildingsColors.push(currentBuildingColor);
      //return currentBuildingColor;
      return [130,130,130, 255]
    },
    getLineColor: [255, 255, 255],
    pickable: true,
    onClick: objectData,
    autoHighlight: true,
    highlightColor: [60, 180, 60, 180],
    extruded: true,
    getElevation: (f) => f.properties._mean * h,

   // onClick: ({ object }) => {},
  });

  const result = buildingsColors.reduce(
    (acc, color) => {
      if (color[0] > acc.maxR[0]) acc.maxR = color;
      if (color[0] < acc.minR[0]) acc.minR = color;
      return acc;
    },
    {
      maxR: buildingsColors[0] || [0,0,0],
      minR: buildingsColors[0] || [0,0,0],
    }
  );

  return geoJsonLayer;
}

// Function to create a layer with given labels for building in Växjö, using a Deckgl layer
function createText() {
  const textLayer = new TextLayer({
    id: "text",
    data: data.features,
    extensions: [new CollisionFilterExtension()],
    getCollisionPriority: (d) => d.properties._mean,
    type: "textLayer",
    pickable: true,
    getPixelOffset: [2, 2],

    getPosition: (d) => {
      let lat = d.geometry.coordinates[0][0][0][0];
      let lon = d.geometry.coordinates[0][0][0][1];
      let zIx = d.properties._mean + 60;
      return [lat, lon, zIx];
    },
    getText: (d) => {
      let buildingType = d.properties.building;
      if (buildingType === "yes") {
        return;
      } else {
        return d.properties.building;
      }
    },

    getColor: [255, 0, 0], //#FFFF00
    getSize: (d) => {
      return 20;
    },

    getAngle: 0,
    getTextAnchor: "middle",
    getFont: "Arial",
  });
  return textLayer;
}

// Function to simulate satellite layer of Växjö, using a Deckgl layer
function createTileLayer() {
  const tileLayer = new TileLayer({
    id: "TileLayer",
    data: DATA_PATHS.tiles,

    maxZoom: 19,
    minZoom: 10,
    extent: [
      14.67096260846214, 56.82092301173761, 14.91808548180801,
      56.97853903724722,
    ],

    renderSubLayers: (props) => {
      const {
        bbox: { west, south, east, north },
      } = props.tile;

      return new BitmapLayer(props, {
        data: null,
        image: props.data,
        bounds: [west, south, east, north],
      });
    },

    pickable: true,
  });

  return tileLayer;
}
// Functions to create a basemap of Väcjö, using osm api and a Deckgl layer
function createmapLayer() {

  const mapLayer = new TileLayer({
    id: "TilemapLayer",
    data: `https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png${CARTO_API_KEY ? `?key=${encodeURIComponent(CARTO_API_KEY)}` : ''}`,
   // `https://cartodb-basemaps-a.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png?key=$REDACTED`,
    //`https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=REDACTED`,
   //`https://cartodb-basemaps-a.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png?key=$REDACTED`,

    maxZoom: 19,
    minZoom: 10,
    extent: [
      14.67096260846214, 56.82092301173761, 14.91808548180801,
      56.97853903724722,
    ],
    onClick: async (props) => {
      
      if (pathIsCreatting == true) {
        if (latStart == 0) {
          lonStart = props.coordinate[0];
          latStart = props.coordinate[1];
        } else if (latEnd == 0) {
          lonEnd = props.coordinate[0];
          latEnd = props.coordinate[1];

          await getPathCoordinates("twoPointspath", [0, 255, 0]);
          lonStart = 0;
          latStart = 0;
          lonEnd = 0;
          latEnd = 0;
          updateLayers();
        }
      } else {
        if (buildingDetailsElem.open){
       
        longitudeElem.value = props.coordinate[0];
        latitudeElem.value = props.coordinate[1];
        radiusElem.value = 30;
        buildingHightElem.value = 7;
        sidesElem.value = 5;
        longitude = longitudeElem.value;
        latitude = latitudeElem.value;
      }
      }
      oneBuildingCreated = false;
    },
    renderSubLayers: (props) => {
      const {
        bbox: { west, south, east, north },
      } = props.tile;

      return new BitmapLayer(props, {
        data: null,
        image: props.data,
        bounds: [west, south, east, north],
      });
    },

    pickable: true,
  });

  return mapLayer;
}
// Event listener for the form element to get the values needed to create a building and prompt the user in case worong input is being used
fromElem.addEventListener("submit", (e) => {
  e.preventDefault();

  let allValid = true;
  const inputs = fromElem.querySelectorAll("input");
  inputs.forEach((input) => {
    const value = input.value.trim();

    if (!/^-?\d+(\.\d+)?$/.test(value)) {
      allValid = false;
    }
  });

  if (allValid) {
    let buildingRadius = radiusElem.value;
    let buildingSides = sidesElem.value;
    buildingHight = buildingHightElem.value;

    polygonCoordinates = generatePolygonCoordinates(
      buildingRadius,
      buildingSides
    );

    oneBuilding = creatBuilding(buildingHight);
    updateLayers();
    inputs.forEach((input) => {
      input.value = "";
    });
  } else {
    alert("Please fill all fields with valid integers.");
  }
});
// Function to create a layer with the routes' network in Växjö, using a Deckgl layer
function createRoadLayer() { return makeRoadLayer(); }
// Function to create a layer dedicated to visualize only the schools, using a Deckgl layer
 function creatSchools(height, type) {
  return makeInfrastructureLayer({type, data, height, onClick: ({object,x,y}) => {
    if (object && type === 'residential-buildings') {
      residentialsActive = true;
      objectData({object,x,y});
    }
  }});
}
// Function to creat scatterplots that represent heatmaps for resedential building
function createSchoolsHeatmap(schoolsdata) {
  const distances = schoolsdata.map(row => row[2]).filter(Number.isFinite);
  const min = Math.min(...distances);
  const max = Math.max(...distances);
  const span = max - min || 1;
  if (!legendCreated) { createScatterPlotLegend(); legendCreated = true; }
  return new ScatterplotLayer({
    id: 'simulated-building-distance',
    data: schoolsdata,
    getPosition: row => [row[0], row[1]],
    getFillColor: row => [...getViridisColor(Math.max(0, Math.min(1, (row[2] - min) / span))), 215],
    getRadius: 12,
    radiusUnits: 'meters',
    radiusMinPixels: 3,
    radiusMaxPixels: 16,
    pickable: true,
    updateTriggers: { getFillColor: [min, max] }
  });
}

function generateColorStops(min, max, steps = 5) {

  const safeMin = Math.max(min, 0.5);
  let stops = [];

  for (let i = 0; i <= steps; i++) {
    // Interpolate log-scale values
    let logMin = Math.log(safeMin);
    let logMax = Math.log(max);
    let logValue = logMin + (i / steps) * (logMax - logMin);
    let value = Math.exp(logValue); // convert back to normal distance for display

    let color = interpolateColor(value, min, max);
    stops.push({ value, color });
  }

  return stops;
  
  // let stops = [];
  // for (let i = 0; i <= steps; i++) {
  //   let value = min + (i / steps) * (max - min);
  //   let color = interpolateColor(value, min, max);
  //   stops.push({ value, color });
  // }
  // return stops;
}

function createLegend(containerId, min, max) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = ""; 
 
  const stops = generateColorStops(min, max, 10); 

  stops.forEach((stop) => {
    let div = document.createElement("div");
    div.style.backgroundColor = `rgb(${stop.color[0]}, ${stop.color[1]}, ${stop.color[2]})`;
    div.style.width = `${100 / stops.length}%`;
    div.style.height = "20px";
    div.style.display = "inline-block";
    container.appendChild(div);
  });


  
  container.insertAdjacentHTML("afterbegin", `<div style="text-align: left;">${min} km</div>`);
  container.insertAdjacentHTML("beforeend", `<div style="text-align: right; margin-top: 0px">${max} km</div>`);
}

function interpolateColor(value, min, max) {

  const safeMin = Math.max(min, 0.5);
  const safeValue = Math.max(value, 0.5);

  // Apply logarithmic normalization
  let logMin = Math.log(safeMin);
  let logMax = Math.log(max);
  let logValue = Math.log(safeValue);

  let t = (logValue - logMin) / (logMax - logMin);
  t = Math.max(0, Math.min(1, t)); // Clamp between 0 and 1

  let color1 = [175, 141, 195]; // Purple
  let color2 = [127, 191, 123]; // Green
  let color3 = [145, 207, 96];  // Lime

  let color;
  if (t < 0.5) {
    let t1 = t * 2;
    color = [
      Math.round(color1[0] + t1 * (color2[0] - color1[0])),
      Math.round(color1[1] + t1 * (color2[1] - color1[1])),
      Math.round(color1[2] + t1 * (color2[2] - color1[2]))
    ];
  } else {
    let t2 = (t - 0.5) * 2;
    color = [
      Math.round(color2[0] + t2 * (color3[0] - color2[0])),
      Math.round(color2[1] + t2 * (color3[1] - color2[1])),
      Math.round(color2[2] + t2 * (color3[2] - color2[2]))
    ];
  }

  return color;

}

function scoresLayer (value) {

 
  let min, max;
  if (value === "nearest_school") {
    min = 0;
    max = 8.18;
  } else if (value === "nearest_hospital") {
    min = 2.31;
    max = 22.3;
  }
  createLegend("legendDiv", min, max);
  
  let layer =  new GeoJsonLayer({
    id: "scoreLayer",
    data: houseData,
    filled: true,

    getFillColor: (f) => {
      let dist = 0, min = 0, max = 1;

      if (value === "nearest_school") {
        // document.getElementById("nearest_school").checked = true
        dist = f.properties.nearest_school_distance;
        min = 0;
        max = 8.18;  
      } else if (value === "nearest_hospital") {
        dist = f.properties.nearest_hospital_distance;
        min = 2.31;
        max = 22.3; 
      }

      return interpolateColor(dist, min, max);
    },
    
    getLineColor: [255, 255, 255],
     pickable: true,
     autoHighlight: true,
     highlightColor: [60, 180, 60, 180],
    extruded: true,
    getElevation: (f) => f.properties._mean * newValue,

    updateTriggers: {  
      getFillColor: value
    },
    onClick: async ({ object, x, y }) => {
      scoreLayerActive = true
       await objectData({ object, x, y });
       document.getElementById("school-distance-output").style.visibility = "visible";
       document.getElementById("hospital-distance-output").style.visibility = "visible";
        updateScore(value)
     
    }
  
   // onClick: objectData,
  });

  return layer
  
}
const deck = new Deck({
  // getTooltip: ({ object }) =>
  //   object &&
  //   `Coords:${object.geometry.coordinates[0][0][0]} \n Building Type: ${object.properties.building} `,
  initialViewState: {
    longitude: 14.80906,
    latitude: 56.87767,
    zoom: 14,
  },
  canvas: "deckGlCanvas",

  controller: true,
  onViewStateChange: ({viewState}) => {
    tooltip.innerHTML = "";
   // applyViewStateConstraints(viewState)
  },
  layers: [],
});
// Function to call the functions responsible for creating diffrent layers and assing them to the layers propety of the deck object
let activeSimulationController = null;
let activeLayerRequest = 0;
function setSimulationLoading(active, message = 'Calculating distances…') {
  const indicator = document.getElementById('loading');
  if (indicator) {
    indicator.style.display = active ? 'flex' : 'none';
    indicator.setAttribute('role', 'status');
    indicator.setAttribute('aria-live', 'polite');
    const label = indicator.querySelector('.loading-label');
    if (label) label.textContent = message;
  }
}
async function createLayers(layers) {
  const requestId = ++activeLayerRequest;
  activeSimulationController?.abort();
  activeSimulationController = new AbortController();
  const signal = activeSimulationController.signal;
  createdLayers = [];

  for (let i = 0; i < layers.length; i++) {
    if (layers[i] === "geojson") {
      createdLayers.push(createGeoJson(newValue));
    } else if (layers[i] === "textLayer") {
      createdLayers.push(createText());
    } else if (layers[i] === "mapLayer") {
      createdLayers.push(createmapLayer());
    } else if (layers[i] === "satellite") {
      createdLayers.push(createTileLayer());
    } else if (layers[i] === "roadLayer") {
      createdLayers.push(createRoadLayer());
    } else if (layers[i] === "schools") {
      createdLayers.push(creatSchools(newValue, "schools"));
    } else if (layers[i] === "hospitals") {
      createdLayers.push(creatSchools(newValue, "hospitals"));
    } else if (layers[i] === "residential-buildings") {
      createdLayers.push(creatSchools(newValue, "residential-buildings"));
    } else if (layers[i] === "createOneBuilding") {
    } else if (layers[i] === "creatPath") {
      createdLayers.push(path);
    }
  }
  // hospitalsCheckboxes.disabled = false;
  // schoolsCheckboxes.disabled = false;
  if (house != null) {
    await updateTooltip();
    //updateTooltip()
    if (
      hospitalsCheckboxes.checked != true &&
      schoolsCheckboxes.checked != true
    ) {
      createdLayers.push(creatSchools(newValue, "schools"));
      schoolsCheckboxes.checked = true;
      //schoolsCheckboxes.disabled = true;
      createdLayers.push(creatSchools(newValue, "hospitals"));
      hospitalsCheckboxes.checked = true;
      //hospitalsCheckboxes.disabled = true;

    }
    if (hospitalPathLayer) createdLayers.push(hospitalPathLayer);
    if (schoolPathLayer) createdLayers.push(schoolPathLayer);
  }
  if (oneBuilding != null) {
    createdLayers.push(oneBuilding);
    // Render the new building immediately, even while the distance matrix loads.
    deck.setProps({ layers: createdLayers.filter(Boolean) });
    try {
      const driving = Boolean(document.getElementById('driving-distances')?.checked);
      const simulationKey = `${longitude},${latitude}:${driving}`;
      const drawRows = rows => {
        if (requestId !== activeLayerRequest || signal.aborted || !rows?.length) return;
        const withoutOld = createdLayers.filter(layer => layer?.id !== 'simulated-building-distance');
        createdLayers = [...withoutOld, createSchoolsHeatmap(rows)];
        deck.setProps({ layers: createdLayers.filter(Boolean) });
      };
      if (simulationKey === lastSimulationKey && lastSimulationRows) {
        drawRows(lastSimulationRows);
      } else {
        setSimulationLoading(true, driving ? 'Preparing distance map and driving routes…' : 'Calculating distances…');
        const distancesArray = await fetchHouses(longitude, latitude, data, {
          driving, signal,
          onProgress: ({ rows, done, total, method, complete, error }) => {
            drawRows(rows);
            if (complete) {
              if (requestId === activeLayerRequest) {
                lastSimulationKey = simulationKey;
                lastSimulationRows = rows;
                setSimulationLoading(false);
                if (error) {
                  const status = document.getElementById('distance-method-status');
                  if (status) status.textContent += ` · Routing failed (${error}); showing straight-line distances`;
                }
              }
            } else if (driving) {
              setSimulationLoading(true, `Calculating driving distances: ${done} of ${total} buildings…`);
            }
          }
        });
        if (requestId === activeLayerRequest) {
          lastSimulationKey = simulationKey;
          lastSimulationRows = distancesArray;
          drawRows(distancesArray);
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') return;
      console.error('Unable to display simulated-building distances:', error);
      const status = document.getElementById('distance-method-status') || document.createElement('p');
      status.id = 'distance-method-status';
      status.textContent = `Distance visualization unavailable: ${error.message}`;
      document.getElementById('indexes')?.appendChild(status);
    }
  }

  if (requestId !== activeLayerRequest || signal.aborted) return;
  setSimulationLoading(false);
  deck.setProps({ layers: createdLayers.filter(Boolean) });
  hospitalPathLayer = null;
  schoolPathLayer = null;
}
// Event listener to update the hight of the buildings
slider.addEventListener("input", () => {
  newValue = parseInt(slider.value, 10);
  valueElem.textContent = newValue;
  let residentialCheckboxes = document.getElementById("residential-buildings");
  geoJsonCheckboxes.checked = false;
  schoolsCheckboxes.checked = false;
  hospitalsCheckboxes.checked = false;
  residentialCheckboxes.checked = false;
  updateLayers();
});

// Function to update the layers based on which layers are check or modified (either color or height change)
function updateLayers() {
  let geoJsonCheckboxes = document.getElementById("geojson");
  let mapCheckboxes = document.getElementById("mapLayer");
  mapCheckboxes.checked = true
  selectedLayers = [];
  //document.getElementById("info-elem").style.visibility = "hidden"
  document.getElementById("school-distance-output").style.visibility = "hidden"
  document.getElementById("hospital-distance-output").style.visibility = "hidden"
  //document.getElementById("legendDiv").style.visibility = "hidden"


  const checkboxes = document.querySelectorAll('input[name="layer"]:checked');

  checkboxes.forEach((checkbox) => {
    if (checkbox.value === "geojson") {
      geoJsonCheckboxes.checked = true;
      selectedLayers.push("geojson");
    } else if (checkbox.value === "textLayer") {
      selectedLayers.push("textLayer");
    } else if (checkbox.value === "mapLayer") {
      selectedLayers.push("mapLayer");
    } else if (checkbox.value === "satellite") {
      selectedLayers.push("satellite");
    } else if (checkbox.value === "roadLayer") {
      selectedLayers.push("roadLayer");
    } else if (checkbox.value === "schools") {
      selectedLayers.push("schools");
    } else if (checkbox.value === "hospitals") {
      selectedLayers.push("hospitals");
    } else if (checkbox.value === "residential-buildings") {
      selectedLayers.push("residential-buildings");
    }
  });
  if (oneBuildingCreated == true) {

  }
  if (pathCreated == true) {
    selectedLayers.push("creatPath");
    pathIsCreatting = false;
  }
  createLayers(selectedLayers).catch(error => {
    if (error.name !== 'AbortError') console.error('Map update failed:', error);
    setSimulationLoading(false);
  });
  return "hello";
}
updateLayers();
async function updateScore (value) {
  let colorScale = [];
  let hospitalScore =  document.getElementById("nearest_hospital");
let schoolScore =   document.getElementById("nearest_school");

  document.getElementById("legendDiv").style.visibility = "visible"
  document.getElementById("info-elem").style.visibility = "visible"
  let scoresArr = [createmapLayer()]; // Reset the layers array
  if(schoolPathLayer != null && hospitalPathLayer != null){
    
    scoresArr.push(schoolPathLayer,hospitalPathLayer)
   }
  if (value === "nearest_school" && schoolScore.checked == true) {
   hospitalScore.checked = false;
    colorScale = [[0, 128, 0], [255, 255, 0], [255, 165, 0]];
    scoresArr.push(creatSchools(newValue, "schools"));
  } else if (value === "nearest_hospital" && hospitalScore.checked == true) {
    schoolScore.checked = false;
    colorScale = [[0, 0, 255], [128, 0, 128], [255, 192, 203]];
    scoresArr.push( creatSchools(newValue, "hospitals"));
  } 
let scores = await scoresLayer(value)
  scoresArr.push(scores); 
  if (schoolScore.checked == false && hospitalScore.checked == false){
    scoresArr = []
   scoresArr.push(createmapLayer())
  }
  deck.setProps({ layers: scoresArr }); 
 house = null

}
// Function to convert the format of the color code to make it compatible to use as a value for the  getColor method in the buldings layer
function hexToRGBA(hex, alpha = 180) {
  hex = hex.replace("#", "");
  let convertedColorArray = [];
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  convertedColorArray.push(r, g, b, alpha);
  return convertedColorArray;
}
// Function to modify the red value based on the slecrted color form the color palette in the interfsce
function modifyRed(hex, redValue) {
  const clampedRed = Math.max(0, Math.min(255, redValue));

  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  const modifiedHex = `#${clampedRed.toString(16).padStart(2, "0")}${g
    .toString(16)
    .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;

  return modifiedHex;
}



const layerCheckboxes = document.querySelectorAll('input[name="layer"]');
layerCheckboxes.forEach((checkbox) => {
  checkbox.addEventListener("change", () => {
    updateLayers();
  });
});
const scoreCheckboxes = document.querySelectorAll('input[name="score"]')
scoreCheckboxes.forEach((checkbox) => {
 
  checkbox.addEventListener("change", () => {
    // document.getElementById("school-distance-output").style.visibility = "hidden";
    // document.getElementById("hospital-distance-output").style.visibility = "hidden";
    updateScore(checkbox.value);
  });
});
}

initializeApp().catch((error) => {
  console.error("Failed to initialize the visualization:", error);
  const status = document.getElementById('app-status');
  if (status) { status.hidden = false; status.textContent = error.message; }
});
const sidebar = document.getElementById('mySidebar');
document.getElementById('closebtn')?.addEventListener('click', () => sidebar.classList.add('collapsed'));
document.getElementById('openbtn')?.addEventListener('click', () => sidebar.classList.remove('collapsed'));

// Switching calculation mode reuses the current simulated building.
document.getElementById('driving-distances')?.addEventListener('change', () => {
  lastSimulationKey = null;
  lastSimulationRows = null;
  updateLayers();
});
