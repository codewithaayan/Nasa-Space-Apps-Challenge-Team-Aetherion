import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Activity, Clock3, Compass, Database, Droplets, MapPin, Radio, ShieldCheck, Sprout, Sun, Thermometer, Waves } from "lucide-react";
import { createRealisticEarthTexture, createRealisticCloudTexture } from "./earthTexture";
import { locations } from "../data";
import { summarizeCity } from "./globeData";

const locationsById = new Map(locations.map((location) => [location.id, location]));

function getCityCoordinates(cityId) {
  const location = locationsById.get(cityId);
  if (!location) throw new Error(`Missing geographic coordinates for globe location "${cityId}".`);
  return { lat: location.lat, lon: location.lng };
}

function formatDms(value, positiveDirection, negativeDirection) {
  const absolute = Math.abs(value);
  const degrees = Math.floor(absolute);
  const minutesValue = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesValue);
  let seconds = Math.round((minutesValue - minutes) * 60);
  let adjustedMinutes = minutes;
  let adjustedDegrees = degrees;
  if (seconds === 60) {
    seconds = 0;
    adjustedMinutes += 1;
    if (adjustedMinutes === 60) {
      adjustedMinutes = 0;
      adjustedDegrees += 1;
    }
  }
  const direction = value < 0 ? negativeDirection : positiveDirection;
  return `${adjustedDegrees}° ${String(adjustedMinutes).padStart(2, "0")}' ${String(seconds).padStart(2, "0")}" ${direction}`;
}

export const EARTH_CITIES = [
  {
    id: "karachi",
    name: "Karachi",
    province: "Sindh Province",
    country: "Pakistan",
    kind: "Coastal City Investigation",
  },
  {
    id: "lahore",
    name: "Lahore",
    province: "Punjab Province",
    country: "Pakistan",
    kind: "Inland City Investigation",
  },
  {
    id: "islamabad",
    name: "Islamabad",
    province: "Islamabad Capital Territory",
    country: "Pakistan",
    kind: "Capital City Investigation",
  },
  {
    id: "quetta",
    name: "Quetta",
    province: "Balochistan",
    country: "Pakistan",
    kind: "Highland City Investigation",
  },
  {
    id: "peshawar",
    name: "Peshawar",
    province: "Khyber Pakhtunkhwa",
    country: "Pakistan",
    kind: "Northwestern City Investigation",
  },
  {
    id: "gilgit",
    name: "Gilgit",
    province: "Gilgit-Baltistan",
    country: "Pakistan",
    kind: "Mountain City Investigation",
  },
];

