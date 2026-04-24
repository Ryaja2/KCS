// Main app controller

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
  // Background starfield
  const starsEl = document.getElementById('stars-canvas');
  if (starsEl) {
    const ctx = starsEl.getContext('2d');
    const resize = () => {
      starsEl.width  = window.innerWidth;
      starsEl.height = window.innerHeight;
      clearCanvas(ctx, starsEl);
      drawStars(ctx, starsEl, 220, 42);
    };
    resize();
    window.addEventListener('resize', resize);
  }

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
      ['con-canvas','trn-canvas','orb-canvas'].forEach(resize3DCanvas);

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

  // Resize 2D canvases (dv + commnet)
  function resize2DCanvases() {
    ['dv-canvas','cn-canvas'].forEach(id => {
      const canvas = document.getElementById(id);
      if (!canvas) return;
      const w = canvas.parentElement.clientWidth;
      if (w > 0 && canvas.width !== w) {
        canvas.width  = w;
        canvas.height = Math.min(Math.round(w * 0.52), 360);
      }
    });
  }

  window.addEventListener('resize', () => {
    resize2DCanvases();
    ['con-canvas','trn-canvas','orb-canvas'].forEach(resize3DCanvas);
    const active = document.querySelector('.ctrl-btn.active');
    if (active) showTab(active.dataset.tab);
  });

  resize2DCanvases();
  showTab('constellation');
});
