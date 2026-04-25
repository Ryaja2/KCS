// Main app controller

(function checkWebGL() {
  try {
    const c = document.createElement('canvas');
    if (window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl'))) return;
  } catch(e) {}
  // No WebGL — show persistent banner
  const banner = document.createElement('div');
  banner.id = 'webgl-warn';
  banner.innerHTML = '&#9888; WebGL not available &mdash; 3D displays disabled. Enable hardware acceleration in browser settings (Settings &rarr; Advanced &rarr; Use hardware acceleration).';
  banner.style.cssText = [
    'position:fixed','top:0','left:0','right:0','z-index:9999',
    'background:linear-gradient(90deg,#1a0500,#0a0000,#1a0500)',
    'border-bottom:1px solid #ff3a1a',
    'color:#ff8060','font-family:\'Orbitron\',monospace','font-size:9px',
    'letter-spacing:2px','padding:7px 20px','text-align:center',
    'text-shadow:0 0 8px rgba(255,58,26,0.6)'
  ].join(';');
  document.addEventListener('DOMContentLoaded', () => document.body.prepend(banner));
})();

const MET_START = Date.now();

function updateClock() {
  const s  = Math.floor((Date.now() - MET_START) / 1000);
  const ss = String(s % 60).padStart(2, '0');
  const mm = String(Math.floor(s / 60) % 60).padStart(2, '0');
  const hh = String(Math.floor(s / 3600) % 6).padStart(2, '0');
  const dd = String(Math.floor(s / 21600)).padStart(3, '0');
  document.getElementById('mission-clock').textContent = `T+ ${dd}:${hh}:${mm}:${ss}`;
}

document.addEventListener('DOMContentLoaded', () => {
  // Mission clock
  updateClock();
  setInterval(updateClock, 1000);

  // Tab navigation
  const navBtns = document.querySelectorAll('.ctrl-btn');
  const tabs    = document.querySelectorAll('.tab-panel');

  function showTab(id) {
    navBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === id));
    tabs.forEach(t => t.classList.toggle('active', t.id === 'tab-' + id));

    // Sync canvas sizes for 3D scenes when tab becomes visible
    requestAnimationFrame(() => {
      ['con-canvas','trn-canvas','orb-canvas','dv-canvas','cn-canvas'].forEach(resize3DCanvas);

      if (id === 'constellation') calcConstellation();
      if (id === 'transfer')      calcTransfer();
      if (id === 'deltav')        calcMissionDv();
      if (id === 'orbit')         calcOrbit();
      if (id === 'commnet')       calcCommNet();
    });
  }

  navBtns.forEach(btn => btn.addEventListener('click', () => showTab(btn.dataset.tab)));

  // Initialize calculators
  initConstellation();
  initTransfer();
  initDeltaV();
  initOrbit();
  initCommNet();

  window.addEventListener('resize', () => {
    ['con-canvas','trn-canvas','orb-canvas','dv-canvas','cn-canvas'].forEach(resize3DCanvas);
    const active = document.querySelector('.ctrl-btn.active');
    if (active) showTab(active.dataset.tab);
  });

  showTab('constellation');
});
