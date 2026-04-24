// Transfer Orbit Calculator

function initTransfer() {
  const depSelect = document.getElementById('trn-departure');
  const arrSelect = document.getElementById('trn-arrival');

  KERBOL_PLANETS.forEach(key => {
    const b = BODIES[key];
    ['trn-departure', 'trn-arrival'].forEach(id => {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = b.name;
      document.getElementById(id).appendChild(opt);
    });
  });

  document.getElementById('trn-departure').value = 'kerbin';
  document.getElementById('trn-arrival').value = 'duna';

  document.querySelectorAll('#tab-transfer input, #tab-transfer select').forEach(el => {
    el.addEventListener('input', calcTransfer);
  });
  calcTransfer();
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
  `;

  if (window.updateTransfer3D) {
    updateTransfer3D({ depKey, arrKey, r1, r2, a_transfer: hoh.a_transfer });
  } else {
    drawTransferViz(depKey, arrKey, hoh, r1, r2);
  }
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
