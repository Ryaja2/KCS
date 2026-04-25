// Main app controller

// Persist elapsed time across visits via localStorage
let _stored = localStorage.getItem('kcs_met_start');
if (!_stored) {
  _stored = Date.now().toString();
  localStorage.setItem('kcs_met_start', _stored);
}
const MET_START = parseInt(_stored, 10);

function updateClock() {
  const s  = Math.floor((Date.now() - MET_START) / 1000);
  const ss = String(s % 60).padStart(2, '0');
  const mm = String(Math.floor(s / 60) % 60).padStart(2, '0');
  const hh = String(Math.floor(s / 3600) % 6).padStart(2, '0');
  const dd = String(Math.floor(s / 21600)).padStart(2, '0');
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
