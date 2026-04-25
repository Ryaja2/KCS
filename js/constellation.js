// Relay Constellation Calculator

let _syncingConst = false;

function syncConstellationAltPeriod(changedId) {
  if (_syncingConst) return;
  _syncingConst = true;
  const body = BODIES[document.getElementById('con-body').value];
  if (body) {
    if (changedId === 'con-period') {
      const T = parseFloat(document.getElementById('con-period').value);
      if (!isNaN(T) && T > 0) {
        const a = Math.cbrt(body.GM * T * T / (4 * Math.PI * Math.PI));
        const altKm = (a - body.radius) / 1000;
        if (altKm > 0) document.getElementById('con-altitude').value = altKm.toFixed(2);
      }
    } else {
      const altKm = parseFloat(document.getElementById('con-altitude').value);
      if (!isNaN(altKm) && altKm > 0) {
        const T = orbitalPeriod(body.GM, body.radius + altKm * 1000);
        document.getElementById('con-period').value = Math.round(T);
      }
    }
  }
  _syncingConst = false;
}

function initConstellation() {
  const bodySelect = document.getElementById('con-body');

  Object.entries(BODIES).forEach(([key, b]) => {
    if (b.type === 'planet' || b.type === 'moon') {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = b.name;
      if (key === 'kerbin') opt.selected = true;
      bodySelect.appendChild(opt);
    }
  });

  bodySelect.addEventListener('input', () => { syncConstellationAltPeriod('con-altitude'); calcConstellation(); });
  document.getElementById('con-numsats').addEventListener('input', calcConstellation);
  document.getElementById('con-altitude').addEventListener('input', () => { syncConstellationAltPeriod('con-altitude'); calcConstellation(); });
  document.getElementById('con-period').addEventListener('input', () => { syncConstellationAltPeriod('con-period'); calcConstellation(); });

  syncConstellationAltPeriod('con-altitude'); // seed period from default altitude
  calcConstellation();
}

function calcConstellation() {
  const bodyKey = document.getElementById('con-body').value;
  const n       = parseInt(document.getElementById('con-numsats').value);
  const altKm   = parseFloat(document.getElementById('con-altitude').value);
  const body    = BODIES[bodyKey];

  if (!body || isNaN(n) || isNaN(altKm) || n < 2) return;

  const alt      = altKm * 1000;
  const r_target = body.radius + alt;

  // Target circular orbit
  const T_target = orbitalPeriod(body.GM, r_target);
  const v_target = circularVelocity(body.GM, r_target);

  // Minimum LOS altitude between adjacent sats
  const minAlt   = minConstellationAltitude(body.radius, n);
  const losOK    = alt >= minAlt;

  // Resonant deployment orbit — elliptical:
  //   Ap = r_target (release/circularize point)
  //   a_res = r_target × ((N-1)/N)^(2/3)
  //   Pe = 2×a_res − Ap
  const a_res    = resonantOrbitSMA(r_target, n);
  const ap_res   = r_target;          // apoapsis at target altitude
  const pe_res   = 2 * a_res - ap_res;
  const ap_res_alt = altKm;           // same as target altitude
  const pe_res_alt = (pe_res - body.radius) / 1000;

  // Resonant period
  const T_res = orbitalPeriod(body.GM, a_res);

  // ΔV to enter resonant orbit from circular at r_target (burn at Ap)
  const v_ap_res    = velocityAtRadius(body.GM, ap_res, a_res);
  const res_entry_dv = Math.abs(v_target - v_ap_res);

  // Satellite spacing
  const spacing_deg = 360 / n;
  const spacing_km  = (2 * Math.PI * r_target / n) / 1000;

  const losColor = losOK ? 'ok' : 'warn';

  const resultsEl = document.getElementById('con-results');
  resultsEl.innerHTML = `
    <div class="panel-header">
      <span class="panel-header-text">Orbital Parameters</span>
      <span class="panel-header-led" style="background:${losOK ? 'var(--green)' : 'var(--red)'};box-shadow:0 0 6px ${losOK ? 'var(--green-glow)' : 'var(--red-glow)'}"></span>
    </div>
    <div class="panel-body">
      <div class="result-grid">
        <div class="result-card ${losColor}">
          <div class="result-label">Line-of-Sight</div>
          <div class="result-value">${losOK ? 'CLEAR' : 'BLOCKED'}</div>
          <div class="result-sub">Min safe alt: ${(minAlt/1000).toFixed(2)} km</div>
        </div>
        <div class="result-card">
          <div class="result-label">Orbital Period</div>
          <div class="result-value">${formatKSPTime(T_target)}</div>
        </div>
        <div class="result-card">
          <div class="result-label">Orbital Velocity</div>
          <div class="result-value">${v_target.toFixed(1)}</div>
          <div class="result-sub">m/s</div>
        </div>
        <div class="result-card">
          <div class="result-label">Sat Spacing</div>
          <div class="result-value">${spacing_deg.toFixed(1)}°</div>
          <div class="result-sub">${spacing_km.toFixed(1)} km arc</div>
        </div>
      </div>

      <div class="section-title" style="margin-top:14px">Resonant Deployment Orbit</div>
      <div class="result-grid">
        <div class="result-card accent">
          <div class="result-label">Resonant Pe Altitude</div>
          <div class="result-value" style="font-size:22px">${pe_res_alt.toFixed(1)} km</div>
          <div class="result-sub">retrograde burn from target alt</div>
        </div>
        <div class="result-card accent">
          <div class="result-label">Resonant Ap Altitude</div>
          <div class="result-value" style="font-size:22px">${ap_res_alt.toFixed(0)} km</div>
          <div class="result-sub">equals target altitude</div>
        </div>
        <div class="result-card accent">
          <div class="result-label">Resonant SMA</div>
          <div class="result-value" style="font-size:22px">${(a_res/1000).toFixed(1)} km</div>
        </div>
        <div class="result-card accent">
          <div class="result-label">Resonant Period</div>
          <div class="result-value">${formatKSPTime(T_res)}</div>
        </div>
        <div class="result-card ok">
          <div class="result-label">Entry ΔV (per release)</div>
          <div class="result-value">${res_entry_dv.toFixed(1)}</div>
          <div class="result-sub">m/s retrograde / circularize each</div>
        </div>
        <div class="result-card">
          <div class="result-label">Total Deployment ΔV</div>
          <div class="result-value">${(res_entry_dv * n).toFixed(1)}</div>
          <div class="result-sub">m/s (${n} sats × entry burn)</div>
        </div>
      </div>

      <div class="info-box">
        <b>Deploy sequence:</b> Circularize at ${altKm.toFixed(0)} km → release sat #1 →
        retrograde ${res_entry_dv.toFixed(1)} m/s to enter resonant orbit
        (Pe ${pe_res_alt.toFixed(1)} km / Ap ${ap_res_alt.toFixed(0)} km) →
        after 1 resonant period arrive back at Ap → prograde ${res_entry_dv.toFixed(1)} m/s →
        release sat #2 → repeat ${n} times.
      </div>
    </div>
  `;

  if (window.updateConst3D) {
    updateConst3D({ bodyKey, n, alt, minAlt, a_res, pe_res, ap_res, losOK });
  } else {
    drawConstellationViz(bodyKey, n, alt, minAlt, a_res, pe_res, ap_res, losOK);
  }
}

