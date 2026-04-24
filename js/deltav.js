// Delta-V Multi-Stage Calculator

let dvStages = [
  { wetMass: 18000, dryMass: 2000, ispVac: 350, ispAtm: 320, thrust: 215000, name: 'Stage 1' },
  { wetMass: 4500,  dryMass: 800,  ispVac: 345, ispAtm: 310, thrust: 50000,  name: 'Stage 2' }
];

function initDeltaV() {
  document.getElementById('dv-add-stage').addEventListener('click', addDvStage);

  const bodySelect = document.getElementById('dv-body');
  Object.entries(BODIES).forEach(([key, b]) => {
    if (b.type === 'planet' || b.type === 'moon') {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = b.name;
      if (key === 'kerbin') opt.selected = true;
      bodySelect.appendChild(opt);
    }
  });
  bodySelect.addEventListener('input', calcDeltaV);

  renderDvStages();
  calcDeltaV();
}

function renderDvStages() {
  const container = document.getElementById('dv-stages');
  container.innerHTML = '';
  dvStages.forEach((stage, i) => {
    const div = document.createElement('div');
    div.className = 'stage-card';
    div.innerHTML = `
      <div class="stage-header">
        <input class="stage-name" value="${stage.name}" data-i="${i}" data-field="name" />
        ${dvStages.length > 1 ? `<button class="btn-icon remove-stage" data-i="${i}">✕</button>` : ''}
      </div>
      <div class="stage-inputs">
        <label>Wet Mass (kg)<input type="number" value="${stage.wetMass}" min="1" data-i="${i}" data-field="wetMass" /></label>
        <label>Dry Mass (kg)<input type="number" value="${stage.dryMass}" min="1" data-i="${i}" data-field="dryMass" /></label>
        <label>Isp Vac (s)<input type="number" value="${stage.ispVac}" min="1" data-i="${i}" data-field="ispVac" /></label>
        <label>Isp Atm (s)<input type="number" value="${stage.ispAtm}" min="1" data-i="${i}" data-field="ispAtm" /></label>
        <label>Thrust (N)<input type="number" value="${stage.thrust}" min="0" data-i="${i}" data-field="thrust" /></label>
      </div>
    `;
    container.appendChild(div);
  });

  container.querySelectorAll('input').forEach(el => {
    el.addEventListener('input', e => {
      const i = parseInt(e.target.dataset.i);
      const field = e.target.dataset.field;
      dvStages[i][field] = field === 'name' ? e.target.value : parseFloat(e.target.value);
      calcDeltaV();
    });
  });
  container.querySelectorAll('.remove-stage').forEach(btn => {
    btn.addEventListener('click', e => {
      dvStages.splice(parseInt(e.target.dataset.i), 1);
      renderDvStages();
      calcDeltaV();
    });
  });
}

function addDvStage() {
  const n = dvStages.length + 1;
  dvStages.push({ wetMass: 2000, dryMass: 400, ispVac: 350, ispAtm: 315, thrust: 50000, name: `Stage ${n}` });
  renderDvStages();
  calcDeltaV();
}

function calcDeltaV() {
  const bodyKey = document.getElementById('dv-body').value;
  const altKm   = parseFloat(document.getElementById('dv-alt').value) || 0;
  const body    = BODIES[bodyKey];
  const g_body  = body.GM / Math.pow(body.radius + altKm * 1000, 2);

  let results = [];
  let totalDvVac = 0, totalDvAtm = 0;
  let totalWetMass = dvStages.reduce((s, st) => s + st.wetMass, 0);
  let stackMass = totalWetMass;

  dvStages.forEach((stage, i) => {
    const dv_vac = rocketDv(stage.ispVac, stackMass, stackMass - (stage.wetMass - stage.dryMass));
    const dv_atm = rocketDv(stage.ispAtm, stackMass, stackMass - (stage.wetMass - stage.dryMass));
    const twr = stage.thrust / (stackMass * g_body);
    results.push({ stage, dv_vac, dv_atm, twr, stackMass });
    totalDvVac += dv_vac;
    totalDvAtm += dv_atm;
    stackMass -= stage.wetMass;
  });

  const resHTML = results.map((r, i) => `
    <div class="result-card">
      <div class="result-label">${r.stage.name}</div>
      <div class="result-value">${r.dv_vac.toFixed(0)} <span style="color:#7a9fc0">m/s vac</span></div>
      <div class="result-value">${r.dv_atm.toFixed(0)} <span style="color:#7a9fc0">m/s atm</span></div>
      <div class="result-sub">TWR: ${r.twr.toFixed(2)} | Stack: ${(r.stackMass/1000).toFixed(2)} t</div>
    </div>
  `).join('');

  document.getElementById('dv-results').innerHTML = `
    <div class="result-grid">
      ${resHTML}
      <div class="result-card ok">
        <div class="result-label">Total ΔV (Vacuum)</div>
        <div class="result-value">${totalDvVac.toFixed(0)} m/s</div>
      </div>
      <div class="result-card">
        <div class="result-label">Total ΔV (Atm)</div>
        <div class="result-value">${totalDvAtm.toFixed(0)} m/s</div>
      </div>
    </div>
  `;

  drawDvViz(results, totalDvVac);
}

function drawDvViz(results, totalDv) {
  const canvas = document.getElementById('dv-canvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  clearCanvas(ctx, canvas);
  drawStars(ctx, canvas, 60, 71);

  if (results.length === 0) return;

  const colors = ['#00d4ff','#00ff88','#ffaa00','#ff6644','#cc66ff','#44ddff'];
  const barH = Math.min(40, (H - 80) / results.length - 10);
  const maxDv = Math.max(...results.map(r => r.dv_vac));
  const maxBarW = W - 140;

  ctx.font = '12px monospace';
  ctx.textAlign = 'right';
  ctx.fillStyle = '#7a9fc0';
  ctx.fillText('ΔV Breakdown (Vacuum)', W - 8, 20);

  results.forEach((r, i) => {
    const y = 40 + i * (barH + 12);
    const barW = (r.dv_vac / (totalDv || 1)) * maxBarW;

    // Background track
    ctx.fillStyle = '#0f1a2a';
    ctx.fillRect(100, y, maxBarW, barH);

    // Bar
    const col = colors[i % colors.length];
    const grd = ctx.createLinearGradient(100, y, 100 + barW, y);
    grd.addColorStop(0, col + 'dd');
    grd.addColorStop(1, col + '88');
    ctx.fillStyle = grd;
    ctx.fillRect(100, y, barW, barH);

    // Label
    ctx.fillStyle = '#aabbcc';
    ctx.font = '11px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(r.stage.name, 94, y + barH * 0.65);

    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.fillText(`${r.dv_vac.toFixed(0)} m/s`, 100 + barW + 6, y + barH * 0.65);
  });

  // Total bar
  const totalY = 40 + results.length * (barH + 12) + 8;
  ctx.fillStyle = '#446680';
  ctx.fillRect(100, totalY, maxBarW, 2);
  ctx.fillStyle = '#00ff88';
  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'right';
  ctx.fillText('Total', 94, totalY + 16);
  ctx.textAlign = 'left';
  ctx.fillText(`${totalDv.toFixed(0)} m/s`, 106, totalY + 16);
}
