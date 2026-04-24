// Relay Constellation Calculator

function initConstellation() {
  const bodySelect = document.getElementById('con-body');
  const numSats = document.getElementById('con-numsats');
  const altInput = document.getElementById('con-altitude');
  const canvas = document.getElementById('con-canvas');

  // Populate body dropdown
  Object.entries(BODIES).forEach(([key, b]) => {
    if (b.type === 'planet' || b.type === 'moon') {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = b.name;
      if (key === 'kerbin') opt.selected = true;
      bodySelect.appendChild(opt);
    }
  });

  [bodySelect, numSats, altInput].forEach(el => el.addEventListener('input', calcConstellation));
  calcConstellation();
}

function calcConstellation() {
  const bodyKey = document.getElementById('con-body').value;
  const n = parseInt(document.getElementById('con-numsats').value);
  const altKm = parseFloat(document.getElementById('con-altitude').value);
  const body = BODIES[bodyKey];

  if (!body || isNaN(n) || isNaN(altKm) || n < 2) return;

  const alt = altKm * 1000;
  const r = body.radius + alt;

  // Min altitude for LOS between adjacent sats
  const minAlt = minConstellationAltitude(body.radius, n);
  const minAltKm = minAlt / 1000;

  // Target orbit
  const T = orbitalPeriod(body.GM, r);
  const v = circularVelocity(body.GM, r);

  // Resonant orbit (deploy from carrier: each release one sat per carrier orbit)
  const res_sma = resonantOrbitSMA(r, n);
  const res_r_body = res_sma; // circular resonant orbit
  const res_alt = res_sma - body.radius;
  const res_T = orbitalPeriod(body.GM, res_sma);
  const res_dv = Math.abs(v - circularVelocity(body.GM, res_sma));

  // Spacing
  const spacing_deg = 360 / n;
  const spacing_km = (2 * Math.PI * r / n) / 1000;

  const losOK = alt >= minAlt;
  const losColor = losOK ? '#00ff88' : '#ff4444';
  const losText = losOK
    ? `✓ LOS clear (min: ${minAltKm.toFixed(1)} km)`
    : `✗ Below min LOS altitude (need ${minAltKm.toFixed(1)} km)`;

  document.getElementById('con-results').innerHTML = `
    <div class="result-grid">
      <div class="result-card ${losOK ? 'ok' : 'warn'}">
        <div class="result-label">Line-of-Sight</div>
        <div class="result-value" style="color:${losColor}">${losText}</div>
      </div>
      <div class="result-card">
        <div class="result-label">Min Safe Altitude</div>
        <div class="result-value">${minAltKm.toFixed(2)} km</div>
      </div>
      <div class="result-card">
        <div class="result-label">Orbital Period</div>
        <div class="result-value">${formatKSPTime(T)}</div>
      </div>
      <div class="result-card">
        <div class="result-label">Orbital Velocity</div>
        <div class="result-value">${v.toFixed(1)} m/s</div>
      </div>
      <div class="result-card">
        <div class="result-label">Satellite Spacing</div>
        <div class="result-value">${spacing_deg.toFixed(2)}° / ${spacing_km.toFixed(1)} km</div>
      </div>
    </div>
    <div class="section-title" style="margin-top:16px">Resonant Deployment Orbit</div>
    <div class="result-grid">
      <div class="result-card accent">
        <div class="result-label">Resonant SMA</div>
        <div class="result-value">${(res_sma / 1000).toFixed(1)} km</div>
      </div>
      <div class="result-card accent">
        <div class="result-label">Resonant Altitude</div>
        <div class="result-value">${(res_alt / 1000).toFixed(1)} km</div>
      </div>
      <div class="result-card accent">
        <div class="result-label">Resonant Period</div>
        <div class="result-value">${formatKSPTime(res_T)}</div>
      </div>
      <div class="result-card accent">
        <div class="result-label">Circularization ΔV</div>
        <div class="result-value">${res_dv.toFixed(1)} m/s</div>
      </div>
    </div>
    <div class="info-box">
      <b>Deployment:</b> Enter resonant orbit → release sat #1 → wait 1 resonant orbit → release sat #2 → repeat ${n} times → circularize carrier to target orbit.
      Circularize each sat immediately after release.
    </div>
  `;

  drawConstellationViz(bodyKey, n, alt, minAlt, losOK);
}

function drawConstellationViz(bodyKey, n, alt, minAlt, losOK) {
  const canvas = document.getElementById('con-canvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const cx = W / 2, cy = H / 2;

  clearCanvas(ctx, canvas);
  drawStars(ctx, canvas, 80, 137);

  const body = BODIES[bodyKey];
  const padding = 40;
  const maxDim = Math.min(W, H) / 2 - padding;

  // Scale: fit the target orbit
  const r_orbit = body.radius + alt;
  const scale = maxDim / r_orbit;

  const bodyPx = Math.max(body.radius * scale, 8);
  const orbitPx = r_orbit * scale;
  const minOrbitPx = (body.radius + minAlt) * scale;
  const atmPx = body.atmosphere ? (body.radius + body.atmosphere.height) * scale : 0;

  // Draw atmosphere
  if (body.atmosphere && atmPx > bodyPx) {
    const atmGrd = ctx.createRadialGradient(cx, cy, bodyPx * 0.9, cx, cy, atmPx);
    atmGrd.addColorStop(0, hexToRGBA(body.color, 0.25));
    atmGrd.addColorStop(1, 'transparent');
    ctx.fillStyle = atmGrd;
    ctx.beginPath();
    ctx.arc(cx, cy, atmPx, 0, Math.PI * 2);
    ctx.fill();
  }

  // Min LOS orbit
  if (minOrbitPx > bodyPx) {
    drawOrbit(ctx, cx, cy, minOrbitPx, minOrbitPx, 0,
      losOK ? 'rgba(255,100,100,0.3)' : 'rgba(255,100,100,0.7)', true);
    drawLabel(ctx, cx + minOrbitPx + 4, cy, 'min LOS', 'rgba(255,120,120,0.8)', 9);
  }

  // Target orbit
  drawOrbit(ctx, cx, cy, orbitPx, orbitPx, 0, '#334466');

  // Draw body
  drawBody(ctx, cx, cy, bodyPx, body.color, body.color);

  // Draw satellites and connection lines
  const satPositions = [];
  for (let i = 0; i < n; i++) {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
    const sx = cx + Math.cos(angle) * orbitPx;
    const sy = cy + Math.sin(angle) * orbitPx;
    satPositions.push({ x: sx, y: sy });
  }

  // LOS lines between adjacent sats
  for (let i = 0; i < n; i++) {
    const a = satPositions[i];
    const b = satPositions[(i + 1) % n];
    ctx.strokeStyle = losOK ? 'rgba(0,255,136,0.35)' : 'rgba(255,68,68,0.35)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 5]);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  satPositions.forEach((p, i) => {
    drawSatellite(ctx, p.x, p.y, losOK ? '#00d4ff' : '#ff8844');
  });

  // Labels
  drawLabel(ctx, 8, 20, `${body.name} — ${n} satellites @ ${(alt/1000).toFixed(0)} km`, '#7a9fc0', 11, 'left');
  drawLabel(ctx, 8, H - 10, `Orbit radius: ${(r_orbit/1000).toFixed(0)} km`, '#446680', 10, 'left');
}
