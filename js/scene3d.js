// Three.js 3D scene management
// Requires THREE (r134) + THREE.OrbitControls loaded as globals

window.scenes3d = {};

// ── helpers ────────────────────────────────────────────────

function hexInt(hex) {
  return parseInt(hex.replace('#', ''), 16);
}

function addStarfield(scene, count = 2500) {
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = 700 + Math.random() * 600;
    const u = Math.random() * Math.PI * 2;
    const v = Math.acos(2 * Math.random() - 1);
    pos[i*3]   = r * Math.sin(v) * Math.cos(u);
    pos[i*3+1] = r * Math.cos(v);
    pos[i*3+2] = r * Math.sin(v) * Math.sin(u);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.4, sizeAttenuation: true, transparent: true, opacity: 0.65 });
  scene.add(new THREE.Points(geo, mat));
}

// Ellipse with planet at one focus.
// pe/ap are distances from planet (focus).
function makeEllipse(pe, ap, segs = 128, color = 0x00d4ff, opacity = 0.85) {
  const a = (pe + ap) / 2;
  const b = Math.sqrt(pe * ap);
  const c = (ap - pe) / 2; // center offset from focus
  const pts = [];
  for (let i = 0; i <= segs; i++) {
    const t = (i / segs) * Math.PI * 2;
    pts.push(new THREE.Vector3(-c + a * Math.cos(t), 0, b * Math.sin(t)));
  }
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
  return new THREE.LineLoop(geo, mat);
}

function makeCircle(r, segs = 128, color = 0x00d4ff, opacity = 0.8) {
  return makeEllipse(r, r, segs, color, opacity);
}

function makeSphere(radius, color, wireOpacity = 0.22, segments = 18) {
  const geo = new THREE.SphereGeometry(radius, segments, Math.ceil(segments * 0.7));
  const mat = new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: wireOpacity });
  return new THREE.Mesh(geo, mat);
}

function makeSolidSphere(radius, color, opacity = 0.08) {
  const geo = new THREE.SphereGeometry(radius, 16, 10);
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.BackSide });
  return new THREE.Mesh(geo, mat);
}

function makeDot(radius, color) {
  const geo = new THREE.SphereGeometry(radius, 8, 6);
  const mat = new THREE.MeshBasicMaterial({ color });
  return new THREE.Mesh(geo, mat);
}

function makeArrow(from, to, color) {
  const pts = [new THREE.Vector3(...from), new THREE.Vector3(...to)];
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const mat = new THREE.LineBasicMaterial({ color });
  return new THREE.Line(geo, mat);
}

// ── scene factory ──────────────────────────────────────────

function getOrCreateScene(canvasId, camPos = [0, 2, 6]) {
  if (scenes3d[canvasId]) return scenes3d[canvasId];

  const canvas = document.getElementById(canvasId);
  if (!canvas || !window.THREE) return null;

  const W = canvas.clientWidth  || canvas.width  || 640;
  const H = canvas.clientHeight || canvas.height || 360;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setSize(W, H, false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x010308, 1);

  const scene  = new THREE.Scene();
  addStarfield(scene);

  const camera = new THREE.PerspectiveCamera(48, W / H, 0.01, 5000);
  camera.position.set(...camPos);
  camera.lookAt(0, 0, 0);

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enablePan     = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance   = 1.2;
  controls.maxDistance   = 200;
  controls.rotateSpeed   = 0.55;
  controls.zoomSpeed     = 0.8;

  // Equatorial grid ring
  const gridRing = makeCircle(0.01, 64, 0x112233, 0.4);
  gridRing.scale.setScalar(1); // will be rescaled per scene
  scene.add(gridRing);

  const sc = {
    renderer, scene, camera, controls, canvas,
    gridRing,
    items: [],   // scene objects cleared each update
    running: false,
    _raf: null,

    startLoop() {
      if (this.running) return;
      this.running = true;
      const tick = () => {
        if (!this.running) return;
        this._raf = requestAnimationFrame(tick);
        controls.update();
        renderer.render(scene, camera);
      };
      tick();
    },

    clearItems() {
      this.items.forEach(o => {
        scene.remove(o);
        if (o.geometry) o.geometry.dispose();
        if (o.material) o.material.dispose();
      });
      this.items = [];
    },

    add(...objs) {
      objs.forEach(o => { scene.add(o); this.items.push(o); });
    },

    resize(w, h) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
  };

  scenes3d[canvasId] = sc;
  sc.startLoop();
  return sc;
}

// ── CONSTELLATION 3D ───────────────────────────────────────

