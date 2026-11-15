import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Activity, Clock3, Compass, Database, Droplets, MapPin, Radio, ShieldCheck, Sprout, Sun, Thermometer, Waves } from "lucide-react";
import { createRealisticEarthTexture, createRealisticCloudTexture } from "./earthTexture";
import { summarizeCity } from "./globeData";

export const EARTH_CITIES = [
  {
    id: "karachi",
    name: "Karachi",
    province: "Sindh Province",
    country: "Pakistan",
    caseCode: "CASE 001",
    kind: "Coastal City Investigation",
    lat: 24.8607,
    lon: 67.0011,
    latDms: "24° 51' 36\" N",
    lonDms: "67° 00' 36\" E",
  },
  {
    id: "lahore",
    name: "Lahore",
    province: "Punjab Province",
    country: "Pakistan",
    caseCode: "CASE 002",
    kind: "Inland City Investigation",
    lat: 31.5204,
    lon: 74.3587,
    latDms: "31° 31' 13\" N",
    lonDms: "74° 21' 31\" E",
  },
  {
    id: "islamabad",
    name: "Islamabad",
    province: "Islamabad Capital Territory",
    country: "Pakistan",
    caseCode: "CASE 003",
    kind: "Capital City Investigation",
    lat: 33.6844,
    lon: 73.0479,
    latDms: "33° 41' 04\" N",
    lonDms: "73° 02' 52\" E",
  },
  {
    id: "quetta",
    name: "Quetta",
    province: "Balochistan",
    country: "Pakistan",
    caseCode: "CASE 004",
    kind: "Highland City Investigation",
    lat: 30.1798,
    lon: 66.975,
    latDms: "30° 10' 47\" N",
    lonDms: "66° 58' 30\" E",
  },
  {
    id: "peshawar",
    name: "Peshawar",
    province: "Khyber Pakhtunkhwa",
    country: "Pakistan",
    caseCode: "CASE 005",
    kind: "Northwestern City Investigation",
    lat: 34.0151,
    lon: 71.5249,
    latDms: "34° 00' 54\" N",
    lonDms: "71° 31' 30\" E",
  },
  {
    id: "gilgit",
    name: "Gilgit",
    province: "Gilgit-Baltistan",
    country: "Pakistan",
    caseCode: "CASE 006",
    kind: "Mountain City Investigation",
    lat: 35.9208,
    lon: 74.308,
    latDms: "35° 55' 15\" N",
    lonDms: "74° 18' 29\" E",
  },
];

