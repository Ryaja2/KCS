// Mission Delta-V Planner

function initDeltaV() {
  const destSel = document.getElementById('dv-dest');
  populateBodySelect(destSel, (key, b) => key !== 'kerbol', 'mun');

  document.querySelectorAll('#tab-deltav input, #tab-deltav select').forEach(el => {
    el.addEventListener('input', () => { syncAerobrakeVisibility(); calcMissionDv(); });
    el.addEventListener('change', () => { syncAerobrakeVisibility(); calcMissionDv(); });
  });

  syncAerobrakeVisibility();
  calcMissionDv();
}

function syncAerobrakeVisibility() {
  const destKey = document.getElementById('dv-dest').value;
  const dest = BODIES[destKey];
  const hasAtm = !!(dest && dest.atmosphere);
  const mission = document.getElementById('dv-mission').value;

  document.getElementById('dv-aerobrake-dest-row').style.display = hasAtm ? '' : 'none';

  const showLand = mission === 'land' || mission === 'land_return';
  document.getElementById('dv-dest-orb-row').style.display = mission === 'flyby' ? 'none' : '';
}

function phaseColor(type) {
  return { launch: '#ff8844', transfer: '#00d4ff', capture: '#aa66ff', land: '#ffb300', ascent: '#ff9944', free: '#2aff6f' }[type] || '#7a9fc0';
}