export function EarthGlobe3D({ datasets = [], loading = false, error = "" }) {
  const mountRef = useRef(null);
  const [selectedCityId, setSelectedCityId] = useState("karachi");
  const [cityScreens, setCityScreens] = useState([]);

  const currentCity = EARTH_CITIES.find((c) => c.id === selectedCityId) || EARTH_CITIES[0];
  const currentCoordinates = getCityCoordinates(currentCity.id);
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

  const targetOrientationRef = useRef({
    cityId: currentCity.id,
    active: true,
    quaternion: null,
  });

  const handleSelectCity = (cityId) => {
    setSelectedCityId(cityId);
    const targetCity = EARTH_CITIES.find((c) => c.id === cityId) || EARTH_CITIES[0];
    cityRef.current = targetCity;
    targetOrientationRef.current = {
      cityId: targetCity.id,
      active: true,
      quaternion: null,
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
    camera.lookAt(0, 0, 0);

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
    earthMesh.rotation.y = 0;
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

    // Plot city markers at their latitude/longitude coordinates on the sphere.
    const cityDotMaterials = new Map();
    EARTH_CITIES.forEach((city) => {
      const { lat, lon } = getCityCoordinates(city.id);
      const pos = getSphereCoords(lat, lon, earthRadius + 0.006);
      const cityDotGeo = new THREE.SphereGeometry(0.018, 16, 16);
      const cityDotMat = new THREE.MeshBasicMaterial({
        color: city.id === cityRef.current.id ? 0xf3d9a8 : 0x8db6c9,
        transparent: true,
        opacity: 0.95,
      });
      const dotMesh = new THREE.Mesh(cityDotGeo, cityDotMat);
      dotMesh.position.copy(pos);
      earthMesh.add(dotMesh);
      cityDotMaterials.set(city.id, cityDotMat);
    });
    let highlightedCityId = cityRef.current.id;

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
      const pos = getSphereCoords(lat, lon, earthRadius + 0.004);
      activeBeaconGroup.position.copy(pos);
      const normal = pos.clone().normalize();
      activeBeaconGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
    };

    const initialCoordinates = getCityCoordinates(cityRef.current.id);
    updateActiveBeacon(initialCoordinates.lat, initialCoordinates.lon);

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
      targetOrientationRef.current.active = false;
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
        targetOrientationRef.current.active = false;
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
    let projectionFrame = 0;

    const animate = () => {
      time += 0.016;

      // Rotate the selected coordinate toward the camera, including its latitude.
      if (targetOrientationRef.current.active && !isDragging) {
        const target = targetOrientationRef.current;
        userRotationSpeed = 0;
        if (!target.quaternion) {
          const city = EARTH_CITIES.find((item) => item.id === target.cityId) || EARTH_CITIES[0];
          const { lat, lon } = getCityCoordinates(city.id);
          const cityNormal = getSphereCoords(lat, lon, 1)
            .applyAxisAngle(new THREE.Vector3(0, 1, 0), earthMesh.rotation.y)
            .normalize()
            .applyQuaternion(earthGroup.quaternion)
            .normalize();
          const cameraDirection = camera.position.clone().normalize();
          const correction = new THREE.Quaternion().setFromUnitVectors(cityNormal, cameraDirection);
          target.quaternion = correction.multiply(earthGroup.quaternion.clone());
        }
        earthGroup.quaternion.slerp(target.quaternion, 0.065);
        if (earthGroup.quaternion.angleTo(target.quaternion) < 0.001) {
          earthGroup.quaternion.copy(target.quaternion);
          target.active = false;
        }
      } else if (!isDragging) {
        userRotationSpeed *= 0.95;
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

      if (highlightedCityId !== cityRef.current.id) {
        highlightedCityId = cityRef.current.id;
        cityDotMaterials.forEach((material, cityId) => {
          material.color.setHex(cityId === highlightedCityId ? 0xf3d9a8 : 0x8db6c9);
        });
      }

      // Always keep active beacon at current city position
      const activeCoordinates = getCityCoordinates(cityRef.current.id);
      updateActiveBeacon(activeCoordinates.lat, activeCoordinates.lon);

      if (projectionFrame++ % 3 === 0) {
        earthGroup.updateMatrixWorld(true);
        camera.updateMatrixWorld(true);
        const globeCenter = earthMesh.getWorldPosition(new THREE.Vector3());
        const cameraPosition = camera.getWorldPosition(new THREE.Vector3());
        setCityScreens(EARTH_CITIES.map((city) => {
          const { lat, lon } = getCityCoordinates(city.id);
          const worldPosition = getSphereCoords(lat, lon, earthRadius + 0.01)
            .applyMatrix4(earthMesh.matrixWorld);
          const cameraDirection = cameraPosition.clone().sub(worldPosition).normalize();
          const surfaceNormal = worldPosition.clone().sub(globeCenter).normalize();
          const projected = worldPosition.project(camera);
          return {
            id: city.id,
            x: Math.round((projected.x * 0.5 + 0.5) * width),
            y: Math.round((-projected.y * 0.5 + 0.5) * height),
            visible: cameraDirection.dot(surfaceNormal) > 0.08
              && projected.x >= -1 && projected.x <= 1
              && projected.y >= -1 && projected.y <= 1,
          };
        }));
      }

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

      {cityScreens.filter((city) => city.visible).map((cityScreen) => {
        const city = EARTH_CITIES.find((item) => item.id === cityScreen.id);
        if (!city) return null;
        return (
          <button
            key={city.id}
            type="button"
            className={`globe-city-marker ${city.id === selectedCityId ? "selected" : ""}`}
            style={{ left: cityScreen.x, top: cityScreen.y }}
            aria-label={`Focus globe on ${city.name}`}
            aria-pressed={city.id === selectedCityId}
            onClick={() => handleSelectCity(city.id)}
          />
        );
      })}

      {/* Dynamic Screen-Space Target for Selected City */}
      {cityScreens.find((city) => city.id === selectedCityId)?.visible && (
        <div
          className="globe-city-target"
          style={{
            left: cityScreens.find((city) => city.id === selectedCityId).x,
            top: cityScreens.find((city) => city.id === selectedCityId).y,
          }}
        >
          <span className="globe-target-pulse" />
          <span className="globe-target-center" />
          <span className="globe-target-label">
            <MapPin size={10} />
            {currentCity.name}
            <small>{currentCoordinates.lat.toFixed(4)}° N · {currentCoordinates.lon.toFixed(4)}° E</small>
          </span>
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
            <b className="hud-coord-val">{formatDms(currentCoordinates.lat, "N", "S")}</b>
            <small>{currentCoordinates.lat.toFixed(4)}° {currentCoordinates.lat < 0 ? "S" : "N"}</small>
          </div>
          <div className="hud-coord-item">
            <span className="hud-coord-label">LONGITUDE</span>
            <b className="hud-coord-val">{formatDms(currentCoordinates.lon, "E", "W")}</b>
            <small>{currentCoordinates.lon.toFixed(4)}° {currentCoordinates.lon < 0 ? "W" : "E"}</small>
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
