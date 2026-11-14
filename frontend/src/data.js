export const locations = [
  { id: "karachi", name: "Karachi", province: "Sindh", country: "Pakistan", lat: 24.8607, lng: 67.0011, code: "CASE 001", kind: "Coastal city investigation" },
  { id: "lahore", name: "Lahore", province: "Punjab", country: "Pakistan", lat: 31.5204, lng: 74.3587, code: "CASE 002", kind: "Inland city investigation" },
];

export const variables = [
  { id: "precipitation", name: "Precipitation", group: "WATER", unit: "mm", description: "Rain and snowfall accumulated over time.", icon: "droplets" },
  { id: "soil_moisture", name: "Soil moisture", group: "WATER", unit: "m³/m³", description: "Water held in the soil near the surface.", icon: "waves" },
  { id: "evaporation", name: "Evaporation", group: "WATER", unit: "mm", description: "Water moving from land and water into the air.", icon: "sun" },
  { id: "ndvi", name: "Vegetation greenness (NDVI)", group: "PLANTS", unit: "index", description: "A satellite-derived indicator of green vegetation.", icon: "sprout" },
  { id: "aerosols", name: "Aerosols / dust", group: "AIR", unit: "index", description: "Tiny particles suspended in the atmosphere.", icon: "wind" },
  { id: "temperature", name: "Air temperature", group: "HEAT", unit: "°C", description: "Near-surface air temperature over time.", icon: "thermometer" },
];

export const demoCases = [
  { id: "karachi", number: "001", title: "Karachi environmental investigation", location: "Karachi, Sindh, Pakistan", variable: "Awaiting selection", status: "DEMO TEMPLATE", description: "A coastal-city case file template. No scientific analysis has been loaded." },
  { id: "lahore", number: "002", title: "Lahore environmental investigation", location: "Lahore, Punjab, Pakistan", variable: "Awaiting selection", status: "DEMO TEMPLATE", description: "An inland-city case file template. No scientific analysis has been loaded." },
  { id: "comparison", number: "003", title: "Karachi vs Lahore", location: "Karachi + Lahore, Pakistan", variable: "Awaiting selection", status: "DEMO TEMPLATE", description: "A comparison template, available when compatible datasets are verified." },
];

export const demoNotice = "Illustrative interface only — no verified NASA data or computed analysis is loaded.";
