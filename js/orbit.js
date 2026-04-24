// Orbit Calculator

function initOrbit() {
  const bodySelect = document.getElementById('orb-body');
  Object.entries(BODIES).forEach(([key, b]) => {
    if (b.type !== 'star') {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = b.name;
      if (key === 'kerbin') opt.selected = true;
      bodySelect.appendChild(opt);
    }
  });
  document.querySelectorAll('#tab-orbit input, #tab-orbit select').forEach(el => {
    el.addEventListener('input', calcOrbit);
  });
  calcOrbit();
}

function calcOrbit() {
  const bodyKey = document.getElementById('orb-body').value;
  const peAlt   = parseFloat(document.getElementById('orb-pe').value) * 1000;
  const apAlt   = parseFloat(document.getElementById('orb-ap').value) * 1000;
  const body    = BODIES[bodyKey];

  if (!body || isNaN(peAlt) || isNaN(apAlt)) return;

  const pe = body.radius + peAlt;
  const ap = body.radius + apAlt;

  if (ap < pe) {
    document.getElementById('orb-results').innerHTML = '<div class="warn-text">Apoapsis must be ≥ periapsis.</div>';
    return;
  }

  const sma = (pe + ap) / 2;
  const ecc = (ap - pe) / (ap + pe);
  const T   = orbitalPeriod(body.GM, sma);
  const v_pe = velocityAtRadius(body.GM, pe, sma);
  const v_ap = velocityAtRadius(body.GM, ap, sma);
  const e_spec = -body.GM / (2 * sma); // specific orbital energy
  const inclination = 0; // user not setting inclination here

  // Circular orbit at same SMA for comparison
  const v_circ = circularVelocity(body.GM, sma);

  // SOI check
  const soiOK = ap <= body.SOI;

  document.getElementById('orb-results').innerHTML = `
    <div class="result-grid">
      <div class="result-card${soiOK ? '' : ' warn'}">
        <div class="result-label">SOI Check</div>
        <div class="result-value" style="color:${soiOK ? '#00ff88' : '#ff4444'}">
          ${soiOK ? '✓ Within SOI' : '✗ Exceeds SOI ('+formatDistance(body.SOI)+')'}
        </div>
      </div>
      <div class="result-card accent">
        <div class="result-label">Semi-Major Axis</div>
        <div class="result-value">${formatDistance(sma)}</div>
      </div>
      <div class="result-card accent">
        <div class="result-label">Eccentricity</div>
        <div class="result-value">${ecc.toFixed(6)}</div>
        <div class="result-sub">${ecc < 0.001 ? 'Nearly circular' : ecc < 0.1 ? 'Low eccentricity' : ecc < 0.9 ? 'Elliptical' : 'Highly elliptical'}</div>
      </div>
      <div class="result-card ok">
        <div class="result-label">Orbital Period</div>
        <div class="result-value">${formatKSPTime(T)}</div>
      </div>
      <div class="result-card">
        <div class="result-label">Velocity at Pe</div>
        <div class="result-value">${v_pe.toFixed(2)} m/s</div>
        <div class="result-sub">Pe alt: ${(peAlt/1000).toFixed(2)} km</div>
      </div>
      <div class="result-card">
        <div class="result-label">Velocity at Ap</div>
        <div class="result-value">${v_ap.toFixed(2)} m/s</div>
        <div class="result-sub">Ap alt: ${(apAlt/1000).toFixed(2)} km</div>
      </div>
      <div class="result-card">
        <div class="result-label">Circular Velocity (SMA)</div>
        <div class="result-value">${v_circ.toFixed(2)} m/s</div>
      </div>
      <div class="result-card">
        <div class="result-label">Specific Orbital Energy</div>
        <div class="result-value">${(e_spec/1000).toFixed(2)} kJ/kg</div>
      </div>
    </div>
    <div class="section-title" style="margin-top:16px">Body Reference</div>
    <div class="result-grid">
      <div class="result-card">
        <div class="result-label">Surface Gravity</div>
        <div class="result-value">${(body.GM / body.radius / body.radius).toFixed(3)} m/s²</div>
      </div>
      <div class="result-card">
        <div class="result-label">Escape Velocity</div>
        <div class="result-value">${Math.sqrt(2 * body.GM / body.radius).toFixed(1)} m/s</div>
        <div class="result-sub">from surface</div>
      </div>
      ${body.atmosphere ? `
      <div class="result-card">
        <div class="result-label">Atmosphere Top</div>
        <div class="result-value">${(body.atmosphere.height/1000).toFixed(0)} km</div>
      </div>` : ''}
      <div class="result-card">
        <div class="result-label">SOI Radius</div>
        <div class="result-value">${body.SOI === Infinity ? '∞' : formatDistance(body.SOI)}</div>
      </div>
    </div>
  `;

  drawOrbitViz(bodyKey, peAlt, apAlt);
}

