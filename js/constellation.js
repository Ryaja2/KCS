// Relay Constellation Calculator

let _syncingConst = false;

const KERBIN_DAY = 21600; // seconds per Kerbin day (6 hours)

function periodToFields(T) {
  const d = Math.floor(T / KERBIN_DAY);
  const rem1 = T % KERBIN_DAY;
  const h = Math.floor(rem1 / 3600);
  const rem2 = rem1 % 3600;
  const m = Math.floor(rem2 / 60);
  const s = Math.round(rem2 % 60);
  document.getElementById('con-period-d').value = d;
  document.getElementById('con-period-h').value = h;
  document.getElementById('con-period-m').value = m;
  document.getElementById('con-period-s').value = s;
}

function fieldsToSeconds() {
  const d = parseFloat(document.getElementById('con-period-d').value) || 0;
  const h = parseFloat(document.getElementById('con-period-h').value) || 0;
  const m = parseFloat(document.getElementById('con-period-m').value) || 0;
  const s = parseFloat(document.getElementById('con-period-s').value) || 0;
  return d * KERBIN_DAY + h * 3600 + m * 60 + s;
}

function syncConstellationAltPeriod(changedId) {
  if (_syncingConst) return;
  _syncingConst = true;
  const body = BODIES[document.getElementById('con-body').value];
  if (body) {
    if (changedId === 'period') {
      const T = fieldsToSeconds();
      if (T > 0) {
        const a = Math.cbrt(body.GM * T * T / (4 * Math.PI * Math.PI));
        const altKm = (a - body.radius) / 1000;
        if (altKm > 0) document.getElementById('con-altitude').value = altKm.toFixed(2);
      }
    } else {
      const altKm = parseFloat(document.getElementById('con-altitude').value);
      if (!isNaN(altKm) && altKm > 0) {
        periodToFields(orbitalPeriod(body.GM, body.radius + altKm * 1000));
      }
    }
  }
  _syncingConst = false;
}