function drawConstellationViz(bodyKey, n, alt, minAlt, a_res, pe_res, ap_res, losOK) {
  const canvas = document.getElementById('con-canvas');
  const ctx    = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const cx = W / 2, cy = H / 2;

  clearCanvas(ctx, canvas);
  drawStars(ctx, canvas, 80, 137);

  const body     = BODIES[bodyKey];
  const r_target = body.radius + alt;
  const padding  = 44;
  const scale    = (Math.min(W, H) / 2 - padding) / r_target;
  const bodyPx   = Math.max(body.radius * scale, 8);
  const orbitPx  = r_target * scale;
  const minOrbitPx = (body.radius + minAlt) * scale;

  // Atmosphere glow
  if (body.atmosphere) {
    const atmPx = (body.radius + body.atmosphere.height) * scale;
    if (atmPx > bodyPx) {
      const g = ctx.createRadialGradient(cx, cy, bodyPx * 0.9, cx, cy, atmPx);
      g.addColorStop(0, hexToRGBA(body.color, 0.22));
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx, cy, atmPx, 0, Math.PI * 2); ctx.fill();
    }
  }

  // Min LOS orbit
  if (minOrbitPx > bodyPx) {
    ctx.strokeStyle = losOK ? 'rgba(255,80,80,0.2)' : 'rgba(255,80,80,0.55)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 7]);
    ctx.beginPath(); ctx.arc(cx, cy, minOrbitPx, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
  }

  // Resonant orbit (ellipse: Ap at top = away from focus)
  // a_res_px, b_res_px, c_res_px (center-to-focus)
  const a_res_px  = a_res * scale;
  const pe_res_px = pe_res * scale;
  const b_res_px  = Math.sqrt(a_res_px * orbitPx); // b = sqrt(pe × ap) = sqrt(pe_res_px × orbitPx)
  const c_res_px  = a_res_px - pe_res_px;           // focus offset

  // Draw resonant ellipse (rotated so Ap = right side for clarity)
  ctx.save();
  ctx.translate(cx - c_res_px, cy); // center of ellipse at (cx - c, cy)
  ctx.strokeStyle = 'rgba(255,179,0,0.4)';
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.ellipse(0, 0, a_res_px, b_res_px, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // Resonant orbit Pe/Ap labels
  const apPtX = cx + orbitPx; // Ap of resonant = target orbit radius
  const pePtX = cx - pe_res_px;
  ctx.fillStyle = 'rgba(255,179,0,0.6)';
  ctx.beginPath(); ctx.arc(pePtX, cy, 3, 0, Math.PI * 2); ctx.fill();
  drawLabel(ctx, pePtX - 4, cy + 12, `Pe ${((pe_res - BODIES[bodyKey].radius)/1000).toFixed(0)}km`, 'rgba(255,179,0,0.7)', 9, 'center');

  // Target orbit ring
  ctx.strokeStyle = '#1e3a4e';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(cx, cy, orbitPx, 0, Math.PI * 2); ctx.stroke();

  // Body
  drawBody(ctx, cx, cy, bodyPx, body.color, body.color);

  // LOS connection lines between sats
  const satPos = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    satPos.push({ x: cx + Math.cos(a) * orbitPx, y: cy + Math.sin(a) * orbitPx });
  }

  ctx.strokeStyle = losOK ? 'rgba(42,255,111,0.25)' : 'rgba(255,80,80,0.3)';
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 5]);
  for (let i = 0; i < n; i++) {
    const a = satPos[i], b = satPos[(i + 1) % n];
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  ctx.setLineDash([]);

  // Satellites
  satPos.forEach(p => drawSatellite(ctx, p.x, p.y, losOK ? '#00d4ff' : '#ff6644'));

  // Legend
  drawLabel(ctx, 8, H - 24, '--- Resonant orbit', 'rgba(255,179,0,0.6)', 9, 'left');
  drawLabel(ctx, 8, H - 12, `─── Target orbit (${(alt/1000).toFixed(0)} km)`, '#1e4a5e', 9, 'left');
  drawLabel(ctx, W - 8, 16, `${n} × ${body.name}`, '#3a6080', 11, 'right');
}
