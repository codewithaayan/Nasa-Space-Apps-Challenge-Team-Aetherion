export const locations = [
  { id: "karachi", name: "Karachi", province: "Sindh", country: "Pakistan", lat: 24.8607, lng: 67.0011, code: "CASE 001", kind: "Coastal city investigation" },
  { id: "lahore", name: "Lahore", province: "Punjab", country: "Pakistan", lat: 31.5204, lng: 74.3587, code: "CASE 002", kind: "Inland city investigation" },
  { id: "islamabad", name: "Islamabad", province: "Islamabad Capital Territory", country: "Pakistan", lat: 33.6844, lng: 73.0479, code: "CASE 003", kind: "Capital city investigation" },
  { id: "quetta", name: "Quetta", province: "Balochistan", country: "Pakistan", lat: 30.1798, lng: 66.975, code: "CASE 004", kind: "Highland city investigation" },
  { id: "peshawar", name: "Peshawar", province: "Khyber Pakhtunkhwa", country: "Pakistan", lat: 34.0151, lng: 71.5249, code: "CASE 005", kind: "Northwestern city investigation" },
  { id: "gilgit", name: "Gilgit", province: "Gilgit-Baltistan", country: "Pakistan", lat: 35.9208, lng: 74.308, code: "CASE 006", kind: "Mountain city investigation" },
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
  { id: "comparison", number: "007", title: "City-to-city comparison", location: "Choose two cities, Pakistan", variable: "Awaiting selection", status: "DEMO TEMPLATE", description: "A comparison template for any two cities, available when compatible datasets are verified." },
];

export const demoNotice = "Illustrative interface only — no verified NASA data or computed analysis is loaded.";