function initConstellation() {
  const bodySelect = document.getElementById('con-body');

  populateBodySelect(bodySelect, (key, b) => b.type === 'planet' || b.type === 'moon', 'kerbin');

  // Relay antenna dropdown (relay-capable antennas + Custom)
  const relayAntSelect = document.getElementById('con-relay-ant');
  Object.entries(ANTENNAS).forEach(([name, ant]) => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = ant.relay ? `★ ${name}` : name;
    if (name === 'RA-15 Relay') opt.selected = true;
    relayAntSelect.appendChild(opt);
  });

  // DSN level dropdown
  const conDsnSelect = document.getElementById('con-dsn');
  Object.keys(DSN_LEVELS).forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    conDsnSelect.appendChild(opt);
  });
  conDsnSelect.value = 'Level 3 (250T)';

  bodySelect.addEventListener('input', () => { syncConstellationAltPeriod('alt'); calcConstellation(); });
  document.getElementById('con-resonant-type').addEventListener('input', calcConstellation);
  document.getElementById('con-numsats').addEventListener('input', calcConstellation);
  document.getElementById('con-altitude').addEventListener('input', () => { syncConstellationAltPeriod('alt'); calcConstellation(); });
  ['con-period-d','con-period-h','con-period-m','con-period-s'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => { syncConstellationAltPeriod('period'); calcConstellation(); });
  });
  relayAntSelect.addEventListener('input', calcConstellation);
  conDsnSelect.addEventListener('input', calcConstellation);

  syncConstellationAltPeriod('alt');
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

  const resType = document.getElementById('con-resonant-type').value; // 'inner' | 'outer'

  // Resonant deployment orbit
  // Inner: Ap = r_target, Pe below — carrier slows, released sat lags behind
  //   a = r_target × ((N-1)/N)^(2/3),  Pe = 2a − r_target
  // Outer: Pe = r_target, Ap above — carrier speeds up, released sat gets ahead
  //   a = r_target × (N/(N-1))^(2/3),  Ap = 2a − r_target
  let a_res, ap_res, pe_res, ap_res_alt, pe_res_alt;
  if (resType === 'outer') {
    a_res       = r_target * Math.pow(n / (n - 1), 2/3);
    pe_res      = r_target;
    ap_res      = 2 * a_res - pe_res;
    pe_res_alt  = altKm;
    ap_res_alt  = (ap_res - body.radius) / 1000;
  } else {
    a_res       = resonantOrbitSMA(r_target, n);   // r_target × ((N-1)/N)^(2/3)
    ap_res      = r_target;
    pe_res      = 2 * a_res - ap_res;
    ap_res_alt  = altKm;
    pe_res_alt  = (pe_res - body.radius) / 1000;
  }

  // Resonant period
  const T_res = orbitalPeriod(body.GM, a_res);

  // ΔV to enter resonant orbit from circular at r_target
  // Inner: burn retrograde at Ap (=r_target) to drop into lower Pe
  // Outer: burn prograde  at Pe (=r_target) to raise into higher Ap
  // Both cases: burn is always at r_target, formula is identical
  const res_entry_dv = Math.abs(v_target - velocityAtRadius(body.GM, r_target, a_res));

  // Satellite spacing
  const spacing_deg = 360 / n;
  const spacing_km  = (2 * Math.PI * r_target / n) / 1000;

  const losColor = losOK ? 'ok' : 'warn';

  // CommNet analysis
  const relayAntName = document.getElementById('con-relay-ant').value;
  const relayAnt     = ANTENNAS[relayAntName];
  const relayPower   = relayAnt && relayAnt.power ? relayAnt.power : 0;
  const dsnKey       = document.getElementById('con-dsn').value;
  const dsnPower     = DSN_LEVELS[dsnKey];

  // Inter-satellite chord distance (straight-line between adjacent sats)
  const chord = 2 * r_target * Math.sin(Math.PI / n);
  // Relay-relay range with selected antenna: commnetRange(P,P) = P
  const interSatRange = relayPower ? commnetRange(relayPower, relayPower) : 0;
  const interSatOK    = interSatRange >= chord;

  // KSC-to-orbit max slant range: when sat is on horizon from ground station
  const slantRange    = Math.sqrt(r_target * r_target - body.radius * body.radius);
  const groundRange   = relayPower && dsnPower ? commnetRange(relayPower, dsnPower) : 0;
  const groundOK      = groundRange >= slantRange;

  // Min power needed for each link
  const minInterSatPower = chord;
  const minGroundPower   = dsnPower ? (slantRange * slantRange) / dsnPower : 0;

  // Minimum DSN level required for ground coverage with selected relay
  const minDsnEntry = relayPower
    ? Object.entries(DSN_LEVELS).find(([, p]) => commnetRange(relayPower, p) >= slantRange)
    : null;

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

      <div class="section-title" style="margin-top:14px">Resonant Deployment Orbit <span style="color:var(--amber);font-size:9px;letter-spacing:1px">${resType.toUpperCase()}</span></div>
      <div class="result-grid">
        <div class="result-card accent">
          <div class="result-label">Resonant Pe Altitude</div>
          <div class="result-value" style="font-size:22px">${pe_res_alt.toFixed(1)} km</div>
          <div class="result-sub">${resType === 'outer' ? 'equals target altitude' : 'below target — carrier drops here'}</div>
        </div>
        <div class="result-card accent">
          <div class="result-label">Resonant Ap Altitude</div>
          <div class="result-value" style="font-size:22px">${ap_res_alt.toFixed(1)} km</div>
          <div class="result-sub">${resType === 'outer' ? 'above target — carrier rises here' : 'equals target altitude'}</div>
        </div>
        <div class="result-card accent">
          <div class="result-label">Resonant SMA</div>
          <div class="result-value" style="font-size:22px">${(a_res/1000).toFixed(1)} km</div>
        </div>
        <div class="result-card accent">
          <div class="result-label">Resonant Period</div>
          <div class="result-value">${formatKSPTime(T_res)}</div>
          <div class="result-sub">${resType === 'outer' ? `${n}/${n-1} × target` : `${n-1}/${n} × target`}</div>
        </div>
        <div class="result-card ok">
          <div class="result-label">Entry ΔV (per release)</div>
          <div class="result-value">${res_entry_dv.toFixed(1)}</div>
          <div class="result-sub">m/s ${resType === 'outer' ? 'prograde' : 'retrograde'} at ${resType === 'outer' ? 'Pe' : 'Ap'} · reverse to circularize</div>
        </div>
        <div class="result-card">
          <div class="result-label">Total Deployment ΔV</div>
          <div class="result-value">${(res_entry_dv * n).toFixed(1)}</div>
          <div class="result-sub">m/s (${n} sats × entry burn)</div>
        </div>
      </div>

      <div class="info-box">
        ${resType === 'outer'
          ? `<b>Deploy sequence (outer):</b> Circularize at ${altKm.toFixed(0)} km → release sat #1 →
             prograde ${res_entry_dv.toFixed(1)} m/s to enter resonant orbit
             (Pe ${pe_res_alt.toFixed(1)} km / Ap ${ap_res_alt.toFixed(1)} km) →
             after 1 resonant period arrive back at Pe → retrograde ${res_entry_dv.toFixed(1)} m/s to circularize →
             release sat #2 → repeat ${n} times.`
          : `<b>Deploy sequence (inner):</b> Circularize at ${altKm.toFixed(0)} km → release sat #1 →
             retrograde ${res_entry_dv.toFixed(1)} m/s to enter resonant orbit
             (Pe ${pe_res_alt.toFixed(1)} km / Ap ${ap_res_alt.toFixed(1)} km) →
             after 1 resonant period arrive back at Ap → prograde ${res_entry_dv.toFixed(1)} m/s to circularize →
             release sat #2 → repeat ${n} times.`}
      </div>

      <div class="section-title" style="margin-top:14px">CommNet Link Analysis</div>
      <div class="result-grid">
        <div class="result-card">
          <div class="result-label">Inter-Sat Distance</div>
          <div class="result-value">${formatDistance(chord)}</div>
          <div class="result-sub">chord between adjacent sats</div>
        </div>
        <div class="result-card ${interSatOK ? 'ok' : 'warn'}">
          <div class="result-label">Inter-Sat Link</div>
          <div class="result-value" style="font-size:18px">${interSatOK ? 'IN RANGE' : 'OUT OF RANGE'}</div>
          <div class="result-sub">${relayAnt && relayAnt.relay ? '' : '⚠ Not a relay antenna · '}${relayPower ? formatDistance(interSatRange) + ' range' : 'No antenna'} · need ${formatDistance(minInterSatPower)}</div>
        </div>
        <div class="result-card">
          <div class="result-label">KSC Slant Range</div>
          <div class="result-value">${formatDistance(slantRange)}</div>
          <div class="result-sub">max dist to horizon sat</div>
        </div>
        <div class="result-card ${groundOK ? 'ok' : 'warn'}">
          <div class="result-label">Ground ↔ Constellation</div>
          <div class="result-value" style="font-size:18px">${groundOK ? 'COVERED' : 'NEED UPGRADE'}</div>
          <div class="result-sub">${minDsnEntry ? 'Min DSN: ' + minDsnEntry[0] : 'No DSN level sufficient'} · min relay power ${formatPower(minGroundPower)}</div>
        </div>
      </div>
      <table class="dsn-table" style="margin-top:8px">
        <thead><tr><th>DSN Level</th><th>Ground Range</th><th>Signal Strength</th><th>Covers KSC?</th></tr></thead>
        <tbody>
          ${Object.entries(DSN_LEVELS).map(([name, p]) => {
            const gr  = relayPower ? commnetRange(relayPower, p) : 0;
            const ok  = gr >= slantRange;
            const sel = name === dsnKey;
            const V   = gr > 0 ? Math.max(0, Math.min(1, 1 - slantRange / gr)) : 0;
            const pct = (3 - 2 * V) * V * V * 100;
            const barColor = pct > 60 ? 'var(--green)' : pct > 25 ? 'var(--amber)' : 'var(--red)';
            return `<tr class="${sel ? 'dsn-row-sel' : ''}">
              <td>${name}${sel ? ' ◀' : ''}</td>
              <td>${gr ? formatDistance(gr) : '—'}</td>
              <td>
                <div class="sig-bar-wrap">
                  <div class="sig-bar-fill" style="width:${pct.toFixed(1)}%;background:${barColor};box-shadow:0 0 4px ${barColor}"></div>
                </div>
                <span class="sig-bar-pct" style="color:${barColor}">${pct.toFixed(1)}%</span>
              </td>
              <td style="color:${ok ? 'var(--green)' : 'var(--red)'}">${ok ? 'YES' : 'NO'}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
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
