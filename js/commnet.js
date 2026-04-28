// CommNet Calculator

function initCommNet() {
  const vesselSelect  = document.getElementById('cn-vessel-ant');
  const relaySelect   = document.getElementById('cn-relay-ant');
  const dsnSelect     = document.getElementById('cn-dsn');

  Object.keys(ANTENNAS).forEach(name => {
    [vesselSelect, relaySelect].forEach(sel => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      sel.appendChild(opt);
    });
  });
  vesselSelect.value  = 'Communotron 88-88';
  relaySelect.value   = 'RA-15 Relay';

  Object.keys(DSN_LEVELS).forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    dsnSelect.appendChild(opt);
  });
  dsnSelect.value = 'Level 3 (250T)';

  document.querySelectorAll('#tab-commnet input, #tab-commnet select').forEach(el => {
    el.addEventListener('input', calcCommNet);
  });
  // Show/hide custom power fields
  ['cn-vessel-ant','cn-relay-ant'].forEach(id => {
    document.getElementById(id).addEventListener('change', e => {
      const customId = id === 'cn-vessel-ant' ? 'cn-vessel-custom' : 'cn-relay-custom';
      document.getElementById(customId).style.display = e.target.value === 'Custom' ? 'block' : 'none';
      calcCommNet();
    });
  });

  calcCommNet();
}

function getAntennaPower(selectId, customId) {
  const name = document.getElementById(selectId).value;
  if (name === 'Custom') {
    return parseFloat(document.getElementById(customId).value) || 0;
  }
  return ANTENNAS[name].power;
}

function calcCommNet() {
  const vesselPower = getAntennaPower('cn-vessel-ant', 'cn-vessel-custom-val');
  const relayPower  = getAntennaPower('cn-relay-ant', 'cn-relay-custom-val');
  const dsnKey      = document.getElementById('cn-dsn').value;
  const dsnPower    = DSN_LEVELS[dsnKey];
  const distKm      = parseFloat(document.getElementById('cn-distance').value) * 1e6; // input in Mm → m
  const numRelays   = parseInt(document.getElementById('cn-num-relays').value) || 0;

  if (!vesselPower || !dsnPower) return;

  // Direct link range (vessel to DSN)
  const directRange = commnetRange(vesselPower, dsnPower);

  // Per-hop ranges
  const vesselToRelayRange = commnetRange(vesselPower, relayPower);
  const relayToDsnRange    = commnetRange(relayPower, dsnPower);
  const relayRelayRange    = commnetRange(relayPower, relayPower);

  // Chain max reach: sum of each hop type at their individual max ranges
  // Hops: DSN→R1 (relayToDsnRange), R1↔R2↔…↔R(N-1) ((N-1)×relayRelayRange), RN→Vessel (vesselToRelayRange)
  let chainRange = 0;
  if (numRelays === 1) {
    chainRange = relayToDsnRange + vesselToRelayRange;
  } else if (numRelays > 1) {
    chainRange = relayToDsnRange + (numRelays - 1) * relayRelayRange + vesselToRelayRange;
  }

  // Signal at given distance
  const directSignal = distKm > 0 ? signalStrength(distKm, directRange) : -1;

  // Relay chain signal: assume equidistant hops, weakest hop determines signal
  let chainSignal = -1;
  if (numRelays > 0 && distKm > 0) {
    const hopDist = distKm / (numRelays + 1);
    const hopSignals = [
      signalStrength(hopDist, relayToDsnRange),
      ...Array(Math.max(0, numRelays - 1)).fill(0).map(() => signalStrength(hopDist, relayRelayRange)),
      signalStrength(hopDist, vesselToRelayRange)
    ];
    chainSignal = Math.min(...hopSignals);
  }

  function signalBar(s) {
    const pct = (s * 100).toFixed(1);
    const col = s > 0.75 ? 'var(--green)' : s > 0.4 ? 'var(--amber)' : s > 0 ? '#ff8844' : 'var(--red)';
    const glow = s > 0.75 ? 'var(--green-glow)' : s > 0.4 ? 'var(--amber-glow)' : 'var(--red-glow)';
    return `<div class="signal-bar-wrap">
      <div class="signal-bar-track">
        <div class="signal-bar" style="width:${pct}%;background:${col};box-shadow:0 0 6px ${glow}"></div>
      </div>
      <span class="signal-pct" style="color:${col};text-shadow:0 0 8px ${glow}">${pct}%</span>
    </div>`;
  }

  document.getElementById('cn-results').innerHTML = `
    <div class="panel-header">
      <span class="panel-header-text">CommNet Analysis</span>
      <span class="panel-header-led"></span>
    </div>
    <div class="panel-body">
    <div class="section-title">Antenna Powers</div>
    <div class="result-grid">
      <div class="result-card">
        <div class="result-label">Vessel Antenna</div>
        <div class="result-value">${formatPower(vesselPower)}</div>
      </div>
      <div class="result-card">
        <div class="result-label">Relay Antenna</div>
        <div class="result-value">${formatPower(relayPower)}</div>
      </div>
      <div class="result-card">
        <div class="result-label">DSN Ground Station</div>
        <div class="result-value">${formatPower(dsnPower)}</div>
      </div>
    </div>
    <div class="section-title" style="margin-top:16px">Range by DSN Level</div>
    <table class="dsn-table">
      <thead><tr>
        <th>DSN Level</th><th>Vessel Direct</th><th>Relay → DSN</th>${numRelays > 0 ? '<th>Chain Total</th>' : ''}
      </tr></thead>
      <tbody>
        ${Object.entries(DSN_LEVELS).map(([name, lvlPow]) => {
          const dr  = commnetRange(vesselPower, lvlPow);
          const rds = commnetRange(relayPower, lvlPow);
          const cr  = numRelays === 1 ? rds + vesselToRelayRange
                    : numRelays > 1  ? rds + (numRelays-1)*relayRelayRange + vesselToRelayRange : 0;
          const sel = name === dsnKey;
          return `<tr class="${sel ? 'dsn-row-sel' : ''}">
            <td>${name}${sel ? ' ◀' : ''}</td>
            <td>${formatDistance(dr)}</td>
            <td>${formatDistance(rds)}</td>
            ${numRelays > 0 ? `<td>${formatDistance(cr)}</td>` : ''}
          </tr>`;
        }).join('')}
      </tbody>
    </table>
    <div class="result-grid" style="margin-top:8px">
      <div class="result-card accent">
        <div class="result-label">Vessel → Relay Range</div>
        <div class="result-value">${formatDistance(vesselToRelayRange)}</div>
      </div>
      ${numRelays > 0 ? `<div class="result-card ok">
        <div class="result-label">Chain Total (${numRelays} relay${numRelays > 1 ? 's' : ''})</div>
        <div class="result-value">${formatDistance(chainRange)}</div>
      </div>` : ''}
    </div>
    ${distKm > 0 ? `
    <div class="section-title" style="margin-top:16px">Signal at ${formatDistance(distKm)}</div>
    <div class="result-grid">
      <div class="result-card${directSignal > 0 ? ' ok' : ' warn'}">
        <div class="result-label">Direct Link (Vessel ↔ DSN)</div>
        ${signalBar(Math.max(0, directSignal))}
        <div class="result-sub">${directSignal > 0 ? 'Connected' : 'Out of range — max ' + formatDistance(directRange)}</div>
      </div>
      ${numRelays > 0 ? `<div class="result-card${chainSignal > 0 ? ' ok' : ' warn'}">
        <div class="result-label">Relay Chain (${numRelays} relay${numRelays > 1 ? 's' : ''}, equidistant)</div>
        ${signalBar(Math.max(0, chainSignal))}
        <div class="result-sub">${chainSignal > 0 ? 'Connected — weakest hop limits signal' : 'Out of range — chain max ' + formatDistance(chainRange)}</div>
      </div>` : ''}
    </div>` : ''}
    <div class="info-box" style="margin-top:16px">
      <b>KSP CommNet:</b> Range = √(P₁ × P₂). Signal strength = (3 − 2V)·V² where V = 1 − d/R (smoothstep).
      Combinability multiplies antenna powers within a vessel.
      Relay antennas can forward signals; probe cores require direct or relay path to KSC.
    </div>
    </div>
  `;

  if (window.updateCommNet3D) {
    updateCommNet3D({ directRange, v2r: vesselToRelayRange, r2d: relayToDsnRange, numRelays, chainRange, dist: distKm });
  }
}

