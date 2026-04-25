// Orbital mechanics utilities

function orbitalPeriod(GM, sma) {
  return 2 * Math.PI * Math.sqrt(Math.pow(sma, 3) / GM);
}

function smaFromPeriod(GM, T) {
  return Math.pow((T / (2 * Math.PI)) * (T / (2 * Math.PI)) * GM, 1/3);
}

function circularVelocity(GM, r) {
  return Math.sqrt(GM / r);
}

function velocityAtRadius(GM, r, sma) {
  return Math.sqrt(GM * (2 / r - 1 / sma));
}

function hohmannDv(GM, r1, r2) {
  const a_t = (r1 + r2) / 2;
  const v1 = circularVelocity(GM, r1);
  const v2 = circularVelocity(GM, r2);
  const vt1 = velocityAtRadius(GM, r1, a_t);
  const vt2 = velocityAtRadius(GM, r2, a_t);
  return {
    dv1: vt1 - v1,
    dv2: v2 - vt2,
    total: Math.abs(vt1 - v1) + Math.abs(v2 - vt2),
    transferTime: Math.PI * Math.sqrt(Math.pow(a_t, 3) / GM),
    a_transfer: a_t
  };
}

// Ejection burn from circular parking orbit given hyperbolic excess velocity
function ejectionDv(GM_body, r_park, v_inf) {
  const v_park = circularVelocity(GM_body, r_park);
  const v_hyp = Math.sqrt(v_inf * v_inf + 2 * GM_body / r_park);
  return v_hyp - v_park;
}

// Phase angle required for Hohmann transfer
function phaseAngle(GM_sun, r1, r2) {
  const a_t = (r1 + r2) / 2;
  const t_transfer = Math.PI * Math.sqrt(Math.pow(a_t, 3) / GM_sun);
  const omega2 = Math.sqrt(GM_sun / Math.pow(r2, 3));
  const angle_rad = Math.PI - omega2 * t_transfer;
  return ((angle_rad * 180 / Math.PI) % 360 + 360) % 360;
}

// Synodic period between two orbits
function synodicPeriod(T1, T2) {
  return Math.abs(1 / (1/T1 - 1/T2));
}

// Minimum altitude for N-satellite constellation LOS
function minConstellationAltitude(bodyRadius, n) {
  return bodyRadius * (1 / Math.cos(Math.PI / n) - 1);
}

// Resonant orbit SMA for deploying N satellites into target circular orbit
// Carrier drops one sat per orbit from resonant orbit
function resonantOrbitSMA(targetSMA, n) {
  // Period ratio (n-1)/n means carrier arrives at same point every n orbits
  // while target orbit period * (n-1)/n = carrier period
  const ratio = (n - 1) / n;
  return targetSMA * Math.pow(ratio, 2/3);
}

// Delta-V from rocket equation
function rocketDv(Isp, m0, mf) {
  if (mf <= 0 || m0 <= mf) return 0;
  return Isp * G0 * Math.log(m0 / mf);
}

// CommNet range
function commnetRange(p1, p2) {
  return Math.sqrt(p1 * p2);
}

// CommNet signal strength (KSP1 formula: signal = 1 - (d/maxR)^(log0.5/log(relPow)))
// Simplified: KSP uses exponent based on rangeModifier, default results in
// signal = (1 - d/R) with some curve. Using simple linear for display.
function signalStrength(distance, maxRange) {
  if (distance >= maxRange) return 0;
  const ratio = distance / maxRange;
  // KSP1 uses a curve: strength = (1 - ratio) clamped, but displayed non-linearly
  // Exact formula: exponent = Math.log(0.5) / Math.log(baseSignal) where baseSignal depends on range setting
  // For simplicity use quadratic approximation matching KSP behavior
  return Math.max(0, 1 - ratio * ratio);
}

