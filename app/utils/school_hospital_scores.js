import { DATA_PATHS } from "../config/dataPaths.js";
import { loadJson } from "../services/dataService.js";
var buildingLat = 0;
var buildingLon = 0;
var schools = [];

async function fetchSchools(lon, lat, infrastructure) {
  document.getElementById("loading").style.display = "flex";
  buildingLon = parseFloat(lon);
  buildingLat = parseFloat(lat);

  try {
    const data = await loadJson(DATA_PATHS.scores);
    
    const locationData = data.find(entry => Math.abs(entry.long - buildingLon) < 1e-6 && Math.abs(entry.lati - buildingLat) < 1e-6);
    
    if (!locationData) {
      throw new Error("Location not found in precomputed data");
    }

    const infrastructureData = locationData[infrastructure + "s"] || [];
    
    if (infrastructureData.length === 0) {
      throw new Error(`No ${infrastructure} data found for this location`);
    }

    return setDistance(infrastructureData, infrastructure);
  } catch (error) {
  } finally {
    document.getElementById("loading").style.display = "none";
  }
}

function createDistanceBar(distance, color, infrastructure) {
  document.getElementById("info-elem").style.visibility = "visible"
  let barContainer = document.createElement("div");
  barContainer.style.display = "flex";
  barContainer.style.alignItems = "center";
  barContainer.style.margin = "10px 0px";

  let bar = document.createElement("div");
  let barWidth = distance * 10;
  bar.style.width = barWidth + "px";
  bar.style.height = "20px";
  bar.style.backgroundColor = color;
  bar.style.borderRadius = "3px";
  bar.style.textAlign = "center";
  bar.style.lineHeight = "20px";
  bar.style.color = "white";
  bar.style.fontSize = "14px";
  bar.style.marginRight = "10px";

  let distanceLabel = document.createElement("span");
  distanceLabel.innerText = `${distance.toFixed(2)} km to nearest ${infrastructure}`;
  distanceLabel.style.marginLeft = "10px";

  barContainer.appendChild(bar);
  barContainer.appendChild(distanceLabel);

  return barContainer;
}

function setDistance(infrastructureData, infrastructure) {
  let closest = infrastructureData.reduce((min, current) => (current.distance < min.distance ? current : min));

  let instructionsElement = document.getElementById("instructions");
  instructionsElement.innerHTML = "";

  let outputContainer = document.getElementById(`${infrastructure}-distance-output`);
  outputContainer.innerHTML = "";
  outputContainer.appendChild(createDistanceBar(closest.distance, infrastructure === "school" ? "#db3447" : "#3498db", infrastructure));

  return closest;
}

export { fetchSchools };