function drawCommNetViz(directRange, v2r, r2d, dist, numRelays, chainRange) {
  const canvas = document.getElementById('cn-canvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  clearCanvas(ctx, canvas);
  drawStars(ctx, canvas, 60, 333);

  const margin = 40;
  const lineY  = H / 2;
  const kscX   = margin;
  const vesX   = W - margin;

  // Draw KSC icon
  ctx.fillStyle = '#00ff88';
  ctx.font = '20px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('⊕', kscX, lineY + 7);
  drawLabel(ctx, kscX, lineY + 24, 'KSC', '#00ff88', 10, 'center');

  // Draw vessel icon
  ctx.fillStyle = '#00d4ff';
  ctx.fillText('🛸', vesX, lineY + 7);
  drawLabel(ctx, vesX, lineY + 24, 'Vessel', '#00d4ff', 10, 'center');

  // Max range for scale
  const maxRange = Math.max(directRange, chainRange || directRange, dist || directRange);
  const scaleRange = (W - margin * 2 - 30) / maxRange;

  // Direct range arc
  const dRangePx = Math.min(directRange * scaleRange, W - margin * 2 - 30);
  ctx.strokeStyle = '#00ff8855';
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 6]);
  ctx.beginPath();
  ctx.arc(kscX, lineY, dRangePx, -Math.PI / 3, Math.PI / 3);
  ctx.stroke();
  ctx.setLineDash([]);

  // Connection line
  const inRange = dist > 0 && dist <= directRange;
  ctx.strokeStyle = inRange ? '#00ff88' : '#334466';
  ctx.lineWidth = inRange ? 2 : 1;
  ctx.setLineDash(inRange ? [] : [6, 6]);
  ctx.beginPath();
  ctx.moveTo(kscX + 14, lineY);
  ctx.lineTo(vesX - 14, lineY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Range label
  drawLabel(ctx, (kscX + vesX) / 2, lineY - 14, `Direct range: ${formatDistance(directRange)}`, '#446680', 10, 'center');

  // Relay positions
  if (numRelays > 0 && chainRange > 0) {
    for (let i = 1; i <= numRelays; i++) {
      const rx = kscX + (vesX - kscX) * (i / (numRelays + 1));
      drawSatellite(ctx, rx, lineY - 20, '#ffaa00', 5);
      drawLabel(ctx, rx, lineY - 36, `R${i}`, '#ffaa00', 9, 'center');
    }
  }

  // Distance marker
  if (dist > 0) {
    const distPx = Math.min(dist * scaleRange, W - margin * 2 - 30);
    ctx.strokeStyle = '#ff8844';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    ctx.moveTo(kscX + distPx, lineY - 50);
    ctx.lineTo(kscX + distPx, lineY + 30);
    ctx.stroke();
    ctx.setLineDash([]);
    drawLabel(ctx, kscX + distPx, lineY - 56, formatDistance(dist), '#ff8844', 9, 'center');
  }
}