function drawOrbitViz(bodyKey, peAlt, apAlt) {
  const canvas = document.getElementById('orb-canvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const cx = W / 2, cy = H / 2;

  clearCanvas(ctx, canvas);
  drawStars(ctx, canvas, 80, 233);

  const body = BODIES[bodyKey];
  const pe = body.radius + peAlt;
  const ap = body.radius + apAlt;
  const sma = (pe + ap) / 2;

  const padding = 40;
  const scale = (Math.min(W, H) / 2 - padding) / Math.min(ap, body.SOI !== Infinity ? body.SOI * 0.8 : ap * 1.1);

  const pePx = pe * scale;
  const apPx = ap * scale;
  const aPx  = sma * scale;
  const bPx  = Math.sqrt(pePx * apPx); // b = sqrt(pe * ap)
  const cPx  = aPx - pePx; // center to focus
  const bodyPx = Math.max(body.radius * scale, 6);

  // Atmosphere
  if (body.atmosphere) {
    const atmPx = (body.radius + body.atmosphere.height) * scale;
    const atmGrd = ctx.createRadialGradient(cx + cPx, cy, bodyPx * 0.9, cx + cPx, cy, atmPx);
    atmGrd.addColorStop(0, hexToRGBA(body.color, 0.2));
    atmGrd.addColorStop(1, 'transparent');
    ctx.fillStyle = atmGrd;
    ctx.beginPath();
    ctx.arc(cx + cPx, cy, atmPx, 0, Math.PI * 2);
    ctx.fill();
  }

  // Body at left focus
  drawBody(ctx, cx + cPx, cy, bodyPx, body.color, body.color);

  // SOI ring
  if (body.SOI !== Infinity) {
    const soiPx = body.SOI * scale;
    if (soiPx < Math.min(W, H)) {
      drawOrbit(ctx, cx + cPx, cy, soiPx, soiPx, 0, 'rgba(100,100,200,0.3)', true);
      drawLabel(ctx, cx + cPx + soiPx + 4, cy, 'SOI', 'rgba(100,100,200,0.6)', 9, 'left');
    }
  }

  // Orbit ellipse — center of ellipse is offset from focus by c
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = '#00d4ff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(0, 0, aPx, bPx, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Pe point (rightmost from body's perspective = periapsis)
  const pePtX = cx - pePx;
  const apPtX = cx + apPx;

  // Pe dot
  ctx.fillStyle = '#ff8844';
  ctx.beginPath();
  ctx.arc(pePtX, cy, 4, 0, Math.PI * 2);
  ctx.fill();
  drawLabel(ctx, pePtX - 4, cy + 14, 'Pe', '#ff8844', 10, 'center');

  // Ap dot
  ctx.fillStyle = '#00ff88';
  ctx.beginPath();
  ctx.arc(apPtX, cy, 4, 0, Math.PI * 2);
  ctx.fill();
  drawLabel(ctx, apPtX + 4, cy + 14, 'Ap', '#00ff88', 10, 'center');

  drawLabel(ctx, 8, 20, `${body.name} orbit — Pe ${(peAlt/1000).toFixed(0)} km / Ap ${(apAlt/1000).toFixed(0)} km`, '#7a9fc0', 11, 'left');
}
