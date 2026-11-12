# Växjö City Project — Refactored

An interactive 3D geospatial visualization application for exploring Växjö's urban infrastructure, residential buildings, accessibility, and spatial relationships.

The project uses **deck.gl**, JavaScript, and Vite to visualize geographic data and support interactive urban analysis.

## Features

- **Interactive 3D map:** Explore buildings, roads, and geographic infrastructure.
- **Layer controls:** Toggle residential buildings, schools, hospitals, roads, and basemap layers.
- **Building simulation:** Create virtual buildings at selected locations.
- **Distance visualization:** Visualize residential buildings as color-coded scatterplots based on their distance to a simulated building.
- **Route planning:** Calculate and visualize driving routes between two selected locations.
- **Accessibility analysis:** Explore distance-based accessibility scores for schools and hospitals.

## Prerequisites

Before running the project, make sure you have:

- [Node.js](https://nodejs.org/) and npm installed.
- An API key from [OpenRouteService (ORS)](https://openrouteservice.org/dev/#/signup).
- Any required map-provider credentials. See [OpenStreetMap](https://www.openstreetmap.org/) for OSM information. OpenStreetMap itself does not issue a general-purpose API key.
- The required GeoJSON and JSON datasets.

## Installation and Setup

### 1. Clone the repository

```bash
git clone <https://github.com/othmanreem/Vaxjo-city-project-refactored.git>
cd Vaxjo-city-project-refactored
```

Alternatively, download and extract the project ZIP.

### 2. Configure API keys

Obtain your own API credentials and add them to the `.env` file in the project root.

```dotenv
ORS_API_KEY=your_openrouteservice_api_key
VITE_CARTO_API_KEY=
```

Replace the placeholder values with your credentials where required.



### 3. Install dependencies

```bash
npm install
```

### 4. Build the project

```bash
npm run build
```

This generates the production build in the `dist/` directory.

### 5. Start the application

```bash
npm run start
```

Open the local URL displayed in the terminal. Alternatively, if your `package.json` provides a development script, use `npm run dev`.

## Project Structure

```text
Vaxjo-city-project-refactored/
├── app/
│   ├── config/       # API configuration and data paths
│   ├── layers/       # Geographic visualization layers
│   ├── services/     # Data loading and routing requests
│   ├── utils/        # Distance and accessibility calculations
│   └── app.js        # Main application
├── public/
│   ├── data/         # Geographic datasets
│   └── assets/       # Static assets
├── scripts/          # Data-processing scripts
├── styles/           # Application styles
├── index.html        # Main visualization interface
├── welcome.html
├── about.html
├── info.html
├── .env              # Local environment configuration
├── package.json
├── vite.config.js
└── README.md
```

## Troubleshooting


**Port already in use:** Run `npm run dev -- --port 3001`.

**Build errors:** Make sure dependencies are installed and your Node.js version is compatible. Inspect the terminal output for the specific error.

## Technologies

JavaScript (ES Modules), HTML5, CSS3, Vite, deck.gl, GeoJSON, OpenRouteService, and OpenStreetMap-based geographic data.

## Research Context

This project explores interactive geospatial visualization for urban infrastructure analysis. It supports investigation of spatial accessibility and the potential impact of simulated buildings on surrounding residential areas.


