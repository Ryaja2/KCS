// Transfer Orbit Calculator

function initTransfer() {
  const depSelect = document.getElementById('trn-departure');
  const arrSelect = document.getElementById('trn-arrival');

  ['trn-departure', 'trn-arrival'].forEach(id => {
    populateBodySelect(document.getElementById(id),
      (key, b) => b.parent === 'kerbol' && b.type === 'planet', null);
  });
  document.getElementById('trn-departure').value = 'kerbin';
  document.getElementById('trn-arrival').value = 'duna';

  document.querySelectorAll('#tab-transfer input, #tab-transfer select').forEach(el => {
    el.addEventListener('input', calcTransfer);
  });
  calcTransfer();
}

function readTransferUT() {
  const y = parseInt(document.getElementById('trn-ut-y').value) || 1;
  const d = parseInt(document.getElementById('trn-ut-d').value) || 1;
  const h = parseInt(document.getElementById('trn-ut-h').value) || 0;
  const m = parseInt(document.getElementById('trn-ut-m').value) || 0;
  const s = parseInt(document.getElementById('trn-ut-s').value) || 0;
  return kspUTFromFields(y, d, h, m, s);
}

function calcTransfer() {
  const depKey   = document.getElementById('trn-departure').value;
  const arrKey   = document.getElementById('trn-arrival').value;
  const depAlt   = parseFloat(document.getElementById('trn-dep-alt').value) * 1000;
  const arrAlt   = parseFloat(document.getElementById('trn-arr-alt').value) * 1000;

  if (depKey === arrKey) {
    document.getElementById('trn-results').innerHTML = '<div class="warn-text">Select different departure and arrival bodies.</div>';
    return;
  }

  const dep = BODIES[depKey];
  const arr = BODIES[arrKey];
  const GM_sun = BODIES.kerbol.GM;

  const r1 = dep.SMA; // semi-major axis of departure planet orbit
  const r2 = arr.SMA; // semi-major axis of arrival planet orbit

  // Interplanetary Hohmann
  const hoh = hohmannDv(GM_sun, r1, r2);

  // v_inf at departure (hyperbolic excess velocity relative to departure planet)
  const v_circ_dep = circularVelocity(GM_sun, r1);
  const v_at_dep   = velocityAtRadius(GM_sun, r1, hoh.a_transfer);
  const v_inf_dep  = Math.abs(v_at_dep - v_circ_dep);

  // Ejection burn from parking orbit
  const r_park_dep = dep.radius + depAlt;
  const dv_eject = ejectionDv(dep.GM, r_park_dep, v_inf_dep);

  // v_inf at arrival
  const v_circ_arr = circularVelocity(GM_sun, r2);
  const v_at_arr   = velocityAtRadius(GM_sun, r2, hoh.a_transfer);
  const v_inf_arr  = Math.abs(v_circ_arr - v_at_arr);

  // Capture burn into circular orbit
  const r_park_arr = arr.radius + arrAlt;
  const dv_capture = ejectionDv(arr.GM, r_park_arr, v_inf_arr);

  const totalDv = dv_eject + dv_capture;
  const phase = phaseAngle(GM_sun, r1, r2);
  const T1 = orbitalPeriod(GM_sun, r1);
  const T2 = orbitalPeriod(GM_sun, r2);
  const synodic = synodicPeriod(T1, T2);
  const waitAngle = ((360 - phase) % 360).toFixed(2);

  // Direction label
  const outward = r2 > r1;
  const dirLabel = outward ? 'prograde' : 'retrograde';

  document.getElementById('trn-results').innerHTML = `
    <div class="panel-header">
      <span class="panel-header-text">Transfer — ${dep.name} → ${arr.name}</span>
      <span class="panel-header-led" style="background:var(--amber);box-shadow:0 0 6px var(--amber-glow)"></span>
    </div>
    <div class="panel-body">
    <div class="result-grid">
      <div class="result-card accent">
        <div class="result-label">Ejection Burn (${dep.name})</div>
        <div class="result-value">${dv_eject.toFixed(1)} m/s</div>
        <div class="result-sub">${dirLabel} — from ${(depAlt/1000).toFixed(0)} km orbit</div>
      </div>
      <div class="result-card accent">
        <div class="result-label">Capture Burn (${arr.name})</div>
        <div class="result-value">${dv_capture.toFixed(1)} m/s</div>
        <div class="result-sub">into ${(arrAlt/1000).toFixed(0)} km orbit</div>
      </div>
      <div class="result-card ok">
        <div class="result-label">Total ΔV</div>
        <div class="result-value">${totalDv.toFixed(1)} m/s</div>
      </div>
      <div class="result-card">
        <div class="result-label">Transfer Time</div>
        <div class="result-value">${formatKSPTime(hoh.transferTime)}</div>
      </div>
      <div class="result-card">
        <div class="result-label">Phase Angle Required</div>
        <div class="result-value">${phase.toFixed(2)}°</div>
        <div class="result-sub">${arr.name} must be ${phase.toFixed(1)}° ahead</div>
      </div>
      <div class="result-card">
        <div class="result-label">Synodic Period</div>
        <div class="result-value">${formatKSPTime(synodic)}</div>
        <div class="result-sub">window repeat interval</div>
      </div>
    </div>
    <div class="section-title" style="margin-top:16px">Interplanetary Breakdown</div>
    <div class="result-grid">
      <div class="result-card">
        <div class="result-label">Transfer Orbit SMA</div>
        <div class="result-value">${formatDistance(hoh.a_transfer)}</div>
      </div>
      <div class="result-card">
        <div class="result-label">Hyperbolic v∞ (departure)</div>
        <div class="result-value">${v_inf_dep.toFixed(1)} m/s</div>
      </div>
      <div class="result-card">
        <div class="result-label">Hyperbolic v∞ (arrival)</div>
        <div class="result-value">${v_inf_arr.toFixed(1)} m/s</div>
      </div>
      <div class="result-card">
        <div class="result-label">Interplanetary ΔV only</div>
        <div class="result-value">${hoh.total.toFixed(1)} m/s</div>
        <div class="result-sub">(no Oberth — for reference)</div>
      </div>
    </div>
    <div class="info-box">
      <b>Note:</b> Ejection/capture burns include Oberth effect from ${(depAlt/1000).toFixed(0)} km / ${(arrAlt/1000).toFixed(0)} km parking orbits.
      Assumes circular, coplanar orbits. Inclination corrections add ΔV.
    </div>
    </div>
  `;

  if (window.updateTransfer3D) {
    updateTransfer3D({ depKey, arrKey, r1, r2, a_transfer: hoh.a_transfer });
  } else {
    drawTransferViz(depKey, arrKey, hoh, r1, r2);
  }

  drawTransferClock(depKey, arrKey, phase, synodic);
}

