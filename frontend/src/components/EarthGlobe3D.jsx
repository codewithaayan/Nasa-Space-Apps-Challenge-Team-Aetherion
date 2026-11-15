import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Activity, Clock3, Compass, Database, Droplets, MapPin, Radio, ShieldCheck, Sprout, Sun, Thermometer, Waves } from "lucide-react";
import { createRealisticEarthTexture, createRealisticCloudTexture } from "./earthTexture";

export function EarthGlobe3D() {
  const mountRef = useRef(null);
  const [karachiScreen, setKarachiScreen] = useState({ x: 0, y: 0, visible: false });
  const [orbitInfo, setOrbitInfo] = useState({ alt: "705 km", speed: "7.5 km/s" });

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
    // Orient so Indian subcontinent / Pakistan faces forward on startup
    earthMesh.rotation.y = THREE.MathUtils.degToRad(35);
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

    // 8. Glowing Location Marker for Karachi (24.86° N, 67.01° E)
    const karachiGroup = new THREE.Group();
    const karachiLat = 24.8607;
    const karachiLon = 67.0011;

    // Convert Lat/Lon to Sphere Cartesian Coordinates
    const phi = THREE.MathUtils.degToRad(90 - karachiLat);
    const theta = THREE.MathUtils.degToRad(karachiLon + 180);

    const kX = -earthRadius * Math.sin(phi) * Math.cos(theta);
    const kY = earthRadius * Math.cos(phi);
    const kZ = earthRadius * Math.sin(phi) * Math.sin(theta);

    karachiGroup.position.set(kX, kY, kZ);

    // Orient marker normal to Earth surface
    const normal = new THREE.Vector3(kX, kY, kZ).normalize();
    karachiGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);

    // A) Central glowing beacon dot
    const pinDotGeo = new THREE.SphereGeometry(0.024, 16, 16);
    const pinDotMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const pinDot = new THREE.Mesh(pinDotGeo, pinDotMat);
    pinDot.position.y = 0.05;
    karachiGroup.add(pinDot);

    // B) Vertical beacon light beam
    const beamGeo = new THREE.CylinderGeometry(0.004, 0.016, 0.16, 16);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.85,
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.y = 0.08;
    karachiGroup.add(beam);

    // C) Pulsing ground radar rings
    const ring1Geo = new THREE.RingGeometry(0.02, 0.045, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    });
    const ring1 = new THREE.Mesh(ring1Geo, ringMat);
    ring1.rotation.x = Math.PI / 2;
    ring1.position.y = 0.005;
    karachiGroup.add(ring1);

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
    karachiGroup.add(ring2);

    earthMesh.add(karachiGroup);

    // 9. 3D Elliptical Orbit & 3D Realistic Satellite
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

    // Secondary dashed orbital envelope
    const orbitPoints2 = [];
    for (let i = 0; i <= 96; i++) {
      const angle = (i / 96) * Math.PI * 2;
      orbitPoints2.push(new THREE.Vector3(1.9 * Math.cos(angle), 1.85 * Math.sin(angle), 0));
    }
    const orbitLineGeo2 = new THREE.BufferGeometry().setFromPoints(orbitPoints2);
    const orbitLineMat2 = new THREE.LineDashedMaterial({
      color: 0xd9c7a7,
      dashSize: 0.1,
      gapSize: 0.15,
      transparent: true,
      opacity: 0.3,
    });
    const orbitLine2 = new THREE.LineLoop(orbitLineGeo2, orbitLineMat2);
    orbitLine2.computeLineDistances();
    orbitGroup.add(orbitLine2);

    // 3D Satellite Model
    const satelliteGroup = new THREE.Group();

    // Body chassis (titanium & gold foil)
    const busGeo = new THREE.BoxGeometry(0.09, 0.055, 0.055);
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

    // 10. Interactive Drag-to-Rotate Support
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let userRotationSpeed = 0;

    const onMouseDown = (e) => {
      isDragging = true;
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

    // 11. Animation Loop
    let animationFrameId;
    let orbitAngle = 0;
    let time = 0;

    const animate = () => {
      time += 0.016;

      // Slow majestic continuous Earth rotation
      if (!isDragging) {
        earthMesh.rotation.y += 0.0013;
        userRotationSpeed *= 0.95; // Inertia damping
        earthMesh.rotation.y += userRotationSpeed;
      }
      cloudMesh.rotation.y += 0.0017; // Clouds drift slightly faster

      // Satellite orbital movement
      orbitAngle += 0.0055;
      const satX = aX * Math.cos(orbitAngle);
      const satY = bY * Math.sin(orbitAngle);
      satelliteGroup.position.set(satX, satY, 0);
      satelliteGroup.rotation.z = orbitAngle + Math.PI / 2;

      // Radar rings pulsing animation on Karachi
      const pulse1 = 1 + Math.sin(time * 3.5) * 0.35;
      ring1.scale.set(pulse1, pulse1, 1);
      const pulse2 = 1 + Math.sin(time * 3.5 + 1.2) * 0.45;
      ring2.scale.set(pulse2, pulse2, 1);
      ring2Mat.opacity = Math.max(0.15, 0.7 - (pulse2 - 1) * 0.8);

      // Flashing telemetry LED
      ledMat.color.setHex(Math.sin(time * 5) > 0 ? 0x38bdf8 : 0x0284c7);

      // 12. Project Karachi 3D Coordinates to 2D Screen Space
      const karachiWorldPos = new THREE.Vector3();
      karachiGroup.getWorldPosition(karachiWorldPos);

      // Check if Karachi is on the side facing the camera
      const cameraDir = camera.position.clone().sub(karachiWorldPos).normalize();
      const surfaceNormal = karachiWorldPos.clone().sub(earthMesh.position).normalize();
      const isVisible = cameraDir.dot(surfaceNormal) > 0.15;

      const screenV = karachiWorldPos.clone().project(camera);
      const sX = (screenV.x * 0.5 + 0.5) * width;
      const sY = (-screenV.y * 0.5 + 0.5) * height;

      setKarachiScreen({
        x: Math.round(sX),
        y: Math.round(sY),
        visible: isVisible,
      });

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    // 13. Responsive Resize Handler
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

      {/* Dynamic Screen-Space Target for Karachi */}
      {karachiScreen.visible && (
        <div
          className="karachi-hud-beacon"
          style={{
            transform: `translate(${karachiScreen.x}px, ${karachiScreen.y}px)`,
          }}
        >
          <div className="hud-beacon-core">
            <span className="beacon-ping" />
            <span className="beacon-center" />
            <div className="beacon-stem" />
            <div className="beacon-card">
              <span className="beacon-title">
                <MapPin size={10} className="text-sky-400" />
                KARACHI POINT TARGET
              </span>
              <span className="beacon-coords">24° 51' 36" N · 67° 00' 36" E</span>
              <span className="beacon-badge">NASA T2M OBSERVATION POINT</span>
            </div>
          </div>
        </div>
      )}

      {/* TOP RIGHT: ORBITAL VIEW 01 + Live Status Indicator */}
      <div className="hud-panel hud-top-right">
        <div className="hud-top-bar">
          <span className="live-status-pulse" />
          <span className="hud-view-label">ORBITAL VIEW 01</span>
          <span className="hud-live-tag">LIVE</span>
        </div>
        <div className="hud-meta-row">
          <span>ALTITUDE: <b>705 KM</b></span>
          <span className="hud-meta-dot">·</span>
          <span>SPEED: <b>7.5 KM/S</b></span>
        </div>
        <div className="hud-sensor-row">
          <Radio size={11} className="text-sky-400" />
          <span>SUN-SYNCHRONOUS SATELLITE TRACK</span>
        </div>
      </div>

      {/* RIGHT SIDE: Selected Location, Latitude & Longitude Panel */}
      <div className="hud-panel hud-location-panel">
        <div className="hud-card-header">
          <Compass size={13} className="text-sky-400" />
          <span>SELECTED LOCATION</span>
        </div>
        <div className="hud-location-name">KARACHI</div>
        <div className="hud-location-province">SINDH PROVINCE, PAKISTAN</div>
        <div className="hud-coord-grid">
          <div className="hud-coord-item">
            <span className="hud-coord-label">LATITUDE</span>
            <b className="hud-coord-val">24° 51' 36" N</b>
            <small>24.8607°</small>
          </div>
          <div className="hud-coord-item">
            <span className="hud-coord-label">LONGITUDE</span>
            <b className="hud-coord-val">67° 00' 36" E</b>
            <small>67.0011°</small>
          </div>
        </div>
        <div className="hud-location-footer">
          <span>ELEVATION: <b>4 M ASL</b></span>
          <span className="hud-zone-tag">SUBTROPICAL ARID</span>
        </div>
      </div>

      {/* BOTTOM LEFT: Data-Feed Status Panel (Replaces old SOURCE EXPORTS READY) */}
      <div className="hud-panel hud-feed-panel">
        <div className="hud-feed-header">
          <Database size={13} className="text-sky-400" />
          <span className="hud-feed-title">DATA FEED STATUS</span>
          <span className="hud-stream-active">
            <span className="hud-signal-dot" /> STREAM ACTIVE
          </span>
        </div>
        <div className="hud-feed-details">
          <div className="hud-feed-row">
            <span>SOURCE:</span>
            <b>NASA POWER / MERRA-2 REANALYSIS</b>
          </div>
          <div className="hud-feed-row">
            <span>VARIABLE:</span>
            <b>T2M (2M AIR TEMPERATURE)</b>
          </div>
          <div className="hud-feed-row">
            <span>COVERAGE:</span>
            <b>2000 – 2019 (240 MONTHS)</b>
          </div>
          <div className="hud-feed-row">
            <span>GRID CELL:</span>
            <b>0.5° × 0.625° POINT SAMPLE</b>
          </div>
        </div>
        <div className="hud-feed-status-bar">
          <ShieldCheck size={12} className="text-emerald-400" />
          <span>LOCAL SOURCE VALIDATED · OFFLINE STREAM READY</span>
        </div>
      </div>

      {/* AROUND EARTH: Floating Data Indicators */}
      {/* 1. Floating Temperature Indicator (Top-Left of globe) */}
      <div className="floating-metric float-metric-temp">
        <div className="metric-icon-wrap metric-temp-icon">
          <Thermometer size={14} />
        </div>
        <div className="metric-content">
          <span className="metric-label">SURFACE TEMPERATURE</span>
          <b className="metric-val">28.4°C</b>
          <span className="metric-sub text-amber-300">+0.08°C / DECADE</span>
        </div>
      </div>

      {/* 2. Floating Precipitation Indicator (Mid-Left of globe) */}
      <div className="floating-metric float-metric-precip">
        <div className="metric-icon-wrap metric-precip-icon">
          <Droplets size={14} />
        </div>
        <div className="metric-content">
          <span className="metric-label">ANNUAL PRECIPITATION</span>
          <b className="metric-val">176.4 mm</b>
          <span className="metric-sub text-sky-300">SUMMER MONSOON</span>
        </div>
      </div>

      {/* 3. Floating Vegetation Indicator (Lower-Right of globe) */}
      <div className="floating-metric float-metric-veg">
        <div className="metric-icon-wrap metric-veg-icon">
          <Sprout size={14} />
        </div>
        <div className="metric-content">
          <span className="metric-label">VEGETATION DENSITY</span>
          <b className="metric-val">0.182 NDVI</b>
          <span className="metric-sub text-emerald-300">COASTAL / ARID SCRUB</span>
        </div>
      </div>

      {/* Bottom Subtle Observation Note */}
      <div className="hud-bottom-note">
        INTERACTIVE 3D GLOBE · DRAG TO ROTATE · REALISTIC PROJECTION & SAT-ORBIT
      </div>
    </div>
  );
}