function updateConst3D({ bodyKey, n, alt, minAlt, a_res, pe_res, ap_res, losOK }) {
  const sc = getOrCreateScene('con-canvas', [0, 2.5, 6]);
  if (!sc) return;
  sc.clearItems();

  const body    = BODIES[bodyKey];
  const r_world = 2.0;          // planet radius in world units
  const scale   = r_world / body.radius;

  const r_orbit_w = (body.radius + alt) * scale;
  const r_min_w   = (body.radius + minAlt) * scale;
  const a_res_w   = a_res * scale;
  const pe_res_w  = pe_res * scale;
  const ap_res_w  = ap_res * scale;
  const pColor    = hexInt(body.color);

  // Planet
  sc.add(makeSphere(r_world, pColor, 0.22));
  sc.add(makeSolidSphere(r_world * 1.03, pColor, 0.07));

  // Atmosphere shell
  if (body.atmosphere) {
    const atmR = (body.radius + body.atmosphere.height) * scale;
    sc.add(makeSolidSphere(atmR, pColor, 0.04));
  }

  // Minimum LOS orbit (faint red ring)
  if (r_min_w > r_world) {
    sc.add(makeCircle(r_min_w, 96, 0xff3322, 0.3));
  }

  // Resonant orbit (amber ellipse)
  if (pe_res_w > r_world * 0.5) {
    const resLine = makeEllipse(pe_res_w, ap_res_w, 128, 0xffb300, 0.55);
    sc.add(resLine);
    // Pe dot
    const peDot = makeDot(0.07, 0xffb300);
    peDot.position.set(pe_res_w, 0, 0);
    sc.add(peDot);
  }

  // Target orbit ring (cyan)
  sc.add(makeCircle(r_orbit_w, 128, 0x00d4ff, 0.75));

  // Equatorial plane grid ring (faint)
  sc.add(makeCircle(r_orbit_w * 1.6, 64, 0x0a1a2a, 0.5));

  // Satellites + LOS lines
  const satColor  = losOK ? 0x00d4ff : 0xff5533;
  const losColor  = losOK ? 0x2aff6f : 0xff4422;
  const satPositions = [];

  for (let i = 0; i < n; i++) {
    const angle = (i / n) * Math.PI * 2;
    const sx = Math.cos(angle) * r_orbit_w;
    const sz = Math.sin(angle) * r_orbit_w;
    satPositions.push([sx, 0, sz]);

    // Satellite body
    const sat = makeDot(0.08, satColor);
    sat.position.set(sx, 0, sz);
    sc.add(sat);

    // Solar panel wings
    const wingDir = new THREE.Vector3(-sz, 0, sx).normalize().multiplyScalar(0.25);
    const wingFrom = [sx - wingDir.x, 0, sz - wingDir.z];
    const wingTo   = [sx + wingDir.x, 0, sz + wingDir.z];
    sc.add(makeArrow(wingFrom, wingTo, satColor));
  }

  // LOS lines between adjacent sats
  for (let i = 0; i < n; i++) {
    const a = satPositions[i];
    const b = satPositions[(i + 1) % n];
    const pts = [new THREE.Vector3(...a), new THREE.Vector3(...b)];
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({ color: losColor, transparent: true, opacity: 0.35 });
    sc.add(new THREE.Line(geo, mat));
  }

  // Resize grid ring
  sc.scene.remove(sc.gridRing);
  const newGrid = makeCircle(r_orbit_w * 1.05, 64, 0x102030, 0.5);
  sc.scene.add(newGrid);
  sc.gridRing = newGrid;

  sc.controls.maxDistance = r_orbit_w * 8;
  sc.controls.minDistance = r_world * 1.2;
}

// ── ORBIT 3D ───────────────────────────────────────────────