// Format seconds to KSP time (6h days, 426-day years)
function formatKSPTime(seconds) {
  const s = Math.floor(seconds) % 60;
  const m = Math.floor(seconds / 60) % 60;
  const h = Math.floor(seconds / 3600) % 6;
  const d = Math.floor(seconds / 21600) % 426;
  const y = Math.floor(seconds / (21600 * 426));
  const parts = [];
  if (y > 0) parts.push(`${y}y`);
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

function formatDistance(m) {
  if (m >= 1e12) return (m / 1e12).toFixed(3) + ' Tm';
  if (m >= 1e9)  return (m / 1e9).toFixed(3) + ' Gm';
  if (m >= 1e6)  return (m / 1e6).toFixed(3) + ' Mm';
  if (m >= 1e3)  return (m / 1e3).toFixed(2) + ' km';
  return m.toFixed(1) + ' m';
}

function formatPower(w) {
  if (w >= 1e15) return (w / 1e15).toFixed(2) + ' PT';
  if (w >= 1e12) return (w / 1e12).toFixed(2) + ' TW (T)';
  if (w >= 1e9)  return (w / 1e9).toFixed(2) + ' GW (G)';
  if (w >= 1e6)  return (w / 1e6).toFixed(2) + ' MW (M)';
  if (w >= 1e3)  return (w / 1e3).toFixed(2) + ' kW (k)';
  return w.toFixed(0) + ' W';
}

function formatDv(dv) {
  return dv.toFixed(1) + ' m/s';
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

// Solve Kepler's equation M = E - e*sin(E) for eccentric anomaly E
function solveKepler(M, e, tol = 1e-8) {
  let E = M;
  for (let i = 0; i < 100; i++) {
    const dE = (M - E + e * Math.sin(E)) / (1 - e * Math.cos(E));
    E += dE;
    if (Math.abs(dE) < tol) break;
  }
  return E;
}

// True anomaly from mean anomaly and eccentricity
function trueAnomalyFromMA(M, e) {
  const Mnorm = ((M % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const E = solveKepler(Mnorm, e);
  return 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
}

// Angle (true anomaly) of a solar planet at given KSP UT (seconds from epoch)
function planetAngleAtUT(body, UT) {
  if (body.epochMA === undefined) return 0;
  const T = orbitalPeriod(BODIES.kerbol.GM, body.SMA);
  const M = body.epochMA + (2 * Math.PI * UT) / T;
  return trueAnomalyFromMA(M, body.eccentricity || 0);
}

// KSP UT from Y/D/h/m/s (1-based year and day)
function kspUTFromFields(y, d, h, m, s) {
  return (y - 1) * 9203400 + (d - 1) * 21600 + h * 3600 + m * 60 + s;
}

// Populate a <select> with optgroup-nested body options.
// filter(key, body) → true to include. defaultKey sets initial value.
// Each planet with moons becomes an optgroup (planet first, then moons).
// Planets without moons and Kerbol are standalone options.
function populateBodySelect(sel, filter, defaultKey) {
  const moonsByParent = {};
  Object.entries(BODIES).forEach(([key, b]) => {
    if (!filter(key, b)) return;
    if (b.parent && b.parent !== 'kerbol') {
      (moonsByParent[b.parent] = moonsByParent[b.parent] || []).push(key);
    }
  });

  Object.entries(BODIES).forEach(([key, b]) => {
    if (!filter(key, b)) return;
    // Only process top-level bodies here (star + planets); moons added inside groups
    if (b.parent && b.parent !== 'kerbol') return;

    const moons = moonsByParent[key] || [];
    if (moons.length) {
      // Planet with moons → optgroup
      const group = document.createElement('optgroup');
      group.label = `${b.name} System`;
      const planetOpt = document.createElement('option');
      planetOpt.value = key; planetOpt.textContent = b.name;
      group.appendChild(planetOpt);
      moons.forEach(moonKey => {
        const opt = document.createElement('option');
        opt.value = moonKey; opt.textContent = BODIES[moonKey].name;
        group.appendChild(opt);
      });
      sel.appendChild(group);
    } else {
      // Standalone option (no moons, or Kerbol)
      const opt = document.createElement('option');
      opt.value = key; opt.textContent = b.name;
      sel.appendChild(opt);
    }
  });

  if (defaultKey) sel.value = defaultKey;
}