function calcMissionDv() {
  const destKey       = document.getElementById('dv-dest').value;
  const missionType   = document.getElementById('dv-mission').value;
  const lkoAlt        = (parseFloat(document.getElementById('dv-lko-alt').value) || 80) * 1000;
  const destOrbAlt    = (parseFloat(document.getElementById('dv-dest-orb').value) || 30) * 1000;
  const aerobrakeD    = document.getElementById('dv-aerobrake-dest').checked && !!(BODIES[destKey]?.atmosphere);
  const aerobrakeK    = document.getElementById('dv-aerobrake-kerbin').checked;
  const inclLaunch    = document.getElementById('dv-include-launch').checked;

  const dest   = BODIES[destKey];
  const kerbin = BODIES.kerbin;
  if (!dest) return;

  const phases = [];
  const r_lko      = kerbin.radius + lkoAlt;
  const r_dest_orb = dest.radius + destOrbAlt;

  // ── LAUNCH ─────────────────────────────────────────────
  if (inclLaunch) {
    const v_lko = circularVelocity(kerbin.GM, r_lko);
    phases.push({
      label: 'Launch to LKO',
      type: 'launch',
      dv: v_lko + 900,   // +900 m/s for gravity & drag losses (Kerbin)
      note: `Kerbin surface → ${(lkoAlt/1000).toFixed(0)} km orbit`
    });
  }

  // ── TRANSFER & CAPTURE ─────────────────────────────────

  let transferDv = 0, captureActual = 0;

  if (dest.parent === 'kerbin') {
    // ─ Kerbin moon (Mun, Minmus) ─
    const r_moon = dest.SMA;
    const hoh    = hohmannDv(kerbin.GM, r_lko, r_moon);

    const v_lko_c  = circularVelocity(kerbin.GM, r_lko);
    const v_lko_t  = velocityAtRadius(kerbin.GM, r_lko, hoh.a_transfer);
    transferDv = v_lko_t - v_lko_c;

    const v_at_moon  = velocityAtRadius(kerbin.GM, r_moon, hoh.a_transfer);
    const v_moon_orb = circularVelocity(kerbin.GM, r_moon);
    const v_inf_moon = Math.abs(v_at_moon - v_moon_orb);
    const captureRaw = ejectionDv(dest.GM, r_dest_orb, v_inf_moon);

    phases.push({
      label: `Transfer → ${dest.name}`,
      type: 'transfer', dv: transferDv,
      note: `${formatKSPTime(hoh.transferTime)} flight time`
    });

    if (missionType !== 'flyby') {
      captureActual = aerobrakeD ? Math.max(40, captureRaw * 0.05) : captureRaw;
      phases.push({
        label: `${dest.name} Orbit Insertion${aerobrakeD ? ' ⊕' : ''}`,
        type: 'capture', dv: captureActual,
        note: `${(destOrbAlt/1000).toFixed(0)} km orbit${aerobrakeD ? ' — aerobraked' : ''}`
      });
    }

  } else if (dest.parent === 'kerbol') {
    // ─ Interplanetary ─
    const GM_sun = BODIES.kerbol.GM;
    const hoh    = hohmannDv(GM_sun, kerbin.SMA, dest.SMA);

    const v_inf_dep = Math.abs(hoh.dv1);
    transferDv      = ejectionDv(kerbin.GM, r_lko, v_inf_dep);

    const v_inf_arr = Math.abs(hoh.dv2);
    const captureRaw = ejectionDv(dest.GM, r_dest_orb, v_inf_arr);

    phases.push({
      label: `Ejection Burn → ${dest.name}`,
      type: 'transfer', dv: transferDv,
      note: `${formatKSPTime(hoh.transferTime)} transfer, phase ${phaseAngle(GM_sun, kerbin.SMA, dest.SMA).toFixed(1)}°`
    });

    if (missionType !== 'flyby') {
      captureActual = aerobrakeD ? Math.max(40, captureRaw * 0.05) : captureRaw;
      phases.push({
        label: `${dest.name} Orbit Insertion${aerobrakeD ? ' ⊕' : ''}`,
        type: 'capture', dv: captureActual,
        note: `${(destOrbAlt/1000).toFixed(0)} km orbit`
      });
    }

  } else if (dest.parent && BODIES[dest.parent]) {
    // ─ Moon of another planet (Ike, Laythe, Vall, Tylo, Bop, Pol, Gilly) ─
    const parent = BODIES[dest.parent];
    const GM_sun = BODIES.kerbol.GM;
    const hoh    = hohmannDv(GM_sun, kerbin.SMA, parent.SMA);

    const v_inf_dep = Math.abs(hoh.dv1);
    transferDv      = ejectionDv(kerbin.GM, r_lko, v_inf_dep);

    const v_inf_par     = Math.abs(hoh.dv2);
    const r_par_approach = dest.SMA * 1.2;
    const capParentRaw  = ejectionDv(parent.GM, r_par_approach, v_inf_par);
    const capParent     = (parent.atmosphere && aerobrakeD)
      ? Math.max(80, capParentRaw * 0.08) : capParentRaw;

    const moonHoh    = hohmannDv(parent.GM, r_par_approach, dest.SMA);
    const v_inf_moon = Math.abs(moonHoh.dv2);
    const capMoon    = ejectionDv(dest.GM, r_dest_orb, v_inf_moon);
    captureActual    = capParent + Math.abs(moonHoh.dv1) + capMoon;

    phases.push({
      label: `Ejection → ${parent.name}`,
      type: 'transfer', dv: transferDv,
      note: `${formatKSPTime(hoh.transferTime)} transfer`
    });

    if (missionType !== 'flyby') {
      phases.push({
        label: `${parent.name} Capture${parent.atmosphere && aerobrakeD ? ' ⊕' : ''}`,
        type: 'capture', dv: capParent, note: ''
      });
      phases.push({
        label: `→ ${dest.name} Orbit`,
        type: 'capture', dv: Math.abs(moonHoh.dv1) + capMoon,
        note: `${(destOrbAlt/1000).toFixed(0)} km orbit`
      });
    }
  }

  // ── LANDING ────────────────────────────────────────────
  const doLand = missionType === 'land' || missionType === 'land_return';
  if (doLand) {
    const v_surf = circularVelocity(dest.GM, dest.radius);
    let landDv;
    if (dest.atmosphere && aerobrakeD) {
      landDv = dest.atmosphere.pressure > 150000 ? 120 : 300;
    } else {
      landDv = v_surf * 1.1;
    }
    phases.push({
      label: `Land — ${dest.name}`,
      type: 'land', dv: landDv,
      note: dest.atmosphere && aerobrakeD ? 'Aerobrake + final retro burn' : 'Powered descent'
    });
  }

  // ── ASCENT ─────────────────────────────────────────────
  const doReturn = missionType === 'land_return';
  if (doReturn && doLand) {
    const v_orb = circularVelocity(dest.GM, r_dest_orb);
    let gravDrag = 150, dragLoss = 0;
    if (dest.atmosphere) {
      dragLoss = dest.atmosphere.pressure > 300000 ? 900 : dest.atmosphere.pressure > 50000 ? 350 : 150;
      gravDrag = 250;
    }
    phases.push({
      label: `Ascent — ${dest.name}`,
      type: 'ascent', dv: v_orb + gravDrag + dragLoss,
      note: `To ${(destOrbAlt/1000).toFixed(0)} km orbit`
    });
  }

  // ── RETURN ─────────────────────────────────────────────
  if (missionType === 'orbit' || missionType === 'land_return') {
    // Return departure ≈ same as capture (time-reversal symmetry)
    phases.push({
      label: `Return Burn → Kerbin`,
      type: 'transfer', dv: captureActual,
      note: `${dest.name} departure`
    });

    if (aerobrakeK) {
      phases.push({ label: 'Kerbin Reentry', type: 'free', dv: 0, note: 'Aerobraking — free' });
    } else {
      const v_inf_return = transferDv * 0.85;
      const kCap = ejectionDv(kerbin.GM, r_lko, v_inf_return);
      phases.push({ label: 'Kerbin Capture', type: 'capture', dv: kCap, note: 'Powered — into LKO' });
    }
  }

  // ── RENDER ─────────────────────────────────────────────
  const total    = phases.reduce((s, p) => s + p.dv, 0);
  const maxDv    = Math.max(...phases.map(p => p.dv));
  const resultsEl = document.getElementById('dv-results');

  const rowsHTML = phases.map(p => {
    const barW = maxDv > 0 ? (p.dv / maxDv * 100).toFixed(1) : 0;
    const col   = phaseColor(p.type);
    const isFree = p.type === 'free';
    return `
      <div class="phase-row phase-${p.type}">
        <div>
          <div class="phase-name">${p.label}</div>
          ${p.note ? `<div style="font-size:9px;color:var(--tx-dim);font-family:var(--f-body);margin-top:2px">${p.note}</div>` : ''}
        </div>
        <div class="phase-bar-wrap">
          <div class="phase-bar" style="width:${barW}%;background:${col};box-shadow:0 0 6px ${col}88"></div>
        </div>
        <div class="phase-dv ${isFree ? 'free' : ''}">${isFree ? 'FREE' : p.dv.toFixed(0) + ' m/s'}</div>
      </div>
    `;
  }).join('');

  // ΔV budget rating
  let rating = '';
  if (total < 4000)  rating = 'Minimal mission';
  else if (total < 7000)  rating = 'Moderate mission';
  else if (total < 12000) rating = 'Heavy mission';
  else rating = 'Extreme mission — plan carefully';

  resultsEl.innerHTML = `
    <div class="panel-header">
      <span class="panel-header-text">Mission ΔV Budget — ${dest.name}</span>
      <span class="panel-header-led"></span>
    </div>
    <div class="panel-body">
      <div class="phase-flow">${rowsHTML}</div>
      <div class="phase-total">
        <div>
          <div class="phase-total-label">TOTAL MISSION ΔV</div>
          <div style="font-family:var(--f-body);font-size:10px;color:var(--tx-dim);margin-top:3px">${rating}</div>
        </div>
        <div class="phase-total-val">${total.toFixed(0)} m/s</div>
      </div>
      ${!inclLaunch ? `<div class="info-box">Launch not included. Add ~${(circularVelocity(kerbin.GM, kerbin.radius + lkoAlt) + 900).toFixed(0)} m/s for Kerbin launch.</div>` : ''}
    </div>
  `;

  if (window.updateMission3D) {
    updateMission3D({ destKey, lkoAlt });
  }
}