export function EarthGlobe3D({ datasets = [], loading = false, error = "" }) {
  const mountRef = useRef(null);
  const [selectedCityId, setSelectedCityId] = useState("karachi");
  const [cityScreen, setCityScreen] = useState({ x: 0, y: 0, visible: false });

  const currentCity = EARTH_CITIES.find((c) => c.id === selectedCityId) || EARTH_CITIES[0];
  const summary = useMemo(() => summarizeCity(datasets, currentCity.id), [datasets, currentCity.id]);
  const dataAvailable = !error && summary.count > 0;
  const dataStatus = loading ? 'LOADING' : error ? 'SERVICE UNAVAILABLE' : dataAvailable ? 'DATA AVAILABLE' : 'NO RECORDS';
  const metricValue = reading => loading ? 'Loading…' : reading.value;
  const metricPeriod = reading => loading ? 'Reading latest month' : reading.period;


  // Mutable ref so the Three.js loop always tracks current city
  const cityRef = useRef(currentCity);
  useEffect(() => {
    cityRef.current = currentCity;
  }, [currentCity]);

  // Target rotation for smooth camera transition to selected city
  const targetRotYRef = useRef({
    targetY: THREE.MathUtils.degToRad(-currentCity.lon + 102),
    active: true,
  });

  const handleSelectCity = (cityId) => {
    setSelectedCityId(cityId);
    const targetCity = EARTH_CITIES.find((c) => c.id === cityId) || EARTH_CITIES[0];
    cityRef.current = targetCity;
    targetRotYRef.current = {
      targetY: THREE.MathUtils.degToRad(-targetCity.lon + 102),
      active: true,
    };
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let width = container.clientWidth || 560;
    let height = container.clientHeight || 480;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 1000);
    camera.position.set(0, 0.25, 4.3);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);

    // 2. Lighting: Sun Directional + Atmospheric Ambient + Rim Backlight
    const ambientLight = new THREE.AmbientLight(0x0e2538, 1.4);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff8ea, 2.6);
    sunLight.position.set(5, 3.2, 4);
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.6);
    rimLight.position.set(-5, -2, -3.5);
    scene.add(rimLight);

    // 3. Earth Group
    const earthGroup = new THREE.Group();
    scene.add(earthGroup);

    // Initial tilt of Earth's rotational axis (approx 23.4 degrees)
    earthGroup.rotation.z = THREE.MathUtils.degToRad(14);
    earthGroup.rotation.x = THREE.MathUtils.degToRad(8);

    // 4. Realistic Earth Sphere with procedural texture
    const earthRadius = 1.32;
    const earthGeo = new THREE.SphereGeometry(earthRadius, 64, 64);
    const earthTexture = createRealisticEarthTexture();

    const earthMat = new THREE.MeshStandardMaterial({
      map: earthTexture,
      roughness: 0.68,
      metalness: 0.12,
    });
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    // Orient to initial city
    earthMesh.rotation.y = THREE.MathUtils.degToRad(-cityRef.current.lon + 102);
    earthGroup.add(earthMesh);

    // 5. 3D Graticule Lines (Latitude & Longitude)
    const graticuleGroup = new THREE.Group();
    const gratMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.3,
    });
    const gratMajorMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.6,
    });
    const cancerMat = new THREE.LineBasicMaterial({
      color: 0xd9c7a7,
      transparent: true,
      opacity: 0.5,
    });

    // Latitude Parallels
    const parallels = [-75, -60, -45, -30, -23.5, -15, 0, 15, 23.5, 30, 45, 60, 75];
    parallels.forEach((lat) => {
      const latRad = THREE.MathUtils.degToRad(lat);
      const r = (earthRadius + 0.003) * Math.cos(latRad);
      const y = (earthRadius + 0.003) * Math.sin(latRad);
      const points = [];
      for (let i = 0; i <= 64; i++) {
        const phi = (i / 64) * Math.PI * 2;
        points.push(new THREE.Vector3(r * Math.cos(phi), y, r * Math.sin(phi)));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      const mat = lat === 0 ? gratMajorMat : (lat === 23.5 || lat === -23.5 ? cancerMat : gratMat);
      graticuleGroup.add(new THREE.LineLoop(geo, mat));
    });

    // Longitude Meridians (every 30 degrees)
    for (let lon = 0; lon < 360; lon += 30) {
      const lonRad = THREE.MathUtils.degToRad(lon);
      const points = [];
      for (let i = 0; i <= 64; i++) {
        const theta = (i / 64) * Math.PI - Math.PI / 2;
        const r = (earthRadius + 0.003) * Math.cos(theta);
        const y = (earthRadius + 0.003) * Math.sin(theta);
        points.push(new THREE.Vector3(r * Math.sin(lonRad), y, r * Math.cos(lonRad)));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      graticuleGroup.add(new THREE.Line(geo, lon === 0 || lon === 60 ? gratMajorMat : gratMat));
    }
    earthMesh.add(graticuleGroup);

    // 6. Realistic Atmospheric Clouds (slow independent rotation)
    const cloudGeo = new THREE.SphereGeometry(earthRadius + 0.018, 48, 48);
    const cloudTexture = createRealisticCloudTexture();
    const cloudMat = new THREE.MeshStandardMaterial({
      map: cloudTexture,
      transparent: true,
      opacity: 0.38,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
    cloudMesh.rotation.y = THREE.MathUtils.degToRad(50);
    earthGroup.add(cloudMesh);

    // 7. Subtle Blue Atmospheric Glow (Fresnel Shader)
    const atmosphereMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vec3 viewDir = normalize(-vPosition);
          float rim = 1.0 - max(0.0, dot(vNormal, viewDir));
          float intensity = pow(rim, 2.7);
          vec3 atmosphereColor = vec3(0.24, 0.65, 1.0);
          gl_FragColor = vec4(atmosphereColor, intensity * 0.95);
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
    });
    const atmosphereGeo = new THREE.SphereGeometry(earthRadius + 0.16, 64, 64);
    const atmosphereMesh = new THREE.Mesh(atmosphereGeo, atmosphereMat);
    scene.add(atmosphereMesh);

    // Helper: Convert Lat/Lon to Sphere Cartesian Coordinates
    const getSphereCoords = (lat, lon, r = earthRadius) => {
      const phi = THREE.MathUtils.degToRad(90 - lat);
      const theta = THREE.MathUtils.degToRad(lon + 180);
      const x = -r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.cos(phi);
      const z = r * Math.sin(phi) * Math.sin(theta);
      return new THREE.Vector3(x, y, z);
    };

    // 8. Place subtle permanent pin dots for all available observation cities
    EARTH_CITIES.forEach((city) => {
      const pos = getSphereCoords(city.lat, city.lon, earthRadius + 0.003);
      const cityDotGeo = new THREE.SphereGeometry(0.012, 12, 12);
      const cityDotMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.75,
      });
      const dotMesh = new THREE.Mesh(cityDotGeo, cityDotMat);
      dotMesh.position.copy(pos);
      earthMesh.add(dotMesh);
    });

    // 9. Active Location Glowing Beacon (Dynamic for Selected City)
    const activeBeaconGroup = new THREE.Group();

    // Central glowing beacon core
    const pinDotGeo = new THREE.SphereGeometry(0.024, 16, 16);
    const pinDotMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const pinDot = new THREE.Mesh(pinDotGeo, pinDotMat);
    pinDot.position.y = 0.05;
    activeBeaconGroup.add(pinDot);

    // Vertical beacon light beam
    const beamGeo = new THREE.CylinderGeometry(0.004, 0.016, 0.16, 16);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.85,
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.y = 0.08;
    activeBeaconGroup.add(beam);

    // Ground radar rings
    const ring1Geo = new THREE.RingGeometry(0.02, 0.045, 32);
    const ring1Mat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    });
    const ring1 = new THREE.Mesh(ring1Geo, ring1Mat);
    ring1.rotation.x = Math.PI / 2;
    ring1.position.y = 0.005;
    activeBeaconGroup.add(ring1);

    const ring2Geo = new THREE.RingGeometry(0.045, 0.075, 32);
    const ring2Mat = new THREE.MeshBasicMaterial({
      color: 0x6a9a6b,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
    });
    const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
    ring2.rotation.x = Math.PI / 2;
    ring2.position.y = 0.005;
    activeBeaconGroup.add(ring2);

    earthMesh.add(activeBeaconGroup);

    // Function to reposition active beacon to current city
    const updateActiveBeacon = (lat, lon) => {
      const pos = getSphereCoords(lat, lon, earthRadius);
      activeBeaconGroup.position.copy(pos);
      const normal = pos.clone().normalize();
      activeBeaconGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
    };

    updateActiveBeacon(cityRef.current.lat, cityRef.current.lon);

    // 10. 3D Elliptical Orbit & 3D Realistic Satellite
    const orbitGroup = new THREE.Group();
    orbitGroup.rotation.x = Math.PI * 0.32;
    orbitGroup.rotation.y = -Math.PI * 0.15;
    orbitGroup.rotation.z = Math.PI * 0.12;
    scene.add(orbitGroup);

    // Orbit ellipse path
    const aX = 2.05;
    const bY = 1.72;
    const orbitPoints = [];
    for (let i = 0; i <= 128; i++) {
      const angle = (i / 128) * Math.PI * 2;
      orbitPoints.push(new THREE.Vector3(aX * Math.cos(angle), bY * Math.sin(angle), 0));
    }
    const orbitLineGeo = new THREE.BufferGeometry().setFromPoints(orbitPoints);
    const orbitLineMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.45,
    });
    const orbitLine = new THREE.LineLoop(orbitLineGeo, orbitLineMat);
    orbitGroup.add(orbitLine);

    // Modeled Satellite
    const satelliteGroup = new THREE.Group();

    const busGeo = new THREE.BoxGeometry(0.09, 0.055, 0.065);
    const busMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.85,
      roughness: 0.25,
    });
    const busMesh = new THREE.Mesh(busGeo, busMat);
    satelliteGroup.add(busMesh);

    const foilGeo = new THREE.BoxGeometry(0.07, 0.045, 0.058);
    const foilMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.9,
      roughness: 0.3,
    });
    const foilMesh = new THREE.Mesh(foilGeo, foilMat);
    satelliteGroup.add(foilMesh);

    // Dual solar panels
    const panelGeo = new THREE.BoxGeometry(0.24, 0.075, 0.005);
    const panelMat = new THREE.MeshStandardMaterial({
      color: 0x1d4ed8,
      emissive: 0x0c2a5c,
      roughness: 0.35,
      metalness: 0.65,
    });
    const leftPanel = new THREE.Mesh(panelGeo, panelMat);
    leftPanel.position.x = -0.18;
    satelliteGroup.add(leftPanel);

    const rightPanel = new THREE.Mesh(panelGeo, panelMat);
    rightPanel.position.x = 0.18;
    satelliteGroup.add(rightPanel);

    // Parabolic Dish Antenna
    const dishGeo = new THREE.ConeGeometry(0.038, 0.018, 16, 1, true);
    const dishMat = new THREE.MeshStandardMaterial({ color: 0xd9c7a7, metalness: 0.75, side: THREE.DoubleSide });
    const dish = new THREE.Mesh(dishGeo, dishMat);
    dish.rotation.x = Math.PI / 2;
    dish.position.z = 0.035;
    satelliteGroup.add(dish);

    // Telemetry LED beacon
    const ledGeo = new THREE.SphereGeometry(0.012, 8, 8);
    const ledMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const led = new THREE.Mesh(ledGeo, ledMat);
    led.position.set(0, 0.035, 0);
    satelliteGroup.add(led);

    orbitGroup.add(satelliteGroup);

    // 11. Interactive Drag-to-Rotate Support
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let userRotationSpeed = 0;

    const onMouseDown = (e) => {
      isDragging = true;
      targetRotYRef.current.active = false; // pause programmatic rotate while user manually drags
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e) => {
      if (!isDragging) return;
      const deltaX = e.clientX - previousMousePosition.x;
      userRotationSpeed = deltaX * 0.004;
      earthMesh.rotation.y += userRotationSpeed;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const dom = renderer.domElement;
    dom.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    // Touch support for mobile devices
    const onTouchStart = (e) => {
      if (e.touches.length === 1) {
        isDragging = true;
        targetRotYRef.current.active = false;
        previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };
    const onTouchMove = (e) => {
      if (!isDragging || e.touches.length !== 1) return;
      const deltaX = e.touches[0].clientX - previousMousePosition.x;
      earthMesh.rotation.y += deltaX * 0.004;
      previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };
    dom.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onMouseUp);

    // 12. Animation Loop
    let animationFrameId;
    let orbitAngle = 0;
    let time = 0;

    const animate = () => {
      time += 0.016;

      // Handle smooth transition to newly selected city
      if (targetRotYRef.current.active && !isDragging) {
        let diff = targetRotYRef.current.targetY - (earthMesh.rotation.y % (Math.PI * 2));
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        if (Math.abs(diff) > 0.004) {
          earthMesh.rotation.y += diff * 0.06;
        } else {
          targetRotYRef.current.active = false;
        }
      } else if (!isDragging) {
        // Continuous slow natural Earth rotation
        earthMesh.rotation.y += 0.0012;
        userRotationSpeed *= 0.95; // Inertia damping
        earthMesh.rotation.y += userRotationSpeed;
      }

      cloudMesh.rotation.y += 0.0016; // Atmospheric clouds drift slightly faster

      // Satellite orbital movement
      orbitAngle += 0.0055;
      const satX = aX * Math.cos(orbitAngle);
      const satY = bY * Math.sin(orbitAngle);
      satelliteGroup.position.set(satX, satY, 0);
      satelliteGroup.rotation.z = orbitAngle + Math.PI / 2;

      // Radar rings pulsing animation on active beacon
      const pulse1 = 1 + Math.sin(time * 3.5) * 0.35;
      ring1.scale.set(pulse1, pulse1, 1);
      const pulse2 = 1 + Math.sin(time * 3.5 + 1.2) * 0.45;
      ring2.scale.set(pulse2, pulse2, 1);
      ring2Mat.opacity = Math.max(0.15, 0.7 - (pulse2 - 1) * 0.8);

      // Flashing telemetry LED
      ledMat.color.setHex(Math.sin(time * 5) > 0 ? 0x38bdf8 : 0x0284c7);

      // Always keep active beacon at current city position
      updateActiveBeacon(cityRef.current.lat, cityRef.current.lon);

      // 13. Project Active City 3D Coordinates to 2D Screen Space
      const cityWorldPos = new THREE.Vector3();
      activeBeaconGroup.getWorldPosition(cityWorldPos);

      // Check if city is on the visible side facing the camera
      const cameraDir = camera.position.clone().sub(cityWorldPos).normalize();
      const surfaceNormal = cityWorldPos.clone().sub(earthMesh.position).normalize();
      const isVisible = cameraDir.dot(surfaceNormal) > 0.12;

      const screenV = cityWorldPos.clone().project(camera);
      const sX = (screenV.x * 0.5 + 0.5) * width;
      const sY = (-screenV.y * 0.5 + 0.5) * height;

      setCityScreen({
        x: Math.round(sX),
        y: Math.round(sY),
        visible: isVisible,
      });

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    // 14. Responsive Resize Handler
    const handleResize = () => {
      if (!container) return;
      width = container.clientWidth;
      height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      dom.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      dom.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onMouseUp);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="earth-3d-wrapper" ref={mountRef}>
      {/* Light-blue atmospheric ambient back-glow */}
      <div className="earth-ambient-glow" />

      {/* Dynamic Screen-Space Target for Selected City */}
      {cityScreen.visible && (
        <div
          className="karachi-hud-beacon"
          style={{
            transform: `translate(${cityScreen.x}px, ${cityScreen.y}px)`,
          }}
        >
          <div className="hud-beacon-core">
            <span className="beacon-ping" />
            <span className="beacon-center" />
            <div className="beacon-stem" />
            <div className="beacon-card">
              <span className="beacon-title">
                <MapPin size={10} className="text-sky-400" />
                {currentCity.name.toUpperCase()} POINT TARGET
              </span>
              <span className="beacon-coords">
                {currentCity.latDms} · {currentCity.lonDms}
              </span>
              <span className="beacon-badge">{currentCity.kind.toUpperCase()}</span>
            </div>
          </div>
        </div>
      )}

      {/* TOP RIGHT: ORBITAL VIEW 01 + Live Status Indicator */}
      <div className="hud-panel hud-top-right">
        <div className="hud-top-bar">
          <span className="live-status-pulse" />
          <span className="hud-view-label">EARTH REFERENCE</span>
          <span className="hud-live-tag">3D VIEW</span>
        </div>
        <div className="hud-meta-row">
          <span>DATASETS: <b>{datasets.length}</b></span>
          <span className="hud-meta-dot">·</span>
          <span>CITIES: <b>{EARTH_CITIES.length}</b></span>
        </div>
        <div className="hud-sensor-row">
          <Radio size={11} className="text-sky-400" />
          <span>MONTHLY ENVIRONMENTAL RECORDS</span>
        </div>
      </div>

      {/* RIGHT SIDE: Selected Location, Latitude & Longitude Panel */}
      <div className="hud-panel hud-location-panel">
        <div className="hud-card-header">
          <Compass size={13} className="text-sky-400" />
          <span>SELECTED LOCATION</span>
          <span className="hud-case-chip">{currentCity.caseCode}</span>
        </div>

        {/* Panel City Switcher Buttons */}
        <div className="hud-panel-city-switcher">
          {EARTH_CITIES.map((city) => (
            <button
              key={city.id}
              type="button"
              className={`panel-city-btn ${city.id === selectedCityId ? "active" : ""}`}
              onClick={() => handleSelectCity(city.id)}
            >
              {city.name}
            </button>
          ))}
        </div>

        <div className="hud-location-name">{currentCity.name}</div>
        <div className="hud-location-province">
          {currentCity.province}, {currentCity.country}
        </div>
        <div className="hud-coord-grid">
          <div className="hud-coord-item">
            <span className="hud-coord-label">LATITUDE</span>
            <b className="hud-coord-val">{currentCity.latDms}</b>
            <small>{currentCity.lat.toFixed(4)}° N</small>
          </div>
          <div className="hud-coord-item">
            <span className="hud-coord-label">LONGITUDE</span>
            <b className="hud-coord-val">{currentCity.lonDms}</b>
            <small>{currentCity.lon.toFixed(4)}° E</small>
          </div>
        </div>
        <div className="hud-location-footer">
          <span>CITY REFERENCE COORDINATES</span>
          <span className="hud-zone-tag">NOT A MEASUREMENT FOOTPRINT</span>
        </div>
      </div>

      {/* BOTTOM LEFT: Data-Feed Status Panel (Dynamically matches Selected City) */}
      <div className="hud-panel hud-feed-panel">
        <div className="hud-feed-header">
          <Database size={13} className="text-sky-400" />
          <span className="hud-feed-title">DATASET COVERAGE</span>
          <span className={dataAvailable ? "hud-stream-active" : "hud-stream-active hud-stream-pending"}>
            {dataAvailable && <span className="hud-signal-dot" />}
            {dataStatus}
          </span>
        </div>
        <div className="hud-feed-details">
          <div className="hud-feed-row">
            <span>SOURCE:</span>
            <b>{summary.products}</b>
          </div>
          <div className="hud-feed-row">
            <span>RECORDS:</span>
            <b>{summary.count} monthly datasets</b>
          </div>
          <div className="hud-feed-row">
            <span>COVERAGE:</span>
            <b>{summary.coverage}</b>
          </div>
          <div className="hud-feed-row">
            <span>MAP:</span>
            <b>City reference</b>
          </div>
        </div>
        <div className="hud-feed-status-bar">
          {dataAvailable ? <Database size={12} className="text-emerald-400" /> : <Clock3 size={12} className="text-amber-300" />}
          <span>{error ? 'Dataset service temporarily unavailable' : dataAvailable ? 'Source exports · Scientific review pending' : loading ? 'Reading source records' : 'No datasets for this location'}</span>
        </div>
      </div>

      {/* AROUND EARTH: Floating Data Indicators (Dynamically reflect Selected City) */}
      {/* 1. Floating Temperature Indicator */}
      <div className="floating-metric float-metric-temp">
        <div className="metric-icon-wrap metric-temp-icon">
          <Thermometer size={14} />
        </div>
        <div className="metric-content">
          <span className="metric-label">2-M AIR TEMPERATURE</span>
          <b className="metric-val">{metricValue(summary.temperature)}</b>
          <span className="metric-sub text-amber-300">{metricPeriod(summary.temperature)}</span>
        </div>
      </div>

      {/* 2. Floating Precipitation Indicator */}
      <div className="floating-metric float-metric-precip">
        <div className="metric-icon-wrap metric-precip-icon">
          <Droplets size={14} />
        </div>
        <div className="metric-content">
          <span className="metric-label">PRECIPITATION RATE</span>
          <b className="metric-val">{metricValue(summary.precipitation)}</b>
          <span className="metric-sub text-sky-300">{metricPeriod(summary.precipitation)}</span>
        </div>
      </div>

      {/* 3. Floating Vegetation Indicator */}
      <div className="floating-metric float-metric-veg">
        <div className="metric-icon-wrap metric-veg-icon">
          <Sprout size={14} />
        </div>
        <div className="metric-content">
          <span className="metric-label">NDVI EXPORT</span>
          <b className="metric-val">{metricValue(summary.ndvi)}</b>
          <span className="metric-sub text-emerald-300">{metricPeriod(summary.ndvi)} · location unverified</span>
        </div>
      </div>

      {/* Bottom Subtle Observation Note */}
      <div className="hud-bottom-note">
        CITY REFERENCE · SELECT A CITY OR DRAG TO ROTATE · VALUES SHOW THE LATEST AVAILABLE MONTH
      </div>
    </div>
  );
}
