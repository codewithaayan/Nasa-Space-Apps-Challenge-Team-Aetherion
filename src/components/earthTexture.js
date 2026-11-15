import * as THREE from "three";

/**
 * Creates a high-fidelity 2048x1024 equirectangular Earth texture
 * with realistic continental landmasses, biomes (forests, deserts, ice caps),
 * coastal continental shelves, and latitude/longitude graticule lines.
 */
export function createRealisticEarthTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");

  const W = canvas.width;
  const H = canvas.height;

  function toX(lon) {
    return ((lon + 180) / 360) * W;
  }
  function toY(lat) {
    return ((90 - lat) / 180) * H;
  }

  // 1. Deep Ocean Base with realistic marine depth gradient
  const oceanGrad = ctx.createRadialGradient(W / 2, H / 2, 80, W / 2, H / 2, W * 0.7);
  oceanGrad.addColorStop(0, "#081d33");
  oceanGrad.addColorStop(0.35, "#06182a");
  oceanGrad.addColorStop(0.7, "#041220");
  oceanGrad.addColorStop(1, "#030d17");
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, W, H);

  // Subtle bathymetric ridges
  ctx.strokeStyle = "rgba(14, 55, 88, 0.25)";
  ctx.lineWidth = 14;
  ctx.lineCap = "round";
  // Mid-Atlantic ridge
  ctx.beginPath();
  const atlRidge = [[-30, 70], [-25, 50], [-35, 30], [-40, 10], [-25, -10], [-15, -30], [-18, -55]];
  atlRidge.forEach(([lon, lat], i) => {
    const [x, y] = [toX(lon), toY(lat)];
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Draw a polygon given array of [lon, lat] coordinates
  function drawLandPoly(coords, shelf = false) {
    if (!coords || coords.length < 3) return;
    ctx.beginPath();
    coords.forEach(([lon, lat], i) => {
      const [x, y] = [toX(lon), toY(lat)];
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.closePath();
    if (shelf) {
      ctx.lineWidth = 12;
      ctx.strokeStyle = "rgba(23, 85, 115, 0.45)";
      ctx.stroke();
    }
  }

  // Raw Continent Geometries [lon, lat]
  const africaCoords = [
    [-5.6, 35.9], [3.0, 36.8], [10.2, 36.9], [15.0, 31.0], [25.0, 32.0], [32.0, 31.3],
    [33.0, 28.0], [38.0, 22.0], [43.3, 12.6], [51.2, 11.8], [45.3, 2.0], [41.0, -2.0],
    [40.5, -15.0], [35.5, -24.0], [31.0, -30.0], [20.0, -34.8], [18.5, -34.8],
    [15.0, -28.0], [14.5, -23.0], [12.0, -6.0], [9.0, 4.0], [5.0, 4.5], [0.0, 5.5],
    [-7.5, 4.5], [-11.0, 6.5], [-15.0, 11.0], [-17.5, 14.7], [-16.5, 21.0],
    [-13.0, 27.0], [-9.5, 30.5], [-5.6, 35.9]
  ];

  const eurasiaCoords = [
    [-9.5, 37.0], [-9.0, 42.0], [-1.5, 43.5], [-4.5, 48.5], [1.5, 50.5], [8.5, 55.0],
    [5.0, 62.0], [15.0, 68.0], [25.0, 71.0], [40.0, 67.0], [50.0, 68.0], [65.0, 70.0],
    [75.0, 72.0], [100.0, 76.0], [115.0, 74.0], [130.0, 72.0], [150.0, 71.0], [170.0, 65.0],
    [180.0, 65.0], [180.0, 60.0], [165.0, 58.0], [160.0, 52.0], [150.0, 47.0], [142.0, 50.0],
    [135.0, 47.0], [132.0, 43.0], [129.0, 36.0], [126.0, 34.0], [124.0, 39.0], [119.0, 38.0],
    [122.0, 31.0], [119.0, 26.0], [113.0, 22.0], [108.0, 15.0], [105.0, 9.0], [101.0, 12.0],
    [103.5, 1.3], [98.0, 10.0], [95.0, 16.0], [89.0, 22.0], [80.0, 16.0], [77.5, 8.0],
    [73.0, 19.0], [70.0, 23.0],
    // Pakistan & Karachi coastline (Makran coast & Indus Delta)
    [67.01, 24.86], [62.3, 25.1], [56.5, 26.5], [50.0, 27.0], [48.0, 30.0],
    // Arabian Peninsula
    [53.0, 24.0], [59.0, 22.5], [54.0, 17.0], [50.0, 14.5], [43.5, 12.6],
    [40.0, 20.0], [35.0, 28.0], [34.0, 31.0], [35.0, 33.0], [30.0, 36.5],
    // Anatolia & Mediterranean
    [26.0, 39.0], [35.0, 42.0], [39.0, 45.0], [30.0, 45.0], [23.0, 38.0],
    [16.0, 41.0], [12.5, 42.0], [10.0, 44.0], [3.0, 43.0], [-2.0, 37.0], [-5.6, 35.9]
  ];

  const northAmericaCoords = [
    [-168.0, 65.5], [-155.0, 71.0], [-140.0, 69.5], [-120.0, 69.0], [-95.0, 68.0],
    [-85.0, 63.0], [-80.0, 52.0], [-75.0, 50.0], [-64.0, 47.0], [-60.0, 55.0],
    [-67.0, 45.0], [-70.0, 42.0], [-76.0, 37.0], [-75.5, 35.0], [-80.0, 25.0],
    [-82.0, 28.0], [-90.0, 29.0], [-97.0, 26.0], [-97.5, 22.0], [-90.0, 21.0],
    [-88.0, 18.0], [-84.0, 10.0], [-79.0, 8.5], [-84.0, 9.5], [-93.0, 16.0],
    [-105.0, 20.0], [-110.0, 23.0], [-115.0, 32.0], [-120.0, 35.0], [-124.0, 47.0],
    [-128.0, 51.0], [-135.0, 57.0], [-145.0, 60.0], [-160.0, 58.0], [-168.0, 65.5]
  ];

  const southAmericaCoords = [
    [-79.0, 8.5], [-75.0, 11.0], [-65.0, 10.5], [-60.0, 8.0], [-55.0, 5.0],
    [-50.0, 0.0], [-42.0, -2.5], [-35.0, -8.0], [-38.0, -15.0], [-43.0, -23.0],
    [-48.0, -28.0], [-54.0, -34.0], [-58.0, -35.0], [-65.0, -42.0], [-65.0, -50.0],
    [-68.0, -54.5], [-74.0, -52.0], [-73.0, -40.0], [-70.0, -25.0], [-77.0, -12.0],
    [-81.0, -5.0], [-80.0, -1.0], [-77.0, 4.0], [-79.0, 8.5]
  ];

  const australiaCoords = [
    [142.0, -11.0], [146.0, -19.0], [153.0, -28.0], [151.0, -34.0], [145.0, -38.0],
    [138.0, -35.0], [130.0, -32.0], [115.0, -32.0], [114.0, -22.0], [122.0, -17.0],
    [131.0, -12.5], [136.0, -12.0], [138.0, -16.0], [142.0, -11.0]
  ];

  const greenlandCoords = [
    [-50.0, 60.0], [-40.0, 62.0], [-30.0, 66.0], [-20.0, 70.0], [-18.0, 77.0],
    [-25.0, 81.0], [-45.0, 83.0], [-60.0, 78.0], [-55.0, 70.0], [-50.0, 60.0]
  ];

  const antarcticaCoords = [
    [-180.0, -68.0], [-120.0, -72.0], [-80.0, -70.0], [-65.0, -64.0], [-55.0, -74.0],
    [0.0, -69.0], [45.0, -66.0], [90.0, -65.0], [120.0, -66.0], [150.0, -68.0],
    [170.0, -71.0], [180.0, -68.0], [180.0, -90.0], [-180.0, -90.0]
  ];

  const islands = [
    // UK & Ireland
    [[-5.0, 50.0], [1.7, 52.5], [-2.0, 58.0], [-5.5, 56.0], [-5.0, 50.0]],
    [[-10.0, 51.5], [-6.0, 53.0], [-8.0, 55.0], [-10.0, 51.5]],
    // Madagascar
    [[44.0, -12.0], [50.0, -15.0], [47.0, -25.0], [43.5, -24.0], [44.0, -12.0]],
    // Japan
    [[130.0, 31.0], [131.0, 33.0], [139.0, 35.5], [141.0, 43.0], [144.0, 44.0], [140.0, 38.0], [130.0, 31.0]],
    // Indonesia: Sumatra, Borneo, Java
    [[95.0, 5.5], [105.0, -6.0], [100.0, -1.0], [95.0, 5.5]],
    [[109.0, 0.0], [117.0, 4.0], [116.0, -4.0], [110.0, -3.0], [109.0, 0.0]],
    [[106.0, -6.0], [114.0, -8.0], [110.0, -7.0], [106.0, -6.0]],
    // Sri Lanka
    [[80.0, 6.0], [82.0, 8.5], [80.0, 9.5], [80.0, 6.0]],
    // New Zealand
    [[173.0, -35.0], [178.0, -38.0], [175.0, -41.0], [173.0, -35.0]],
    [[168.0, -46.5], [173.0, -41.5], [170.0, -43.0], [168.0, -46.5]],
    // Cuba
    [[-84.0, 22.0], [-75.0, 20.0], [-76.0, 21.0], [-84.0, 22.0]],
  ];

  const allPolys = [
    africaCoords, eurasiaCoords, northAmericaCoords,
    southAmericaCoords, australiaCoords, greenlandCoords,
    antarcticaCoords, ...islands
  ];

  // 2. Draw Continental Shelf / Shallow Water Glow around coastlines
  allPolys.forEach((poly) => drawLandPoly(poly, true));

  // 3. Draw Land Fills with rich Biome Gradients
  // Base vegetation green for continents
  ctx.fillStyle = "#274f38";
  allPolys.forEach((poly) => {
    drawLandPoly(poly);
    ctx.fill();
  });

  // 4. Biomes: Deserts (Sahara, Middle East, Thar Desert, Outback)
  // Sahara & Arabian Peninsula & Thar Desert (spanning into Sindh / Pakistan)
  const desertGrad = ctx.createLinearGradient(toX(-15), toY(25), toX(75), toY(25));
  desertGrad.addColorStop(0, "#c99a6b");
  desertGrad.addColorStop(0.35, "#b58757");
  desertGrad.addColorStop(0.65, "#c29562");
  desertGrad.addColorStop(1, "#b08558");
  ctx.fillStyle = desertGrad;

  // Sahara & Middle East overlay
  const desertPoly = [
    [-15.0, 17.0], [-15.0, 31.0], [33.0, 31.0], [35.0, 33.0], [55.0, 32.0],
    // Thar / Indus arid zone near Karachi
    [72.0, 28.0], [68.0, 23.5], [58.0, 21.0], [45.0, 14.0], [35.0, 13.0],
    [10.0, 14.0], [-5.0, 15.0], [-15.0, 17.0]
  ];
  drawLandPoly(desertPoly);
  ctx.fill();

  // Australian Outback Desert
  const outbackGrad = ctx.createRadialGradient(toX(133), toY(-25), 20, toX(133), toY(-25), 180);
  outbackGrad.addColorStop(0, "#a86641");
  outbackGrad.addColorStop(0.7, "#995834");
  outbackGrad.addColorStop(1, "rgba(43, 79, 56, 0)");
  ctx.fillStyle = outbackGrad;
  ctx.beginPath();
  ctx.arc(toX(133), toY(-25), 160, 0, Math.PI * 2);
  ctx.fill();

  // Tropical Rainforest highlights (Amazon, Congo, Southeast Asia, Indus Basin Green Belt)
  const lushGrad = ctx.createRadialGradient(toX(-60), toY(-4), 10, toX(-60), toY(-4), 220);
  lushGrad.addColorStop(0, "#194a2b");
  lushGrad.addColorStop(1, "rgba(35, 75, 48, 0)");
  ctx.fillStyle = lushGrad;
  ctx.beginPath();
  ctx.arc(toX(-60), toY(-4), 200, 0, Math.PI * 2);
  ctx.fill();

  // Congo Basin
  ctx.beginPath();
  ctx.arc(toX(22), toY(0), 120, 0, Math.PI * 2);
  ctx.fill();

  // Indus River fertile corridor down to Karachi
  ctx.strokeStyle = "#4d8c60";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(toX(74), toY(34));
  ctx.quadraticCurveTo(toX(71), toY(30), toX(67.5), toY(25));
  ctx.stroke();

  // 5. Mountain Peaks (Himalayas north of Pakistan, Andes, Rockies)
  ctx.strokeStyle = "#d4c8b8";
  ctx.lineWidth = 3.5;
  // Himalayas
  ctx.beginPath();
  ctx.moveTo(toX(73), toY(34));
  ctx.lineTo(toX(82), toY(30));
  ctx.lineTo(toX(92), toY(28));
  ctx.stroke();

  // Andes
  ctx.beginPath();
  ctx.moveTo(toX(-77), toY(6));
  ctx.lineTo(toX(-72), toY(-15));
  ctx.lineTo(toX(-69), toY(-35));
  ctx.lineTo(toX(-72), toY(-50));
  ctx.stroke();

  // Rockies
  ctx.beginPath();
  ctx.moveTo(toX(-120), toY(55));
  ctx.lineTo(toX(-112), toY(42));
  ctx.lineTo(toX(-105), toY(32));
  ctx.stroke();

  // 6. Polar Ice Caps (Greenland & Antarctica)
  ctx.fillStyle = "#edf7fd";
  drawLandPoly(greenlandCoords);
  ctx.fill();
  drawLandPoly(antarcticaCoords);
  ctx.fill();
  // North polar sea ice
  ctx.fillStyle = "rgba(235, 246, 253, 0.75)";
  ctx.fillRect(0, 0, W, toY(80));

  // 7. Crisp Latitude and Longitude Graticule Lines on the texture
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(56, 189, 248, 0.22)"; // Subtle cyan-blue grid

  // Meridians (every 15 degrees)
  for (let lon = -180; lon < 180; lon += 15) {
    const x = toX(lon);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }

  // Parallels (every 15 degrees)
  for (let lat = -75; lat <= 75; lat += 15) {
    const y = toY(lat);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  // Major Prominent Parallels
  // Equator (Solid Cyan Accent)
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = "rgba(56, 189, 248, 0.55)";
  ctx.beginPath();
  ctx.moveTo(0, toY(0));
  ctx.lineTo(W, toY(0));
  ctx.stroke();

  // Tropic of Cancer (23.5° N - passing near Karachi at 24.86° N)
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = "rgba(217, 199, 167, 0.45)"; // Warm Sand dashed line
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.moveTo(0, toY(23.5));
  ctx.lineTo(W, toY(23.5));
  ctx.stroke();

  // Tropic of Capricorn (23.5° S)
  ctx.beginPath();
  ctx.moveTo(0, toY(-23.5));
  ctx.lineTo(W, toY(-23.5));
  ctx.stroke();
  ctx.setLineDash([]); // Reset line dash

  // Prime Meridian (0°) and Karachi Meridian (67.0° E)
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = "rgba(56, 189, 248, 0.38)";
  ctx.beginPath();
  ctx.moveTo(toX(0), 0);
  ctx.lineTo(toX(0), H);
  ctx.stroke();

  // Karachi coordinate cross-marker on texture
  const kX = toX(67.01);
  const kY = toY(24.86);
  ctx.strokeStyle = "rgba(56, 189, 248, 0.75)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(kX, kY, 7, 0, Math.PI * 2);
  ctx.stroke();

  // Finish Texture
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Creates dynamic realistic cloud texture with atmospheric circulation patterns.
 */
export function createRealisticCloudTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");

  const W = canvas.width;
  const H = canvas.height;

  ctx.clearRect(0, 0, W, H);

  // Soft equatorial ITCZ cloud belt
  const itcz = ctx.createLinearGradient(0, H * 0.42, 0, H * 0.58);
  itcz.addColorStop(0, "rgba(255, 255, 255, 0)");
  itcz.addColorStop(0.5, "rgba(255, 255, 255, 0.32)");
  itcz.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = itcz;
  ctx.fillRect(0, H * 0.42, W, H * 0.16);

  // Mid-latitude swirling weather bands and storm cells
  ctx.fillStyle = "rgba(255, 255, 255, 0.28)";
  function drawCloudSwirl(cx, cy, r, angle) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.8, r * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Draw cloud systems across Northern and Southern Hemispheres
  const cloudPositions = [
    [W * 0.15, H * 0.32, 65, 0.3], [W * 0.28, H * 0.36, 85, -0.2],
    [W * 0.45, H * 0.28, 95, 0.4], [W * 0.62, H * 0.34, 75, -0.3],
    [W * 0.78, H * 0.30, 90, 0.25], [W * 0.92, H * 0.35, 70, -0.4],
    // Southern storms
    [W * 0.2, H * 0.68, 80, -0.35], [W * 0.4, H * 0.72, 95, 0.3],
    [W * 0.58, H * 0.66, 85, -0.25], [W * 0.75, H * 0.70, 90, 0.4],
    [W * 0.9, H * 0.67, 75, -0.3]
  ];

  cloudPositions.forEach(([x, y, r, a]) => drawCloudSwirl(x, y, r, a));

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}
