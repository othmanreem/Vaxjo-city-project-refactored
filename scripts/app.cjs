
/**
 * 
 * Coordinate 1: Longitude = 14.670962608460686, Latitude = 56.996821180672306
  Coordinate 2: Longitude = 14.91808548180446, Latitude = 57.154007449425265
 * 
 */

const proj4 = require("proj4");

// Define the EPSG:3857 (Web Mercator) and EPSG:4326 (WGS84) projections
//proj4.defs("EPSG:3857", "+proj=merc +lon_0=0 +k=1 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs");
//proj4.defs("EPSG:4326", "+proj=longlat +datum=WGS84 +no_defs");

// Define the coordinates in EPSG:3857
const coordinates = [
  [1633164.087021, 7723604.629157], // First coordinate pair
  [1660673.679445, 7755733.502829]  // Second coordinate pair
];

// Convert coordinates to latitude and longitude (EPSG:4326)
const latLonCoords = coordinates.map(coord => proj4("EPSG:3857", "WGS84", coord));

// Print the results
latLonCoords.forEach((coord, index) => {
  console.log(`Coordinate ${index + 1}: Longitude = ${coord[0]}, Latitude = ${coord[1]}`);
});