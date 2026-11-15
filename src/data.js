export const locations = [
  { id: "karachi", name: "Karachi", province: "Sindh", country: "Pakistan", lat: 24.8607, lng: 67.0011, code: "CASE 001", kind: "Coastal city investigation" },
  { id: "lahore", name: "Lahore", province: "Punjab", country: "Pakistan", lat: 31.5204, lng: 74.3587, code: "CASE 002", kind: "Inland city investigation" },
  // Approximate reference points follow the centres of the supplied export requests.
  { id: "gilgit", name: "Gilgit", province: "Gilgit-Baltistan", country: "Pakistan", lat: 35.92, lng: 74.31, code: "CASE 003", kind: "Mountain-region investigation" },
  { id: "islamabad", name: "Islamabad", province: "Islamabad Capital Territory", country: "Pakistan", lat: 33.68, lng: 73.05, code: "CASE 004", kind: "Capital-region investigation" },
  { id: "peshawar", name: "Peshawar", province: "Khyber Pakhtunkhwa", country: "Pakistan", lat: 34.01, lng: 71.58, code: "CASE 005", kind: "Valley-region investigation" },
  { id: "quetta", name: "Quetta", province: "Balochistan", country: "Pakistan", lat: 30.18, lng: 67.00, code: "CASE 006", kind: "Highland-region investigation" },
];

export const variables = [
  { id: "precipitation", name: "Precipitation", group: "WATER", unit: "mm", description: "Precipitation rate or amount, as defined by the source.", icon: "droplets" },
  { id: "soil_moisture", name: "Soil moisture", group: "WATER", unit: "m³/m³", description: "Water held in the soil near the surface.", icon: "waves" },
  { id: "evaporation", name: "Evaporation", group: "WATER", unit: "mm", description: "Evaporation and plant transpiration, as defined by the source.", icon: "sun" },
  { id: "ndvi", name: "Vegetation greenness (NDVI)", group: "PLANTS", unit: "index", description: "A satellite-derived indicator of green vegetation.", icon: "sprout" },
  { id: "aerosols", name: "Aerosols / dust", group: "AIR", unit: "index", description: "Investigate the selected aerosol measure; units depend on the source.", icon: "wind" },
  { id: "temperature", name: "Air temperature", group: "HEAT", unit: "°C", description: "Near-surface air temperature over time.", icon: "thermometer" },
];

export const demoCases = [
  { id: "karachi", number: "001", title: "Karachi environmental investigation", location: "Karachi, Sindh, Pakistan", variable: "Awaiting selection", status: "DEMO TEMPLATE", description: "A coastal-city case file template. No scientific analysis has been loaded." },
  { id: "lahore", number: "002", title: "Lahore environmental investigation", location: "Lahore, Punjab, Pakistan", variable: "Awaiting selection", status: "DEMO TEMPLATE", description: "An inland-city case file template. No scientific analysis has been loaded." },
  { id: "comparison", number: "003", title: "Karachi vs Lahore", location: "Karachi + Lahore, Pakistan", variable: "Awaiting selection", status: "DEMO TEMPLATE", description: "A comparison template, available when compatible datasets are verified." },
];

export const demoNotice = "Illustrative interface only — no verified NASA data or computed analysis is loaded.";