function updateOrbit3D({ bodyKey, peAlt, apAlt }) {
  const sc = getOrCreateScene('orb-canvas', [0, 2, 6]);
  if (!sc) return;
  sc.clearItems();

  const body    = BODIES[bodyKey];
  const r_world = 2.0;
  const scale   = r_world / body.radius;

  const pe_w  = (body.radius + peAlt) * scale;
  const ap_w  = (body.radius + apAlt) * scale;
  const sma_w = (pe_w + ap_w) / 2;
  const ecc   = (ap_w - pe_w) / (ap_w + pe_w);
  const pColor = hexInt(body.color);

  // SOI ring
  if (body.SOI !== Infinity) {
    const soiW = body.SOI * scale;
    if (soiW < 500) sc.add(makeCircle(soiW, 64, 0x1a1a44, 0.35));
  }

  // Planet
  sc.add(makeSphere(r_world, pColor, 0.22));
  sc.add(makeSolidSphere(r_world * 1.03, pColor, 0.06));

  // Atmosphere
  if (body.atmosphere) {
    const atmW = (body.radius + body.atmosphere.height) * scale;
    sc.add(makeSolidSphere(atmW, pColor, 0.04));
  }

  // Equatorial grid
  sc.add(makeCircle(ap_w * 1.3, 64, 0x0a1828, 0.4));

  // Orbit ellipse
  const orbitLine = makeEllipse(pe_w, ap_w, 256, 0x00d4ff, 0.85);
  sc.add(orbitLine);

  // Pe marker
  const peDot = makeDot(0.09, 0xff6633);
  peDot.position.set(pe_w, 0, 0);
  sc.add(peDot);

  // Ap marker
  const apDot = makeDot(0.09, 0x2aff6f);
  apDot.position.set(-ap_w, 0, 0);
  sc.add(apDot);

  // Velocity arrows (tangent to orbit = perpendicular to radius)
  // At Pe: velocity is +Z direction
  const pe_v_scale = 0.5;
  const ap_v_scale = pe_v_scale * (pe_w / ap_w); // by conservation of angular momentum
  sc.add(makeArrow([pe_w, 0, 0], [pe_w, 0, pe_v_scale * 1.5], 0xff6633));
  sc.add(makeArrow([-ap_w, 0, 0], [-ap_w, 0, -ap_v_scale * 1.5], 0x2aff6f));

  // Orbit normal vector (thin)
  sc.add(makeArrow([0, 0, 0], [0, ap_w * 0.35, 0], 0x223344));

  // Focus indicator dot (planet position confirmation)
  const focusDot = makeDot(0.04, 0xffffff);
  focusDot.position.set(0, 0, 0);
  sc.add(focusDot);

  sc.controls.maxDistance = ap_w * 5;
  sc.controls.minDistance = r_world * 1.2;
}

// ── TRANSFER 3D ────────────────────────────────────────────

function updateTransfer3D({ depKey, arrKey, r1, r2, a_transfer }) {
  const sc = getOrCreateScene('trn-canvas', [0, 3, 8]);
  if (!sc) return;
  sc.clearItems();

  const dep = BODIES[depKey];
  const arr = BODIES[arrKey];
  const maxR = Math.max(r1, r2);
  const scale = 5.0 / maxR;

  const r1_w = r1 * scale;
  const r2_w = r2 * scale;
  const a_w  = a_transfer * scale;

  // Kerbol
  const sunDot = makeDot(0.25, 0xffa500);
  const sunGlow = makeSolidSphere(0.5, 0xffa500, 0.12);
  sc.add(sunDot, sunGlow);

  // Departure orbit
  sc.add(makeCircle(r1_w, 128, hexInt(dep.color), 0.5));

  // Arrival orbit
  sc.add(makeCircle(r2_w, 128, hexInt(arr.color), 0.5));

  // Transfer ellipse: Pe=r1 (outward) or Pe=r2 (inward)
  const outward = r2 > r1;
  const pe_t = Math.min(r1_w, r2_w);
  const ap_t = Math.max(r1_w, r2_w);
  const transferLine = makeEllipse(pe_t, ap_t, 256, 0x00d4ff, 0.7);
  sc.add(transferLine);

  // Departure dot
  const depDot = makeDot(0.12, hexInt(dep.color));
  depDot.position.set(outward ? -pe_t : pe_t, 0, 0);
  sc.add(depDot);

  // Arrival dot
  const arrDot = makeDot(0.12, hexInt(arr.color));
  arrDot.position.set(outward ? ap_t : -ap_t, 0, 0);
  sc.add(arrDot);

  // ΔV arrows at departure and arrival points
  const dv1Pos = depDot.position;
  const dv2Pos = arrDot.position;
  sc.add(makeArrow([dv1Pos.x, 0, 0], [dv1Pos.x, 0, outward ? 0.5 : -0.5], 0x2aff6f));
  sc.add(makeArrow([dv2Pos.x, 0, 0], [dv2Pos.x, 0, outward ? -0.4 : 0.4], 0xff8844));

  // Orbit plane grid
  sc.add(makeCircle(r2_w * 1.2, 64, 0x0a1828, 0.4));

  sc.controls.maxDistance = r2_w * 4;
  sc.controls.minDistance = 0.5;
}

// ── resize helper ──────────────────────────────────────────
function resize3DCanvas(canvasId) {
  const sc = scenes3d[canvasId];
  if (!sc) return;
  const canvas = sc.canvas;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (w > 0 && h > 0 && (canvas.width !== w || canvas.height !== h)) {
    sc.resize(w, h);
  }
}