function drawTransferViz(depKey, arrKey, hoh, r1, r2) {
  const canvas = document.getElementById('trn-canvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const cx = W / 2, cy = H / 2;

  clearCanvas(ctx, canvas);
  drawStars(ctx, canvas, 100, 99);

  const dep = BODIES[depKey];
  const arr = BODIES[arrKey];
  const outward = r2 > r1;

  const padding = 50;
  const maxR = Math.max(r1, r2);
  const scale = (Math.min(W, H) / 2 - padding) / maxR;

  // Draw Kerbol
  drawBody(ctx, cx, cy, 12, BODIES.kerbol.color, BODIES.kerbol.color);

  // Draw departure orbit
  const r1px = r1 * scale;
  drawOrbit(ctx, cx, cy, r1px, r1px, 0, hexToRGBA(dep.color, 0.5));
  drawLabel(ctx, cx + r1px + 4, cy - 4, dep.name, hexToRGBA(dep.color, 0.9), 10, 'left');

  // Draw arrival orbit
  const r2px = r2 * scale;
  drawOrbit(ctx, cx, cy, r2px, r2px, 0, hexToRGBA(arr.color, 0.5));
  drawLabel(ctx, cx + r2px + 4, cy - 4, arr.name, hexToRGBA(arr.color, 0.9), 10, 'left');

  // Transfer ellipse
  // Semi-major axis = (r1+r2)/2, periapsis = r1 (outward) or r2 (inward)
  const aPx = hoh.a_transfer * scale;
  const periPx = Math.min(r1, r2) * scale;
  const apoPx  = Math.max(r1, r2) * scale;
  const bPx = Math.sqrt(aPx * aPx - Math.pow((apoPx - periPx) / 2, 2));

  // Center of ellipse is at (cx + (apoPx - periPx)/2, cy) if periapsis is at left
  const eFocusDist = aPx - periPx; // distance from center to focus
  const ellCx = outward ? cx - eFocusDist : cx + eFocusDist;

  ctx.save();
  ctx.translate(ellCx, cy);
  ctx.strokeStyle = '#00d4ff';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.ellipse(0, 0, aPx, bPx, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // Departure point (periapsis of transfer if outward)
  const depAngle = Math.PI; // left side = periapsis (outward: closer to sun)
  const depPx_x = outward ? cx - r1px : cx + r1px;
  const depPx_y = cy;

  drawBody(ctx, depPx_x, depPx_y, 5, dep.color, null);

  // Arrival point
  const arrPx_x = outward ? cx + r2px : cx - r2px;
  const arrPx_y = cy;
  drawBody(ctx, arrPx_x, arrPx_y, 5, arr.color, null);

  // ΔV arrows
  drawArrow(ctx, depPx_x, depPx_y - 5, depPx_x, depPx_y - 25, '#00ff88', 'Δv₁');
  drawArrow(ctx, arrPx_x, arrPx_y - 5, arrPx_x, arrPx_y - 25, '#ff8844', 'Δv₂');

  drawLabel(ctx, 8, 20, `${dep.name} → ${arr.name}`, '#7a9fc0', 11, 'left');
  drawLabel(ctx, 8, H - 10, 'Scale: Kerbol system (circular approximation)', '#446680', 10, 'left');
}

function drawTransferClock(depKey, arrKey, requiredPhaseDeg, synodic) {
  const canvas = document.getElementById('trn-clock-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const cx = W / 2, cy = H / 2;
  const radius = Math.min(W, H) / 2 - 32;

  clearCanvas(ctx, canvas);
  drawStars(ctx, canvas, 80, 77);

  const dep = BODIES[depKey];
  const arr = BODIES[arrKey];
  const GM = BODIES.kerbol.GM;
  const outward = arr.SMA > dep.SMA;

  // Scaled orbital radii for display (departure innermost when outward)
  const rMin = Math.min(dep.SMA, arr.SMA);
  const rMax = Math.max(dep.SMA, arr.SMA);
  const depR_px = (dep.SMA / rMax) * radius * 0.82;
  const arrR_px = (arr.SMA / rMax) * radius * 0.82;

  // Radar grid rings
  [0.3, 0.55, 0.82].forEach(f => {
    ctx.beginPath();
    ctx.arc(cx, cy, radius * f, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(0,212,255,0.07)';
    ctx.lineWidth = 1;
    ctx.stroke();
  });

  // Tick marks around rim
  for (let a = 0; a < 360; a += 10) {
    const ar = (a - 90) * Math.PI / 180;
    const isMajor = a % 30 === 0;
    const tickLen = isMajor ? 9 : 5;
    ctx.beginPath();
    ctx.moveTo(cx + (radius - tickLen) * Math.cos(ar), cy + (radius - tickLen) * Math.sin(ar));
    ctx.lineTo(cx + radius * Math.cos(ar), cy + radius * Math.sin(ar));
    ctx.strokeStyle = isMajor ? 'rgba(0,212,255,0.35)' : 'rgba(0,212,255,0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();
    if (isMajor) {
      ctx.fillStyle = 'rgba(0,212,255,0.45)';
      ctx.font = '8px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const labelR = radius - 18;
      ctx.fillText(a + '°', cx + labelR * Math.cos(ar), cy + labelR * Math.sin(ar));
    }
  }

  // Orbit rings
  ctx.beginPath();
  ctx.arc(cx, cy, depR_px, 0, 2 * Math.PI);
  ctx.strokeStyle = hexToRGBA(dep.color, 0.35);
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, arrR_px, 0, 2 * Math.PI);
  ctx.strokeStyle = hexToRGBA(arr.color, 0.35);
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Kerbol at center
  const sunGrd = ctx.createRadialGradient(cx, cy, 0, cx, cy, 12);
  sunGrd.addColorStop(0, '#ffe87c');
  sunGrd.addColorStop(0.5, '#FFA500');
  sunGrd.addColorStop(1, 'transparent');
  ctx.beginPath();
  ctx.arc(cx, cy, 12, 0, 2 * Math.PI);
  ctx.fillStyle = sunGrd;
  ctx.fill();

  // Get current planet angles from UT
  const UT = readTransferUT();
  const depAngleRad = planetAngleAtUT(dep, UT);   // inertial angle of departure
  const arrAngleRad = planetAngleAtUT(arr, UT);   // inertial angle of arrival

  // Display: fix departure at top (−π/2 in canvas), rotate everything by depAngle offset
  const rotOffset = -Math.PI / 2 - depAngleRad;

  // Arrival current position display angle
  const arrDisplayAngle = arrAngleRad + rotOffset;

  // Required arrival position: departure is at -π/2 (top), required is requiredPhaseDeg ahead (CCW = subtract in canvas)
  const reqArrDisplayAngle = -Math.PI / 2 + (requiredPhaseDeg * Math.PI / 180) * (outward ? 1 : -1);

  // Draw reference line from center to departure (top)
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + depR_px * Math.cos(-Math.PI / 2), cy + depR_px * Math.sin(-Math.PI / 2));
  ctx.strokeStyle = hexToRGBA(dep.color, 0.25);
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 5]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Required arrival position (dashed circle + line)
  const reqX = cx + arrR_px * Math.cos(reqArrDisplayAngle);
  const reqY = cy + arrR_px * Math.sin(reqArrDisplayAngle);
  ctx.save();
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.arc(reqX, reqY, 7, 0, 2 * Math.PI);
  ctx.strokeStyle = hexToRGBA(arr.color, 0.55);
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
  drawLabel(ctx, reqX + (reqX > cx ? 10 : -10), reqY + (reqY > cy ? 10 : -12),
    'target pos', hexToRGBA(arr.color, 0.5), 9, reqX > cx ? 'left' : 'right');

  // Phase arc between current arrival and required (on arrival orbit ring)
  const arcStart = Math.min(arrDisplayAngle, reqArrDisplayAngle);
  const arcEnd   = Math.max(arrDisplayAngle, reqArrDisplayAngle);
  // Draw shorter arc
  ctx.beginPath();
  if (arcEnd - arcStart < Math.PI) {
    ctx.arc(cx, cy, arrR_px, arcStart, arcEnd);
  } else {
    ctx.arc(cx, cy, arrR_px, arcEnd, arcStart + 2 * Math.PI);
  }
  ctx.strokeStyle = 'rgba(255,179,0,0.5)';
  ctx.lineWidth = 2;
  ctx.setLineDash([3, 3]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Departure planet dot (top)
  const depDispX = cx + depR_px * Math.cos(-Math.PI / 2);
  const depDispY = cy + depR_px * Math.sin(-Math.PI / 2);
  drawBody(ctx, depDispX, depDispY, 5, dep.color, dep.color);
  drawLabel(ctx, depDispX + (depDispX > cx ? 8 : -8), depDispY - 12,
    dep.name, dep.color, 10, depDispX > cx ? 'left' : 'right');

  // Arrival planet current position
  const arrDispX = cx + arrR_px * Math.cos(arrDisplayAngle);
  const arrDispY = cy + arrR_px * Math.sin(arrDisplayAngle);
  drawBody(ctx, arrDispX, arrDispY, 5, arr.color, arr.color);
  drawLabel(ctx, arrDispX + (arrDispX > cx ? 8 : -8), arrDispY + (arrDispY > cy ? 12 : -12),
    arr.name, arr.color, 10, arrDispX > cx ? 'left' : 'right');

  // Current phase angle measurement
  let currentPhaseDeg = ((arrAngleRad - depAngleRad) * 180 / Math.PI % 360 + 360) % 360;
  const phaseDiff = (currentPhaseDeg - requiredPhaseDeg + 360) % 360;

  // Time to next window
  const omega_dep = Math.sqrt(GM / Math.pow(dep.SMA, 3));
  const omega_arr = Math.sqrt(GM / Math.pow(arr.SMA, 3));
  const dPhi = omega_arr - omega_dep;  // rad/s
  let timeToWindow;
  if (Math.abs(dPhi) < 1e-20) {
    timeToWindow = 0;
  } else {
    const curPhiRad = ((currentPhaseDeg * Math.PI / 180) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
    const reqPhiRad = ((requiredPhaseDeg * Math.PI / 180) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
    let delta;
    if (dPhi < 0) {
      // Phase decreasing: wait for curPhi to decrease to reqPhi
      delta = curPhiRad - reqPhiRad;
      if (delta < 0) delta += 2 * Math.PI;
      timeToWindow = delta / Math.abs(dPhi);
    } else {
      // Phase increasing: wait for curPhi to increase to reqPhi
      delta = reqPhiRad - curPhiRad;
      if (delta < 0) delta += 2 * Math.PI;
      timeToWindow = delta / dPhi;
    }
  }

  // HUD overlay — bottom band
  ctx.fillStyle = 'rgba(0,8,20,0.65)';
  ctx.fillRect(0, H - 72, W, 72);
  ctx.strokeStyle = 'rgba(0,212,255,0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, H - 72);
  ctx.lineTo(W, H - 72);
  ctx.stroke();

  const colW = W / 4;
  const cells = [
    ['CURRENT PHASE', currentPhaseDeg.toFixed(2) + '°'],
    ['REQUIRED PHASE', requiredPhaseDeg.toFixed(2) + '°'],
    ['PHASE ERROR', (phaseDiff > 180 ? phaseDiff - 360 : phaseDiff).toFixed(2) + '°'],
    ['TIME TO WINDOW', formatKSPTime(timeToWindow)],
  ];

  cells.forEach(([label, value], i) => {
    const bx = i * colW + colW / 2;
    ctx.fillStyle = 'rgba(0,212,255,0.4)';
    ctx.font = '7px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, bx, H - 56);

    const isError = label === 'PHASE ERROR';
    const errVal = isError ? parseFloat(value) : 0;
    ctx.fillStyle = isError
      ? (Math.abs(errVal) < 5 ? '#00ff88' : Math.abs(errVal) < 20 ? '#ffb300' : '#ff8844')
      : '#e8f4f8';
    ctx.font = 'bold 14px "VT323", monospace';
    ctx.fillText(value, bx, H - 38);

    if (i < 3) {
      ctx.strokeStyle = 'rgba(0,212,255,0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo((i + 1) * colW, H - 68);
      ctx.lineTo((i + 1) * colW, H - 4);
      ctx.stroke();
    }
  });

  // Title
  drawLabel(ctx, 8, 16, `TRANSFER WINDOW — ${dep.name.toUpperCase()} → ${arr.name.toUpperCase()}`, 'rgba(0,212,255,0.5)', 9, 'left');
  drawLabel(ctx, W - 8, 16, `UT Y${Math.floor(UT/9203400)+1} D${Math.floor((UT%9203400)/21600)+1}`, 'rgba(0,212,255,0.35)', 9, 'right');
}