function drawDvViz(phases, total) {
  const canvas = document.getElementById('dv-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  clearCanvas(ctx, canvas);
  drawStars(ctx, canvas, 50, 97);

  if (!phases.length) return;

  const margin = { l: 10, r: 10, t: 20, b: 14 };
  const barH   = Math.min(26, (H - margin.t - margin.b - (phases.length - 1) * 4) / phases.length);
  const trackW = W - margin.l - margin.r - 120;
  const maxDv  = Math.max(...phases.map(p => p.dv), 1);

  phases.forEach((p, i) => {
    const y   = margin.t + i * (barH + 4);
    const bw  = (p.dv / maxDv) * trackW;
    const col = phaseColor(p.type);

    // Track bg
    ctx.fillStyle = 'rgba(10,14,20,0.8)';
    ctx.fillRect(margin.l, y, trackW, barH);

    // Bar fill
    if (bw > 0) {
      const grd = ctx.createLinearGradient(margin.l, y, margin.l + bw, y);
      grd.addColorStop(0, col + 'cc');
      grd.addColorStop(1, col + '55');
      ctx.fillStyle = grd;
      ctx.fillRect(margin.l, y, bw, barH);

      // Bar glow
      ctx.fillStyle = col + '15';
      ctx.fillRect(margin.l, y, trackW, barH);
    }

    // Track border
    ctx.strokeStyle = 'rgba(30,40,60,0.8)';
    ctx.lineWidth = 1;
    ctx.strokeRect(margin.l, y, trackW, barH);

    // Label
    ctx.fillStyle = '#4a6080';
    ctx.font = '9px Orbitron, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(p.label.toUpperCase().substring(0, 22), margin.l + trackW + 8, y + barH * 0.67);

    // ΔV value
    ctx.fillStyle = p.type === 'free' ? '#2aff6f' : col;
    ctx.font = `${barH * 0.75}px VT323, monospace`;
    ctx.textAlign = 'right';
    ctx.fillText(p.type === 'free' ? 'FREE' : p.dv.toFixed(0), W - margin.r, y + barH * 0.82);
  });

  // Total
  const ty = margin.t + phases.length * (barH + 4) + 4;
  ctx.fillStyle = 'rgba(0,212,255,0.08)';
  ctx.fillRect(margin.l, ty, W - margin.l - margin.r, barH);
  ctx.strokeStyle = 'rgba(0,212,255,0.25)';
  ctx.strokeRect(margin.l, ty, W - margin.l - margin.r, barH);
  ctx.fillStyle = '#00d4ff';
  ctx.font = `${barH * 0.8}px VT323, monospace`;
  ctx.textAlign = 'left';
  ctx.fillText('TOTAL', margin.l + 6, ty + barH * 0.82);
  ctx.textAlign = 'right';
  ctx.fillText(`${total.toFixed(0)} m/s`, W - margin.r, ty + barH * 0.82);
}
