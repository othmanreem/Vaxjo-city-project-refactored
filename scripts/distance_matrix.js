// Optional data-generation script. Requires a running local save endpoint.
// Use `node scripts/distance_matrix.js` only when you intend to regenerate scores.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import 'dotenv/config';
const __dirname = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(await readFile(resolve(__dirname, '../public/data/buildings/wgs84-vaxjo-osm-building-heights-ym-subtract-mhm-15-11-2024.geojson'), 'utf8'));
// Max number of lat and lon pairs that can be send to ors api each request
var threshold = 2460;
var counter = 0;
var rounds = 0;
var pairedData = [];
var coordsColectionhospitals = [];
var hospitals = data.features.filter(
  (d) => d.properties.building === "hospital"
);
for (let i = 0; i < hospitals.length; i++) {
  let coordsOb = [];
  let long = hospitals[i].geometry.coordinates[0][0][0][0];
  let lati = hospitals[i].geometry.coordinates[0][0][0][1];
  coordsOb.push(long, lati);
  coordsColectionhospitals.push(coordsOb);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Initialize the process
async function init() {
  pairedData = [];
  if (threshold == counter) {
  } else {
    let housesArray = data.features.filter(
      (d) => d.properties.building === "house"
    );

    let housesArrayLength = housesArray.length;

    let shortArr = housesArray.slice(counter, threshold);
    for (let i = 0; i < shortArr.length; i++) {
      let houseObject = {
        long: shortArr[i].geometry.coordinates[0][0][0][0],
        lati: shortArr[i].geometry.coordinates[0][0][0][1],
        hospitals: [],
      };
      pairedData.push(houseObject);
    }

    let formatedArray = await divideData(housesArrayLength, shortArr);
  }
}

// Divides data into smaller arrays to make it fit the ors request
async function divideData(length, shortArr) {
  let formatedCoords = await formatCoords(shortArr);

  counter = threshold;
  rounds += 1;
  if (length - rounds * counter < 2460) {
    threshold = length;
    init();
  } else if (length - rounds * counter > 2460) {
    counter += 2460;
    threshold = counter + 2460;
    init();
  }
}
// Creates an array that contains data formated as objects that have lon and lat coordinates as properties
async function formatCoords(array) {
  let coordsColectionArray = [];
  for (let i = 0; i < array.length; i++) {
    let coordsOb = [];
    let long = array[i].geometry.coordinates[0][0][0][0];
    let lati = array[i].geometry.coordinates[0][0][0][1];
    coordsOb.push(long, lati);
    coordsColectionArray.push(coordsOb);
  }
  for (let i = 0; i < coordsColectionhospitals.length; i++) {
    fetches(coordsColectionArray, coordsColectionhospitals[i]);
    // Wait 2.5 seconds before inviking the function to make fetches to not overload the server with too many requests
    await delay(2500);
  }
}
// Fetctes the distances
async function fetches(coordsArray, schoolCoords) {
  coordsArray.unshift(schoolCoords);

  let url = "https://api.openrouteservice.org/v2/matrix/driving-car";
  let headers = {
    Accept:
      "application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8",
    "Content-Type": "application/json",
    Authorization: process.env.ORS_API_KEY,
  };
  let body = JSON.stringify({
    locations: coordsArray,
    metrics: ["distance"],
    units: "km",
    sources: [0],
  });

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: headers,
      body: body,
    });
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    coordsArray.shift();
    pairData(coordsArray, schoolCoords, data);

    if (!data) {
      alert("the path to this huose is not registered");
    }
  } catch (error) {}
}
// Pairs the distances with between too points with the correct lat and lon coordinates for the two points
async function pairData(coords, schoolCoords, data) {
  let distancesArr = data.distances[0];

  distancesArr.shift();

  for (let i = 0; i < coords.length; i++) {
    if (
      coords[i][0] == pairedData[i].long &&
      coords[i][1] == pairedData[i].lati
    ) {
      let schoolOb = {
        lon: schoolCoords[0],
        lat: schoolCoords[1],
        distance: distancesArr[i],
      };

      pairedData[i].hospitals.push(schoolOb);
    }
    if (pairedData[pairedData.length - 1].hospitals.length == 5) {
      saveJsonFile(pairedData);
    }
  }
}
// Calls the back-end end point to take care of the data processing and saving in the filesystem
async function saveJsonFile(data) {
  let res = await fetch("http://localhost:3001/save", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ data: data }),
  });
}

export { init };
